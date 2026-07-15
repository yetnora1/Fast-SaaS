import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/client";
import { voidOrder } from "../src/lib/services/orders";

const schema = z.object({ pin: z.string().length(4), reason: z.string().min(2) });

async function run() {
  const pin = "1234";
  const reason = "ok";
  const body = schema.parse({ pin, reason });
  console.log("Parsed body successfully:", body);

  const managerEmail = "manager@zadcafe.et";
  const manager = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!manager) {
    console.error("Manager user not found");
    return;
  }

  const isPinValid = await bcrypt.compare(pin, manager.pinHash || "");
  console.log("Is PIN valid:", isPinValid);
  
  const orderId = "cmrdf8p8t001014iee2ezr8hi";
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  console.log("Order exists:", !!order, order);
  
  if (order) {
    try {
      await voidOrder(orderId, reason, manager.id);
      console.log("Voided order successfully");
    } catch (e) {
      console.error("Failed to void order", e);
    }
  }
}

run().catch(console.error);
