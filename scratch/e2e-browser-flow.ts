/**
 * Browser E2E of the full pay-last workflow, driven through the real UI:
 *   customer QR order (Macchiato + Firfir, pay at cashier)
 *   → waiter confirms → barista readies the drink → kitchen readies the food
 *   → waiter delivers both → cashier takes cash → order COMPLETED.
 *
 * Waits are DB-state-driven (the UI polls every 3-5s, so fixed sleeps race).
 * Screenshots for every step land in scratch/e2e-shots. Test order is cleaned up.
 */
import { chromium, Browser, Page } from "playwright";
import { prisma } from "../src/lib/db/client";
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:3000";
const BRANCH_ID = "cmr3mh2v5000e2ksgbakn16ub";
const TABLE = 5;
const SHOTS = path.join(process.cwd(), "scratch", "e2e-shots");

let failures = 0;
let shotNo = 0;
const consoleErrors: string[] = [];

async function shot(page: Page, label: string) {
  shotNo++;
  await page.screenshot({ path: path.join(SHOTS, `${String(shotNo).padStart(2, "0")}-${label}.png`) });
  console.log(`  📸 ${String(shotNo).padStart(2, "0")}-${label}.png`);
}

function check(label: string, pass: boolean, detail?: string) {
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

// This env pins `connection_limit=1` (see .env / lib/db/client.ts), so the dev
// server, the UIs' polling and this script all queue on ONE connection to a
// remote DB — individual writes can take 10s+. Poll slowly (don't starve the
// pool) and wait generously; these are environment limits, not app latency.
const WAIT_MS = 60_000;
const POLL_MS = 1_000;

/** Poll the DB until the order reaches `expected`, or time out. Returns the actual status. */
async function waitForOrderStatus(orderId: string, expected: string, timeoutMs = WAIT_MS): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let status = "";
  while (Date.now() < deadline) {
    status = (await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } }))?.status ?? "";
    if (status === expected) return status;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return status;
}

/** Poll the DB until a named item reaches `expected`. */
async function waitForItemStatus(orderId: string, itemName: string, expected: string, timeoutMs = WAIT_MS): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let status = "";
  while (Date.now() < deadline) {
    const item = await prisma.orderItem.findFirst({
      where: { orderId, menuItem: { name: itemName } },
      select: { status: true },
    });
    status = item?.status ?? "";
    if (status === expected) return status;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return status;
}

