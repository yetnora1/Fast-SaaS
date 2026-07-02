import { prisma } from "@/lib/db/client";
import menuData from "@/local-menu-data.json";

/**
 * Seed a ready-to-use starter menu for a freshly registered tenant so their QR
 * page is never empty on day one. Items land PUBLISHED and available; owners
 * edit or delete them in the Menu Manager. No-op if the tenant already has
 * categories (safe to call twice).
 */
export async function seedStarterMenu(tenantId: string): Promise<void> {
  const existing = await prisma.menuCategory.count({ where: { tenantId } });
  if (existing > 0) return;

  for (const cat of menuData as any[]) {
    const category = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: cat.name,
        nameAm: cat.nameAm,
        sortOrder: cat.sortOrder,
        active: cat.active ?? true,
      },
    });
    for (const item of cat.items ?? []) {
      const menuItem = await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          nameAm: item.nameAm,
          description: item.description,
          price: item.price,
          cost: item.cost,
          vatApplicable: item.vatApplicable ?? true,
          available: item.available ?? true,
          featured: item.featured ?? false,
          course: item.course,
          station: item.station,
          imageUrl: item.imageUrl,
          prepTargetSec: item.prepTargetSec ?? 300,
          state: "PUBLISHED",
          availableFrom: item.availableFrom,
          availableTo: item.availableTo,
        },
      });
      if (item.modifiers?.length) {
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
}
