import { storeAvatar } from "../src/lib/integrations/storage";
import { prisma } from "../src/lib/db/client";

async function main() {
  console.log("Creating dummy file...");
  const dummyFile = new File([Buffer.from("Hello world")], "test_avatar.png", {
    type: "image/png",
  });

  console.log("Storing avatar...");
  const res = await storeAvatar(dummyFile);
  console.log("storeAvatar response:", res);

  const filename = res.url.replace("/uploads/", "");
  console.log(`Checking filename: ${filename} in DB...`);

  const dbFile = await prisma.storedFile.findUnique({
    where: { filename },
  });

  if (dbFile) {
    console.log("✓ File found in database!");
    console.log("  ID:", dbFile.id);
    console.log("  Mime type:", dbFile.mime);
    console.log("  Content length:", dbFile.data.length);
    console.log("  Content matches:", dbFile.data.toString() === "Hello world");

    // Clean up
    await prisma.storedFile.delete({ where: { id: dbFile.id } });
    console.log("✓ Database cleaned up!");
  } else {
    console.error("✗ File NOT found in database!");
  }
}

main().catch(console.error);
