/**
 * Equipment Registry — basic tests for role-guard and filter+search logic.
 *
 * Run with:  npx tsx src/tests/equipment.test.ts
 *
 * These are standalone assertion-based tests (no jest/vitest required).
 * They test the pure logic extracted from the API routes.
 */

/* ── Test harness ──────────────────────────────────────────────────── */

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

/* ── Role guard logic ─────────────────────────────────────────────── */

type Role =
  | "saas_owner"
  | "cafe_owner"
  | "cafe_manager"
  | "waiter"
  | "cashier"
  | "barista"
  | "kitchen"
  | "store_manager";

const EQUIPMENT_ALLOWED_ROLES: Role[] = ["cafe_manager", "cafe_owner"];

function checkRoleAccess(role: Role): "ALLOWED" | "FORBIDDEN" {
  return EQUIPMENT_ALLOWED_ROLES.includes(role) ? "ALLOWED" : "FORBIDDEN";
}

describe("Role Guard — Equipment endpoints", () => {
  // Allowed roles
  assert(checkRoleAccess("cafe_manager") === "ALLOWED", "cafe_manager is ALLOWED");
  assert(checkRoleAccess("cafe_owner") === "ALLOWED", "cafe_owner is ALLOWED");

  // Blocked roles
  assert(checkRoleAccess("waiter") === "FORBIDDEN", "waiter is FORBIDDEN");
  assert(checkRoleAccess("cashier") === "FORBIDDEN", "cashier is FORBIDDEN");
  assert(checkRoleAccess("barista") === "FORBIDDEN", "barista is FORBIDDEN");
  assert(checkRoleAccess("kitchen") === "FORBIDDEN", "kitchen is FORBIDDEN");
  assert(checkRoleAccess("store_manager") === "FORBIDDEN", "store_manager is FORBIDDEN");
  assert(checkRoleAccess("saas_owner") === "FORBIDDEN", "saas_owner is FORBIDDEN");
});

/* ── Filter + search combination logic ────────────────────────────── */

interface MockItem {
  name: string;
  category: string;
  department: string;
  condition: string;
  quantity: number;
  notes: string | null;
  isActive: boolean;
}

const MOCK_DATA: MockItem[] = [
  { name: "Espresso Machine", category: "Kitchen Appliances", department: "BARISTA", condition: "GOOD", quantity: 2, notes: "Main machine, needs descaling monthly", isActive: true },
  { name: "Chef Knife Set", category: "Utensils", department: "KITCHEN", condition: "NEW", quantity: 5, notes: null, isActive: true },
  { name: "Glass Cups (12pk)", category: "Glassware", department: "SHARED", condition: "WORN", quantity: 0, notes: "Some chipped, re-order soon", isActive: true },
  { name: "Coffee Grinder", category: "Brewing Tools", department: "BARISTA", condition: "NEEDS_REPAIR", quantity: 1, notes: "Grinder motor failing", isActive: true },
  { name: "Mop and Bucket", category: "Cleaning Supplies", department: "SHARED", condition: "GOOD", quantity: 0, notes: null, isActive: true },
  { name: "Old Blender", category: "Kitchen Appliances", department: "KITCHEN", condition: "RETIRED", quantity: 0, notes: "Replaced in March", isActive: false },
];

/**
 * Simulates the Prisma where-clause filter logic client-side.
 * AND combination: department + category + condition + quantity + search.
 * Search does OR on name and notes (case-insensitive).
 * Only isActive: true items are returned.
 */
function filterItems(
  items: MockItem[],
  filters: {
    department?: string;
    category?: string;
    condition?: string;
    quantity?: string;
    search?: string;
  },
): MockItem[] {
  return items.filter((item) => {
    if (!item.isActive) return false;
    if (filters.department && item.department !== filters.department) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.condition && item.condition !== filters.condition) return false;
    if (filters.quantity === "in_stock" && item.quantity <= 0) return false;
    if (filters.quantity === "out_of_stock" && item.quantity !== 0) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(s);
      const notesMatch = item.notes?.toLowerCase().includes(s) ?? false;
      if (!nameMatch && !notesMatch) return false;
    }
    return true;
  });
}

