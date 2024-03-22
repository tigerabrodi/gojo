import fs from 'fs'

import { test as setup } from '@playwright/test'

import {
  createAccount,
  createRandomUser,
  user1Details,
  user1File,
  user2Details,
  user2File,
} from './utils'

setup('authenticate users', async ({ browser }) => {
  console.log('Setting up users')
  const user1 = createRandomUser()
  const user2 = createRandomUser()

  // Create and authenticate user1
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  await createAccount(user1)

  await page1.request.post('/login', {
    form: {
      email: user1.email,
      password: user1.password,
    },
  })

  await context1.storageState({ path: user1File })

  // Create and authenticate user2
  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await createAccount(user2)
  await page2.request.post('/login', {
    form: {
      email: user2.email,
      password: user2.password,
    },
  })
  await context2.storageState({ path: user2File })

  fs.writeFileSync(user1Details, JSON.stringify(user1))
  fs.writeFileSync(user2Details, JSON.stringify(user2))
})
