import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("testpass", 10);
  await prisma.user.createMany({
    data: [
      { name: "alice", password: passwordHash, displayName: "Alice Creator", tags: ["music", "art"] },
      { name: "bob", password: passwordHash, displayName: "Bob Maker", tags: ["video", "tech"] },
      { name: "carol", password: passwordHash, displayName: "Carol Streamer", tags: ["gaming", "live"] }
    ]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });