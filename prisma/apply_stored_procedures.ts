import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying PostgreSQL stored procedures and functions...");

  const sqlPath = path.resolve(__dirname, "stored_procedures.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`stored_procedures.sql not found at ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  // Split by "CREATE OR REPLACE" to run each procedure/function as a separate command.
  const parts = sql.split(/(?=CREATE\s+OR\s+REPLACE)/i);

  for (let part of parts) {
    part = part.trim();
    if (!part || part.startsWith("--")) {
      continue;
    }
    
    console.log(`Executing statement starting with: ${part.substring(0, 50)}...`);
    await prisma.$executeRawUnsafe(part);
  }

  console.log("PostgreSQL stored procedures and functions successfully applied!");
}

main()
  .catch((e) => {
    console.error("Error applying stored procedures:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
