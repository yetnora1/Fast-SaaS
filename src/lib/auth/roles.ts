import type { Role } from "@prisma/client";

export const ALL_ROLES: Role[] = [
  "saas_owner",
  "cafe_owner",
  "cafe_manager",
  "waiter",
  "cashier",
  "barista",
  "kitchen",
  "store_manager",
];

/** Roles allowed under each route-group prefix (server-enforced RBAC). */
export const ROUTE_ROLE_MAP: Record<string, Role[]> = {
  "/saas-admin": ["saas_owner"],
  "/owner": ["cafe_owner"],
  "/manager": ["cafe_manager", "cafe_owner"],
  "/waiter": ["waiter", "cafe_manager", "cafe_owner"],
  "/cashier": ["cashier", "cafe_manager", "cafe_owner"],
  "/barista": ["barista", "cafe_manager", "cafe_owner"],
  "/kitchen": ["kitchen", "cafe_manager", "cafe_owner"],
  "/store": ["store_manager", "cafe_manager", "cafe_owner"],
};

/** Route groups that require an active (non-gated) subscription. */
export const TENANT_ROUTE_PREFIXES = [
  "/owner",
  "/manager",
  "/waiter",
  "/cashier",
  "/barista",
  "/kitchen",
  "/store",
];

export const ROLE_HOME: Record<Role, string> = {
  saas_owner: "/saas-admin/dashboard",
  cafe_owner: "/owner/dashboard",
  cafe_manager: "/manager/dashboard",
  waiter: "/waiter",
  cashier: "/cashier",
  barista: "/barista/kds",
  kitchen: "/kitchen/kds",
  store_manager: "/store/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  saas_owner: "SaaS Owner",
  cafe_owner: "Cafe Owner",
  cafe_manager: "Cafe Manager",
  waiter: "Waiter",
  cashier: "Cashier",
  barista: "Barista",
  kitchen: "Kitchen",
  store_manager: "Store Manager",
};

export function rolesForPath(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return roles;
  }
  return null;
}

export function isTenantRoute(pathname: string): boolean {
  return TENANT_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
