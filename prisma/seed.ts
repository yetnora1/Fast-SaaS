/**
 * CafeFlow seed — creates a SaaS owner, one demo tenant (ZAD Cafe) with a full
 * staff roster (one user per role), a branch with tables, a published menu,
 * suppliers and inventory. Safe to re-run (idempotent on emails/keys).
 *
 *   npm run db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const PW = "1234"; // demo password for all seeded accounts
const PIN = "1234"; // demo POS PIN

async function upsertUser(opts: {
  email: string;
  name: string;
  role: Role;
  tenantId?: string | null;
  branchId?: string | null;
  password?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password ?? PW, 10);
  const pinHash = await bcrypt.hash(PIN, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { 
      role: opts.role, 
      tenantId: opts.tenantId ?? null, 
      branchId: opts.branchId ?? null,
      passwordHash,
    },
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      tenantId: opts.tenantId ?? null,
      branchId: opts.branchId ?? null,
      passwordHash,
      pinHash,
      emailVerified: new Date(),
      active: true,
    },
  });
}

async function main() {
  console.log("Seeding CafeFlow (MySQL)…");

  // ── Platform config ────────────────────────────────────────────────
  const cfg: Record<string, string> = {
    bank_name: process.env.SAAS_BANK_NAME ?? "Commercial Bank of Ethiopia",
    account_number: process.env.SAAS_ACCOUNT_NUMBER ?? "1000123456789",
    account_name: process.env.SAAS_ACCOUNT_NAME ?? "CafeFlow Technologies",
    vat_rate: process.env.VAT_RATE ?? "0.15",
    subscription_amount: process.env.SAAS_SUBSCRIPTION_AMOUNT ?? "30000",
    global_announcement: "",
  };
  for (const [key, value] of Object.entries(cfg)) {
    await prisma.platformConfig.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // ── SaaS owner (platform-level, no tenant) ─────────────────────────
  await upsertUser({
    email: "fast.saas.cafe@gmail.com",
    name: "Platform Admin",
    role: "saas_owner",
    tenantId: null,
    password: "1234",
  });

  // ── Demo tenant ────────────────────────────────────────────────────
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  let tenant = await prisma.tenant.findFirst({ where: { name: "ZAD Cafe" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "ZAD Cafe",
        status: "active",
        trialEnd,
        address: "Bole, Addis Ababa",
        phone: "+251911000000",
        branchCount: 1,
      },
    });
  }

  // Feature flags
  for (const key of ["feature_kds", "feature_qr_order", "feature_multi_branch", "feature_amharic", "feature_offline"]) {
    await prisma.tenantFeature.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { enabled: true },
      create: { tenantId: tenant.id, key, enabled: true },
    });
  }

  // ── Branch + tables ────────────────────────────────────────────────
  let branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { tenantId: tenant.id, name: "Main Branch", address: "Bole, Addis Ababa", phone: "+251911000000" },
    });
  }
  for (let n = 1; n <= 8; n++) {
    await prisma.cafeTable.upsert({
      where: { branchId_number: { branchId: branch.id, number: n } },
      update: {},
      create: {
        branchId: branch.id,
        number: n,
        capacity: 4,
        xPos: ((n - 1) % 4) * 120 + 40,
        yPos: Math.floor((n - 1) / 4) * 120 + 40,
      },
    });
  }

  // ── Staff: one per role ────────────────────────────────────────────
  const owner = await upsertUser({ email: "owner@zadcafe.et", name: "Abrham Minbale", role: "cafe_owner", tenantId: tenant.id, branchId: branch.id });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: owner.id } });

  const manager = await upsertUser({ email: "manager@zadcafe.et", name: "Sara Tesfaye", role: "cafe_manager", tenantId: tenant.id, branchId: branch.id });
  await prisma.branch.update({ where: { id: branch.id }, data: { managerId: manager.id } });
  await upsertUser({ email: "waiter@zadcafe.et", name: "Dawit Bekele", role: "waiter", tenantId: tenant.id, branchId: branch.id });
  await upsertUser({ email: "cashier@zadcafe.et", name: "Helen Girma", role: "cashier", tenantId: tenant.id, branchId: branch.id });
  await upsertUser({ email: "barista@zadcafe.et", name: "Yonas Alemu", role: "barista", tenantId: tenant.id, branchId: branch.id });
  await upsertUser({ email: "kitchen@zadcafe.et", name: "Meron Haile", role: "kitchen", tenantId: tenant.id, branchId: branch.id });
  await upsertUser({ email: "store@zadcafe.et", name: "Kebede Worku", role: "store_manager", tenantId: tenant.id, branchId: branch.id });

  // ── Menu ───────────────────────────────────────────────────────────
  // Clean existing menu to ensure clean and complete seeding of all items
  await prisma.menuCategory.deleteMany({ where: { tenantId: tenant.id } });

  const menuDataPath = path.resolve("src/local-menu-data.json");
  if (fs.existsSync(menuDataPath)) {
    const menuData = JSON.parse(fs.readFileSync(menuDataPath, "utf-8"));
    for (const cat of menuData) {
      const category = await prisma.menuCategory.create({
        data: {
          tenantId: tenant.id,
          name: cat.name,
          nameAm: cat.nameAm,
          sortOrder: cat.sortOrder,
          active: cat.active,
        },
      });

      for (const item of cat.items) {
        const menuItem = await prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name: item.name,
            nameAm: item.nameAm,
            description: item.description,
            price: item.price,
            cost: item.cost,
            vatApplicable: item.vatApplicable,
            available: item.available,
            featured: item.featured,
            course: item.course,
            station: item.station,
            imageUrl: item.imageUrl,
            prepTargetSec: item.prepTargetSec,
            state: item.state,
            availableFrom: item.availableFrom,
            availableTo: item.availableTo,
          },
        });

        if (item.modifiers && item.modifiers.length > 0) {
          await prisma.modifier.createMany({
            data: item.modifiers.map((m: any) => ({
              itemId: menuItem.id,
              groupName: m.groupName,
              option: m.option,
              extraPrice: m.extraPrice,
            })),
          });
        }
      }
    }
    console.log(`Successfully seeded ${menuData.length} menu categories from local-menu-data.json`);
  } else {
    console.warn("local-menu-data.json not found, skipping menu seed.");
  }

  // ── Suppliers + inventory ──────────────────────────────────────────
  let supplier = await prisma.supplier.findFirst({ where: { tenantId: tenant.id } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { tenantId: tenant.id, name: "Addis Coffee Suppliers", contact: "Tigist", phone: "+251922000000", email: "sales@addiscoffee.et", paymentTerms: "Net 15" },
    });
  }
  const invCount = await prisma.inventoryItem.count({ where: { tenantId: tenant.id } });
  if (invCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { tenantId: tenant.id, branchId: branch.id, name: "Coffee Beans", unit: "kg", quantity: "12.000", minThreshold: "5.000", costPerUnit: "850.00", supplierId: supplier.id },
        { tenantId: tenant.id, branchId: branch.id, name: "Milk", unit: "L", quantity: "3.000", minThreshold: "10.000", costPerUnit: "90.00", supplierId: supplier.id },
        { tenantId: tenant.id, branchId: branch.id, name: "Sugar", unit: "kg", quantity: "20.000", minThreshold: "8.000", costPerUnit: "60.00", supplierId: supplier.id },
        { tenantId: tenant.id, branchId: branch.id, name: "Bread", unit: "loaf", quantity: "6.000", minThreshold: "10.000", costPerUnit: "40.00", supplierId: supplier.id },
      ],
    });
  }

  console.log("\nSeed complete. Demo accounts (password for all: %s, PIN: %s):", PW, PIN);
  console.table([
    { role: "SaaS Owner", email: "fast.saas.cafe@gmail.com" },
    { role: "Cafe Owner", email: "owner@zadcafe.et" },
    { role: "Manager", email: "manager@zadcafe.et" },
    { role: "Waiter", email: "waiter@zadcafe.et" },
    { role: "Cashier", email: "cashier@zadcafe.et" },
    { role: "Barista", email: "barista@zadcafe.et" },
    { role: "Kitchen", email: "kitchen@zadcafe.et" },
    { role: "Store Manager", email: "store@zadcafe.et" },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
