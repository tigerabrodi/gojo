import fs from 'fs'

import { expect, test } from '@playwright/test'

import {
  createRandomBoard,
  user1Details,
  user1File,
  user2Details,
  user2File,
} from './utils'

import { prisma } from '~/db'
import { liveblocks } from '~/helpers'

type User = {
  email: string
  password: string
  name: string
}

test('Board collaboration complete simple flow', async ({ browser }) => {
  const board = createRandomBoard()

  // Load storage states for both users
  const user1Context = await browser.newContext({
    storageState: user1File,
  })
  const user2Context = await browser.newContext({
    storageState: user2File,
  })

  const user1Page = await user1Context.newPage()
  const user2Page = await user2Context.newPage()

  user1Page.on('console', (msg) => console.log(msg.text()))
  user2Page.on('console', (msg) => console.log(msg.text()))

  await user1Page.goto('/boards')
  await user2Page.goto('/boards')

  await user1Page.getByRole('heading', { name: 'Boards' }).isVisible()

  // Read user details from JSON files
  const user1 = JSON.parse(fs.readFileSync(user1Details, 'utf8')) as User
  const user2 = JSON.parse(fs.readFileSync(user2Details, 'utf8')) as User

  // User 1 creates a board
  await user1Page.getByRole('button', { name: 'Create board' }).click()

  await user1Page
    .getByRole('heading', {
      name: 'Board name: Untitled board',
    })
    .waitFor()

  // User 1 creates card
  await user1Page.dblclick('main')
  await user1Page
    .getByRole('button', { name: '1st card', exact: true })
    .isVisible()
  await user1Page
    .getByRole('textbox', { name: 'content of 1st card', exact: true })
    .isVisible()

  const initialCardContent = await user1Page
    .getByRole('textbox', { name: 'content of 1st card', exact: true })
    .innerText()
  expect(initialCardContent).toBe('')

  // Make sure card is focused on creation
  const isFocused = await user1Page
    .getByRole('textbox', { name: 'content of 1st card', exact: true })
    .evaluate((el) => {
      return document.activeElement === el
    })

  expect(isFocused).toBe(true)

  // Type to update card
  // Using `keyboard.type` instead of `fill` because `fill` doesn't work with contenteditable elements
  await user1Page.keyboard.type(board.cards.firstCardContent)

  // Make sure card content is updated
  const finalFirstCardContent = await user1Page
    .getByRole('textbox', { name: 'content of 1st card', exact: true })
    .innerText()
  expect(finalFirstCardContent).toBe(board.cards.firstCardContent)

  // Share board with user 2
  await user1Page.getByRole('link', { name: 'Share' }).click()
  const shareDialog = user1Page.getByRole('dialog', {
    name: 'Share this board',
  })

  await shareDialog.getByText('Add members to your board.').isVisible()

  await shareDialog.getByLabel('Email').fill(user2.email)
  await shareDialog.getByRole('button', { name: 'add' }).click()
  expect(shareDialog.getByLabel('Email')).toHaveValue('')

  await shareDialog
    .getByRole('heading', { name: 'People with access' })
    .isVisible()
  await shareDialog.getByRole('heading', { name: user1.name }).isVisible()
  await shareDialog.getByRole('heading', { name: user2.name }).isVisible()
  await shareDialog.getByText(user1.email).isVisible()
  await shareDialog.getByText(user2.email).isVisible()
  await shareDialog.getByText('Owner').isVisible()
  await shareDialog.getByText('Editor', { exact: true }).isVisible()

  await user1Page.getByRole('button', { name: 'close', exact: true }).click()

  await shareDialog.getByRole('link', { name: 'Close dialog' }).click()

  // Update board name
  await user1Page.getByLabel('Enter name of board').clear()

  // Using `keyboard.type` instead of `fill` because `fill` doesn't trigger
  // the debounced update
  await user1Page.keyboard.type(board.name)

  // Debounce update to the actual DB
  // If multiple in the same room
  // They see the name from liveblocks
  // But on /boards, they see the name from the DB
  // Wait, then move to user 2
  await user1Page.waitForTimeout(500)

  await user2Page.reload()
  await user2Page.getByRole('link', { name: board.name }).click()
  await user2Page
    .getByRole('button', { name: '1st card', exact: true })
    .isVisible()
  await user2Page
    .getByRole('textbox', { name: 'content of 1st card', exact: true })
    .isVisible()

  // Get initial position of the card for User 1
  const firstCardForUser1Page = user1Page.getByRole('button', {
    name: '1st card',
    exact: true,
  })
  const initialCardUser1Position = await firstCardForUser1Page.boundingBox()

  if (!initialCardUser1Position) {
    throw new Error('Card not found')
  }

  // Perform the drag-and-drop operation with User 2
  const firstCardForUser2Page = user2Page.getByRole('button', {
    name: '1st card',
    exact: true,
  })

  // Drag the card a bit to the right and down for User 2
  await firstCardForUser2Page.hover()
  await user2Page.mouse.down()

  const initialCardUser2Position = await firstCardForUser2Page.boundingBox()
  if (!initialCardUser2Position) {
    throw new Error('Card not found')
  }

  await user2Page.mouse.move(
    initialCardUser2Position.x + 250,
    initialCardUser2Position.y + 250
  )

  await user2Page.mouse.up()

  // New positions
  const newCardUser2Position = await firstCardForUser2Page.boundingBox()
  if (!newCardUser2Position) {
    throw new Error('Card not found')
  }

  const newCardUser1Position = await firstCardForUser1Page.boundingBox()
  if (!newCardUser1Position) {
    throw new Error('Card not found')
  }

  // Assert that the card's position has changed for User 1
  expect(newCardUser1Position.x).toBeGreaterThan(initialCardUser1Position.x)
  expect(newCardUser1Position.y).toBeGreaterThan(initialCardUser1Position.y)

  // Assert that the card's position for User 1 and User 2 are the same after the drag operation
  expect(newCardUser1Position.x).toBe(newCardUser2Position.x)
  expect(newCardUser1Position.y).toBe(newCardUser2Position.y)

  // User 2 deletes the card
  await user1Page
    .getByRole('button', { name: '1st card', exact: true })
    .isVisible()
  await user2Page.getByRole('button', { name: '1st card', exact: true }).click()
  await user2Page
    .getByRole('button', { name: 'delete 1st card', exact: true })
    .click()

  // Card should be deleted for both users
  await expect(
    user1Page.getByRole('button', { name: '1st card', exact: true })
  ).toHaveCount(0)
  await expect(
    user2Page.getByRole('button', { name: '1st card', exact: true })
  ).toHaveCount(0)

  // Owner deletes board
  await user1Page.getByRole('link', { name: 'Delete board' }).click()
  await user1Page.getByRole('button', { name: 'Delete' }).click()

  // Both users redirected to /boards
  await user1Page.waitForURL('/boards')
  await user2Page.waitForURL('/boards')

  // Board should not be visible for both users
  await expect(user1Page.getByRole('link', { name: board.name })).toHaveCount(0)
  await expect(user2Page.getByRole('link', { name: board.name })).toHaveCount(0)

  // Cleanup
  await user1Context.close()
  await user2Context.close()
})

test.afterEach(async () => {
  // All boards created by test users
  const boardsToDelete = await prisma.board.findMany({
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

  const deleteRoomPromises = []

  // First delete from liveblocks
  for (const board of boardsToDelete) {
    deleteRoomPromises.push(liveblocks.deleteRoom(board.id))
  }

  await Promise.all(deleteRoomPromises)

  // Now delete from database
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
})
