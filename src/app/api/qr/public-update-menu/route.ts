import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Running dynamic Amharic translation updates...");

    // Update ሻይ በ ክኩባያ -> ሻይ በ ኩባያ
    const res1 = await prisma.menuItem.updateMany({
      where: { nameAm: "ሻይ በ ክኩባያ" },
      data: { nameAm: "ሻይ በ ኩባያ" }
    });

    console.log("Update completed:", { res1 });
    return NextResponse.json({
      success: true,
      message: "Amharic menu item translations updated successfully",
      updatedTeaCupCount: res1.count
    });
  } catch (error) {
    console.error("Failed to run dynamic updates:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
