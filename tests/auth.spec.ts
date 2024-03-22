import { test } from '@playwright/test'

import { createRandomUser } from './utils'

test('Register and Login', async ({ page }) => {
  await page.goto('/')

  // Land on login
  await page.getByRole('heading', { name: 'Gojo' }).isVisible()
  await page
    .getByText('Collaborate on ideas by brainstorming together.')
    .isVisible()
  await page.getByRole('heading', { name: 'Login' }).isVisible()

  // Go to register
  await page.getByRole('link', { name: 'Register' }).click()
  await page.waitForURL('/register')

  const user1 = createRandomUser()
  const user2 = createRandomUser()

  // Create first user
  await page.getByLabel('Name').fill(user1.name)
  await page.getByLabel('Email').fill(user1.email)
  await page.getByLabel('Password', { exact: true }).fill(user1.password)
  await page.getByLabel('Confirm Password').fill(user1.password)
  await page.getByRole('button', { name: 'Register' }).click()

  // Get Logged in
  await page.waitForURL('/boards')
  await page.getByRole('heading', { name: 'Boards' }).isVisible()

  // Logout and go to register
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('/login')
  await page.getByRole('link', { name: 'Register' }).click()
  await page.waitForURL('/register')

  // Try to register with the same email as first user
  await page.getByLabel('Name').fill(user2.name)
  await page.getByLabel('Email').fill(user1.email)
  await page.getByLabel('Password', { exact: true }).fill(user2.password)
  await page.getByLabel('Confirm Password').fill(user2.password)

  // Show error email already exists
  await page.getByText('User with this email already exists.').isVisible()

  // Properly register second user
  await page.getByLabel('Email').clear()
  await page.getByLabel('Email').fill(user2.email)
  await page.getByRole('button', { name: 'Register' }).click()
  await page.waitForURL('/boards')

  await page.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('/login')
  await page.getByRole('link', { name: 'Login' }).click()
  await page.waitForURL('/login')

  await page.getByLabel('Email').fill(user1.email)
  await page.getByLabel('Password', { exact: true }).fill(user2.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.getByText('Invalid email or password.').isVisible()

  await page.getByLabel('Password', { exact: true }).clear()
  await page.getByLabel('Password', { exact: true }).fill(user1.password)

  await page.getByRole('button', { name: 'Login' }).click()

  await page.waitForURL('/boards')
  await page.getByRole('heading', { name: 'Boards' }).isVisible()
})
