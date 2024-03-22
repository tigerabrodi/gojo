import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanUp() {
  // Delete all boards associated with users matching the test pattern
  await prisma.board.deleteMany({
    where: {
      roles: {
        some: {
          user: {
            email: {
              contains: 'test_',
              endsWith: '@example.com',
            },
          },
        },
      },
    },
  })

  // Delete users with email addresses matching the test pattern
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test_',
        endsWith: '@example.com',
      },
    },
  })

  await prisma.$disconnect()
}

export default async function globalTeardown() {
  cleanUp().then(() => {
    console.log('Cleaned up the database.')
  })
}
