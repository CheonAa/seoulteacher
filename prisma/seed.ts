import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('password123', 10)

    const owner = await prisma.user.upsert({
        where: { email: 'owner@test.com' },
        update: {},
        create: {
            email: 'owner@test.com',
            name: '대표자',
            password,
            role: 'OWNER',
        }
    })

    const admin = await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
            email: 'admin@test.com',
            name: '관리자',
            password,
            role: 'ADMIN',
        }
    })

    const instructor1 = await prisma.user.upsert({
        where: { email: 'inst1@test.com' },
        update: {},
        create: {
            email: 'inst1@test.com',
            name: '김강사',
            password,
            role: 'INSTRUCTOR',
            instructorProfile: {
                create: {
                    baseRate: 0.65,
                    insuranceFee: 2700000,
                    bankAccountVND: 'VND 123-456',
                    bankAccountKRW: 'KRW 123-456'
                }
            }
        }
    })

    const student1 = await prisma.student.create({
        data: {
            name: '홍길동',
            gender: 'M',
            school: 'UNIS',
            grade: '10'
        }
    })

    await prisma.enrollment.create({
        data: {
            studentId: student1.id,
            instructorId: instructor1.id,
            subjectName: '인터수학',
            feePerSession: 1562500, // 12,500,000 / 8
            targetSessionsMonth: 8
        }
    })

    console.log({ owner, admin, instructor1, student1 })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
