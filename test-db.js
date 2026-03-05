const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking systemSettings table...");
        const settings = await prisma.systemSettings.findMany();
        console.log("Current settings count:", settings.length);

        console.log("Testing upsert...");
        await prisma.systemSettings.upsert({
            where: { key: 'TEST' },
            update: { value: '1' },
            create: { key: 'TEST', value: '1' }
        });
        console.log("Upsert successful!");
    } catch (e) {
        console.error("Error occurred:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
