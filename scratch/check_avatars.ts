import { prisma } from "../src/lib/db/client";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

async function main() {
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  console.log("Users with avatars in DB:");
  console.log(JSON.stringify(users, null, 2));

  for (const u of users) {
    if (u.avatarUrl && u.avatarUrl.startsWith("/uploads/")) {
      const filename = u.avatarUrl.replace("/uploads/", "");
      console.log(`\nChecking file: ${filename} for user ${u.name}`);

      const searchPaths = [
        path.resolve("public/uploads/avatars", filename),
        path.resolve("public/uploads/menu", filename),
        path.join(os.tmpdir(), "uploads/avatars", filename),
      ];

      for (const p of searchPaths) {
        try {
          await fs.access(p);
          console.log(`  [FOUND] on disk: ${p}`);
        } catch {
          console.log(`  [NOT FOUND]: ${p}`);
        }
      }
    }
  }
}

main().catch(console.error);
