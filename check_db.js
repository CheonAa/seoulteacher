const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { name: { contains: '강산' } },
    include: { enrollments: true }
  });
  console.log(JSON.stringify(students, null, 2));

  const jiwoo = await prisma.student.findMany({
    where: { name: { contains: '지우' } },
    include: { enrollments: true }
  });
  console.log(JSON.stringify(jiwoo, null, 2));
}

main();