function watchConsole(page: Page, who: string) {
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${who}] ${m.text()}`); });
  page.on("pageerror", (e) => consoleErrors.push(`[${who}] ${e.message}`));
}

async function login(browser: Browser, email: string, who: string) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watchConsole(page, who);
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "1234");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 30000 });
  return page;
}

/** Click a KDS item-action button and wait for the DB to reflect it. */
async function kdsAction(page: Page, row: string, button: string, orderId: string, itemName: string, expected: string) {
  const item = page.locator(`li:has-text("${row}")`);
  const btn = item.getByRole("button", { name: button, exact: true });
  await btn.waitFor({ timeout: 20000 });
  await btn.click();
  const got = await waitForItemStatus(orderId, itemName, expected);
  check(`${itemName}: ${button} → ${expected}`, got === expected, got !== expected ? `got ${got}` : undefined);
}

async function run() {
  fs.rmSync(SHOTS, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  let orderId: string | null = null;

  try {
    // ── 1. Customer places a QR order on a phone-sized screen ──
    console.log("\n1. CUSTOMER — placing QR order at table " + TABLE);
    const custCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const cust = await custCtx.newPage();
    watchConsole(cust, "customer");
    await cust.goto(`${BASE}/qr/${BRANCH_ID}?table=${TABLE}`);
    await cust.getByText("Macchiato", { exact: true }).first().waitFor({ timeout: 60000 });
    await shot(cust, "customer-menu");

    for (const item of ["Macchiato", "Firfir"]) {
      await cust.getByText(item, { exact: true }).first().click();
      await cust.getByText(/Add to Order/i).click();
      await cust.waitForTimeout(500);
    }
    await cust.getByText(/View Cart/i).click();
    await cust.getByText(/Proceed to Payment/i).waitFor({ timeout: 15000 });
    await shot(cust, "customer-cart");

    // The quote the customer sees must equal what the cashier will charge.
    // (Menu prices are VAT-inclusive: 70 + 180 = 250, VAT broken out of it.)
    const cartText = await cust.locator("body").innerText();
    const grand = cartText.match(/Grand Total\s*([\d,.]+)\s*ETB/i)?.[1]?.replace(/,/g, "");
    check("Customer cart quotes the VAT-inclusive total (250 ETB)", grand === "250", `got ${grand}`);

    await cust.getByText(/Proceed to Payment/i).click();

    await cust.getByText(/Pay at Cashier/i).first().waitFor({ timeout: 15000 });
    const payText = await cust.locator("body").innerText();
    const toPay = payText.match(/Total to Pay:?\s*([\d,.]+)\s*ETB/i)?.[1]?.replace(/,/g, "");
    check("Payment screen quotes the same total (250 ETB)", toPay === "250", `got ${toPay}`);
    await shot(cust, "customer-payment-choice");
    await cust.getByText(/Place Order — Pay Later/i).click();
    await cust.waitForSelector("text=/Awaiting|Preparing/i", { timeout: 30000 });

    const order = await prisma.order.findFirst({
      where: { guestTableNumber: TABLE, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!order) throw new Error("Order not created");
    orderId = order.id;
    check("Order created as DRAFT (no prepayment)", order.status === "DRAFT", `got ${order.status}`);
    await shot(cust, "customer-tracker-awaiting");

    // ── 2. Waiter confirms → fires to stations ──
    console.log("\n2. WAITER — confirming QR order");
    const waiter = await login(browser, "waiter@zadcafe.et", "waiter");
    await waiter.goto(`${BASE}/waiter/qr-orders`);
    const confirmBtn = waiter.locator(`div:has-text("Table ${TABLE}")`).getByRole("button", { name: /Confirm/i }).first();
    await confirmBtn.waitFor({ timeout: 30000 });
    await shot(waiter, "waiter-incoming-qr");
    await confirmBtn.click();
    const afterConfirm = await waitForOrderStatus(orderId, "CONFIRMED");
    check("Waiter approval fires to stations (CONFIRMED)", afterConfirm === "CONFIRMED", `got ${afterConfirm}`);

    // ── 3. Barista readies the drink ──
    console.log("\n3. BARISTA — Macchiato accept → start → ready");
    const barista = await login(browser, "barista@zadcafe.et", "barista");
    await barista.goto(`${BASE}/barista/kds`);
    await barista.locator('li:has-text("Macchiato")').waitFor({ timeout: 30000 });
    await shot(barista, "barista-kds-new");
    await kdsAction(barista, "Macchiato", "Accept", orderId, "Macchiato", "ACCEPTED");
    await kdsAction(barista, "Macchiato", "Start", orderId, "Macchiato", "PREPARING");
    await kdsAction(barista, "Macchiato", "Ready", orderId, "Macchiato", "READY");
    await barista.waitForTimeout(3500); // let the board poll so the shot shows the settled state
    await shot(barista, "barista-drink-ready");

    // Drink ready while food still cooking → waiter gets a per-item ping
    const itemReady = await prisma.notification.findFirst({
      where: { type: "item_ready", createdAt: { gte: new Date(Date.now() - 120_000) } },
    });
    check("Waiter notified per-item (drink ready before food)", Boolean(itemReady));

    // ── 4. Kitchen readies the food ──
    console.log("\n4. KITCHEN — Firfir accept → start → plate → ready");
    const kitchen = await login(browser, "kitchen@zadcafe.et", "kitchen");
    await kitchen.goto(`${BASE}/kitchen/kds`);
    await kitchen.locator('li:has-text("Firfir")').waitFor({ timeout: 30000 });
    await shot(kitchen, "kitchen-kds-new");
    await kdsAction(kitchen, "Firfir", "Accept", orderId, "Firfir", "ACCEPTED");
    await kdsAction(kitchen, "Firfir", "Start", orderId, "Firfir", "PREPARING");
    await kdsAction(kitchen, "Firfir", "Plate", orderId, "Firfir", "PLATING");
    await kdsAction(kitchen, "Firfir", "Ready", orderId, "Firfir", "READY");
    await kitchen.waitForTimeout(3500);
    await shot(kitchen, "kitchen-food-ready");

    const allReady = await waitForOrderStatus(orderId, "READY");
    check("Whole order READY", allReady === "READY", `got ${allReady}`);

    // Close the station boards — their 3s polling competes for the single DB
    // connection and slows the remaining steps to the point of client timeouts.
    await barista.context().close();
    await kitchen.context().close();

    // ── 5. Waiter delivers both items ──
    console.log("\n5. WAITER — delivering items");
    await waiter.goto(`${BASE}/waiter/orders`);
    await waiter.locator('li:has-text("Macchiato")').getByRole("button", { name: "Delivered", exact: true })
      .waitFor({ timeout: 30000 });
    await shot(waiter, "waiter-ready-to-deliver");

    for (const name of ["Macchiato", "Firfir"]) {
      const btn = waiter.locator(`li:has-text("${name}")`).getByRole("button", { name: "Delivered", exact: true });
      await btn.waitFor({ timeout: 20000 });
      await btn.click();
      const got = await waitForItemStatus(orderId, name, "DELIVERED");
      check(`${name} delivered`, got === "DELIVERED", got !== "DELIVERED" ? `got ${got}` : undefined);
    }

    const afterDeliver = await waitForOrderStatus(orderId, "BILL_REQUESTED");
    check("All delivered with balance due → cashier bill queue", afterDeliver === "BILL_REQUESTED", `got ${afterDeliver}`);
    await waiter.waitForTimeout(4500);
    await shot(waiter, "waiter-delivered");
    await waiter.context().close();

    // ── 6. Cashier settles the bill in cash ──
    console.log("\n6. CASHIER — taking cash payment");
    const cashier = await login(browser, "cashier@zadcafe.et", "cashier");
    // Pre-compile the payment/receipt routes. Next dev builds a route on its first
    // hit (10-20s against the remote DB) and the app's fetcher aborts at 15s, which
    // would fail this step for a dev-only reason. Invalid payloads compile the
    // module without recording anything.
    await cashier.request.post(`${BASE}/api/cashier/payments`, { data: {} }).catch(() => {});
    await cashier.request.get(`${BASE}/api/cashier/receipts/warmup`).catch(() => {});
    await cashier.goto(`${BASE}/cashier`);
    const queueBtn = cashier.locator(`button:has-text("Table ${TABLE}")`).first();
    await queueBtn.waitFor({ timeout: 30000 });
    await queueBtn.click();
    await cashier.getByRole("button", { name: /Process payment/i }).waitFor({ timeout: 15000 });
    await shot(cashier, "cashier-bill");

    // Peek at the Telebirr panel (real receiving QR / number) before paying in cash
    await cashier.getByRole("button", { name: "TELEBIRR", exact: true }).click();
    await cashier.getByText(/Scan to pay with Telebirr/i).waitFor({ timeout: 10000 });
    await shot(cashier, "cashier-telebirr-panel");
    await cashier.getByRole("button", { name: "CASH", exact: true }).click();

    await cashier.fill('input[placeholder="Amount tendered"]', "300");
    await cashier.getByRole("button", { name: /Process payment/i }).click();
    try {
      await cashier.waitForSelector("text=/Change due/i", { timeout: 20000 });
    } catch {
      await shot(cashier, "cashier-payment-ERROR");
      const body = (await cashier.locator("body").innerText()).replace(/\n{2,}/g, "\n").slice(0, 1500);
      console.log("  --- cashier page text on failure ---\n" + body + "\n  ---");
      throw new Error("Cash payment did not report change due");
    }
    const afterPay = await waitForOrderStatus(orderId, "COMPLETED");
    check("Cash payment completes the order", afterPay === "COMPLETED", `got ${afterPay}`);
    await shot(cashier, "cashier-paid-receipt");

    const final = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, table: true } });
    const paid = final?.payments.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    check("Charged the correct total (250 ETB)", paid === 250, `got ${paid}`);

    const tableRow = final?.tableId ? await prisma.cafeTable.findUnique({ where: { id: final.tableId } }) : null;
    if (tableRow) check("Table freed after completion", tableRow.status === "available", `got ${tableRow.status}`);

    // ── 7. Customer tracker reflects the finished order ──
    console.log("\n7. CUSTOMER — final tracker state");
    await cust.reload();
    await cust.waitForTimeout(4000);
    await shot(cust, "customer-final");

    console.log("\n" + "─".repeat(50));
    if (consoleErrors.length) {
      console.log("Browser console errors:");
      for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.log("  ! " + e);
    } else {
      console.log("No browser console errors.");
    }
    console.log(failures === 0 ? "\n✅ E2E FLOW PASSED — order to served, all checks green" : `\n❌ ${failures} CHECK(S) FAILED`);
  } finally {
    await browser.close();
    if (orderId) {
      await prisma.paymentAttempt.deleteMany({ where: { orderId } });
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.riskFlag.deleteMany({ where: { orderId } });
      await prisma.orderStateLog.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 600_000) } } });
      console.log("Test order cleaned up from live DB.");
    }
  }
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
