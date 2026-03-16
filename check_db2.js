const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { name: { contains: '강' } },
    include: { enrollments: true }
  });
  const jiwoo = await prisma.student.findMany({
    where: { name: { contains: '지우' } },
    include: { enrollments: true }
  });
  fs.writeFileSync('db_out.json', JSON.stringify({kang: students, jiwoo}, null, 2));
}

main();
