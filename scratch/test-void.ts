import { prisma } from "../src/lib/db/client";
import bcrypt from "bcryptjs";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, pinHash: true }
  });
  console.log("Users:", users);
}

main().catch(console.error);
