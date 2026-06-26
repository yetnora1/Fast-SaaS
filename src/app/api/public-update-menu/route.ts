import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Running dynamic Amharic translation updates...");

    // Update የሻይ ኩባያ -> ሻይ በ ክኩባያ
    const res1 = await prisma.menuItem.updateMany({
      where: { nameAm: "የሻይ ኩባያ" },
      data: { nameAm: "ሻይ በ ክኩባያ" }
    });

    // Update የጁስ ኩባያ -> ጁስ በ ኩባያ
    const res2 = await prisma.menuItem.updateMany({
      where: { nameAm: "የጁስ ኩባያ" },
      data: { nameAm: "ጁስ በ ኩባያ" }
    });

    console.log("Update completed:", { res1, res2 });
    return NextResponse.json({
      success: true,
      message: "Amharic menu item translations updated successfully",
      updatedTeaCupCount: res1.count,
      updatedJuiceCupCount: res2.count
    });
  } catch (error) {
    console.error("Failed to run dynamic updates:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
