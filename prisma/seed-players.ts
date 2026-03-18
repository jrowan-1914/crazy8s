import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { v4 as uuid } from "uuid";

const adapter = new PrismaPg({
  connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const teams = await prisma.team.findMany();
  if (teams.length < 8) {
    console.error("Not enough teams. Found:", teams.length);
    process.exit(1);
  }

  const players = [
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
    { name: "Charlie", email: "charlie@example.com" },
    { name: "Diana", email: "diana@example.com" },
    { name: "Eddie", email: "eddie@example.com" },
  ];

  for (const p of players) {
    const player = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name,
        email: p.email,
        role: "player",
        accessToken: uuid(),
      },
    });

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 8);

    await prisma.pick.deleteMany({ where: { userId: player.id } });

    for (const team of picked) {
      await prisma.pick.create({
        data: { userId: player.id, teamId: team.id },
      });
    }

    await prisma.user.update({
      where: { id: player.id },
      data: { picksSubmitted: true },
    });

    console.log(`${p.name}: ${picked.map((t) => `(${t.seed}) ${t.name}`).join(", ")}`);
  }

  console.log("\nDone! 5 players created with random picks.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
