import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { addItemsToOrder } from "@/lib/services/orders";

const schema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        modifiers: z.array(z.object({ groupName: z.string(), option: z.string(), extraPrice: z.number().optional() })).optional(),
        notes: z.string().optional(),
        allergyNote: z.string().optional(),
      }),
    )
    .min(1),
});

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  await addItemsToOrder(params.id, body.items);
  return ok({ added: body.items.length });
});
