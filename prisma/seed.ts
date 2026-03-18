import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@crazy8s.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin" },
    create: {
      name: "Admin",
      email,
      passwordHash,
      role: "admin",
    },
  });

  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });

  console.log(`Admin user created: ${email}`);
  console.log(`Password: ${password}`);
  console.log("Change these in your .env file before deploying!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
