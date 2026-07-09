import { prisma } from "../src/lib/db/client";

async function main() {
  const connections: any = await prisma.$queryRaw`
    SELECT pid, usename, client_addr, state, query 
    FROM pg_stat_activity
  `;

  console.log(`Total active connections: ${connections.length}`);
  console.log("Details:");
  console.log(JSON.stringify(connections, null, 2));
}

main().catch(console.error);
