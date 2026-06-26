import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Starting production menu import...");

    // Find the tenant associated with the branch ID
    const branchId = "cmqt8awse000ez5eujz2q239u";
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      throw new Error(`Production branch with ID ${branchId} not found`);
    }

    const tenantId = branch.tenantId;
    console.log(`Resolved tenant ID: ${tenantId}`);

    // Load menu data
    const jsonPath = path.join(process.cwd(), "src", "local-menu-data.json");
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at ${jsonPath}`);
    }

    const categoriesData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    console.log(`Loaded ${categoriesData.length} categories from local-menu-data.json`);

    for (const catData of categoriesData) {
      console.log(`Processing category: ${catData.name}`);

      // 1. Find or create Category
      let category = await prisma.menuCategory.findFirst({
        where: { tenantId, name: catData.name }
      });

      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            tenantId,
            name: catData.name,
            nameAm: catData.nameAm,
            sortOrder: catData.sortOrder,
            active: catData.active
          }
        });
        console.log(`-> Created new category: ${catData.name}`);
      } else {
        category = await prisma.menuCategory.update({
          where: { id: category.id },
          data: {
            nameAm: catData.nameAm,
            sortOrder: catData.sortOrder,
            active: catData.active
          }
        });
        console.log(`-> Updated existing category: ${catData.name}`);
      }

      // 2. Process Items
      for (const itemData of catData.items) {
        let item = await prisma.menuItem.findFirst({
          where: { categoryId: category.id, name: itemData.name }
        });

        if (!item) {
          item = await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              name: itemData.name,
              nameAm: itemData.nameAm,
              description: itemData.description,
              price: itemData.price,
              cost: itemData.cost,
              vatApplicable: itemData.vatApplicable,
              available: itemData.available,
              featured: itemData.featured,
              course: itemData.course,
              station: itemData.station,
              imageUrl: itemData.imageUrl,
              prepTargetSec: itemData.prepTargetSec,
              state: itemData.state,
              availableFrom: itemData.availableFrom,
              availableTo: itemData.availableTo
            }
          });
          console.log(`   + Created new item: ${itemData.name} (${itemData.price} ETB)`);
        } else {
          item = await prisma.menuItem.update({
            where: { id: item.id },
            data: {
              nameAm: itemData.nameAm,
              description: itemData.description,
              price: itemData.price,
              cost: itemData.cost,
              vatApplicable: itemData.vatApplicable,
              available: itemData.available,
              featured: itemData.featured,
              course: itemData.course,
              station: itemData.station,
              imageUrl: itemData.imageUrl,
              prepTargetSec: itemData.prepTargetSec,
              state: itemData.state,
              availableFrom: itemData.availableFrom,
              availableTo: itemData.availableTo
            }
          });
          console.log(`   ~ Updated existing item: ${itemData.name} (${itemData.price} ETB)`);
        }

        // 3. Process Modifiers
        for (const modData of itemData.modifiers) {
          let modifier = await prisma.modifier.findFirst({
            where: {
              itemId: item.id,
              groupName: modData.groupName,
              option: modData.option
            }
          });

          if (!modifier) {
            await prisma.modifier.create({
              data: {
                itemId: item.id,
                groupName: modData.groupName,
                option: modData.option,
                extraPrice: modData.extraPrice
              }
            });
            console.log(`     * Created modifier: ${modData.groupName} - ${modData.option} (+${modData.extraPrice})`);
          } else {
            await prisma.modifier.update({
              where: { id: modifier.id },
              data: {
                extraPrice: modData.extraPrice
              }
            });
          }
        }
      }
    }

    console.log("Production menu import complete!");
  } catch (error) {
    console.error("Failed to seed production menu:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
