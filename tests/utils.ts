import crypto from 'crypto'

import { faker } from '@faker-js/faker'

import { prisma } from '~/db'

export function createRandomUser() {
  const username = faker.internet.userName()
  return {
    email: `test_${username}@example.com`,
    password: faker.internet.password(),
    name: username,
  }
}

export function createRandomBoard() {
  return {
    name: faker.lorem.words(3),
    cards: {
      firstCardContent: faker.lorem.words(2),
      secondCardContent: faker.lorem.words(2),
      thirdCardContent: faker.lorem.words(2),
      fourthCardContent: faker.lorem.words(2),
      fifthCardContent: faker.lorem.words(2),
      sixthCardContent: faker.lorem.words(2),
      seventhCardContent: faker.lorem.words(2),
      eighthCardContent: faker.lorem.words(2),
    },
  }
}

export async function createAccount({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name: string
}) {
  let salt = crypto.randomBytes(16).toString('hex')
  let hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha256')
    .toString('hex')

  return prisma.user.create({
    data: {
      email,
      name,
      Password: {
        create: {
          hash,
          salt,
        },
      },
    },
  })
}

export const user1File = 'playwright/.auth/user1.json'
export const user2File = 'playwright/.auth/user2.json'
export const user1Details = 'playwright/.auth/user1-details.json'
export const user2Details = 'playwright/.auth/user2-details.json'