describe("Filter Logic — single filters", () => {
  const all = filterItems(MOCK_DATA, {});
  assert(all.length === 5, "No filters → 5 active items (excludes soft-deleted)");

  const barista = filterItems(MOCK_DATA, { department: "BARISTA" });
  assert(barista.length === 2, "Department=BARISTA → 2 items");
  assert(barista.every((i) => i.department === "BARISTA"), "All results are BARISTA dept");

  const glassware = filterItems(MOCK_DATA, { category: "Glassware" });
  assert(glassware.length === 1, "Category=Glassware → 1 item");
  assert(glassware[0].name === "Glass Cups (12pk)", "Correct glassware item");

  const needsRepair = filterItems(MOCK_DATA, { condition: "NEEDS_REPAIR" });
  assert(needsRepair.length === 1, "Condition=NEEDS_REPAIR → 1 item");
  assert(needsRepair[0].name === "Coffee Grinder", "Correct needs-repair item");
});

describe("Filter Logic — search (fuzzy on name + notes)", () => {
  const byName = filterItems(MOCK_DATA, { search: "espresso" });
  assert(byName.length === 1, "Search 'espresso' matches by name → 1 item");

  const byNotes = filterItems(MOCK_DATA, { search: "descaling" });
  assert(byNotes.length === 1, "Search 'descaling' matches by notes → 1 item");

  const byPartial = filterItems(MOCK_DATA, { search: "grind" });
  assert(byPartial.length === 1, "Search 'grind' partial match → 1 item (Coffee Grinder)");

  const noMatch = filterItems(MOCK_DATA, { search: "xyz123" });
  assert(noMatch.length === 0, "Search 'xyz123' → 0 items");
});

describe("Filter Logic — AND combination (filters + search)", () => {
  const baristaGood = filterItems(MOCK_DATA, { department: "BARISTA", condition: "GOOD" });
  assert(baristaGood.length === 1, "Department=BARISTA + Condition=GOOD → 1 item");
  assert(baristaGood[0].name === "Espresso Machine", "Correct combined result");

  const sharedSearch = filterItems(MOCK_DATA, { department: "SHARED", search: "chipped" });
  assert(sharedSearch.length === 1, "Department=SHARED + search 'chipped' → 1 item");

  const kitchenNew = filterItems(MOCK_DATA, { department: "KITCHEN", condition: "NEW" });
  assert(kitchenNew.length === 1, "Department=KITCHEN + Condition=NEW → 1 item");

  const emptyCombo = filterItems(MOCK_DATA, { department: "BARISTA", category: "Glassware" });
  assert(emptyCombo.length === 0, "BARISTA + Glassware → 0 (no overlap)");
});

describe("Filter Logic — soft-delete exclusion", () => {
  const retired = filterItems(MOCK_DATA, { condition: "RETIRED" });
  assert(retired.length === 0, "RETIRED condition filter still excludes soft-deleted (isActive=false)");

  const kitchen = filterItems(MOCK_DATA, { department: "KITCHEN" });
  assert(kitchen.length === 1, "Kitchen dept → only 1 active item (Old Blender excluded)");
});

describe("Filter Logic — quantity filters", () => {
  const inStock = filterItems(MOCK_DATA, { quantity: "in_stock" });
  assert(inStock.length === 3, "quantity=in_stock → 3 items (> 0)");
  assert(inStock.every(i => i.quantity > 0), "All results have quantity > 0");

  const outOfStock = filterItems(MOCK_DATA, { quantity: "out_of_stock" });
  assert(outOfStock.length === 2, "quantity=out_of_stock → 2 items (= 0)");
  assert(outOfStock.every(i => i.quantity === 0), "All results have quantity = 0");

  const sharedOutOfStock = filterItems(MOCK_DATA, { department: "SHARED", quantity: "out_of_stock" });
  assert(sharedOutOfStock.length === 2, "SHARED + out_of_stock → 2 items");

  const baristaInStock = filterItems(MOCK_DATA, { department: "BARISTA", quantity: "in_stock" });
  assert(baristaInStock.length === 2, "BARISTA + in_stock → 2 items");
});

/* ── Summary ──────────────────────────────────────────────────────── */

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\n❌ Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All tests passed!");
}
