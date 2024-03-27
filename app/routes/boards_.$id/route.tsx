import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from '@vercel/remix'
import type { CardType } from '~/helpers'

import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { LiveList, LiveObject } from '@liveblocks/client'
import { ClientSideSuspense } from '@liveblocks/react'
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useNavigate,
} from '@remix-run/react'
import { json } from '@vercel/remix'
import { useEffect, type MouseEvent, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { redirectWithError } from 'remix-toast'
import { v1 } from 'uuid'
import { z } from 'zod'

import {
  updateBoardLastOpenedAt,
  updateBoardName,
  upsertUserBoardRole,
} from './queries'
import styles from './styles.css'
import { checkUserAllowedToEnterBoardWithSecretId } from './validate'

import { requireAuthCookie } from '~/auth'
import {
  CARD_DIMENSIONS,
  Card,
  NAVIGATION_PORTAL_ID,
  cardLinks,
  cursorLinks,
  Cursor,
} from '~/components'
import {
  checkUserAllowedToEditBoard,
  getUserFromDB,
  getUserRoleForBoard,
} from '~/db'
import { FORM_INTENTS, INTENT } from '~/helpers'
import { getColorWithId } from '~/helpers/functions'
import { Kakashi, People, Trash } from '~/icons'
import {
  RoomProvider,
  useEventListener,
  useMutation,
  useMyPresence,
  useOthers,
  useStorage,
} from '~/liveblocks.config'

export const handle = {
  shouldHideRootNavigation: true,
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  ...cardLinks(),
  ...cursorLinks(),
]

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request)
  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const currentUrl = new URL(request.url)
  const secretId = currentUrl.searchParams.get('secretId')

  if (secretId) {
    const isUserAllowedToEnterBoard =
      await checkUserAllowedToEnterBoardWithSecretId({
        boardId,
        secretId,
      })

    if (!isUserAllowedToEnterBoard) {
      throw redirectWithError('/boards', {
        message: 'You are not allowed on this board.',
      })
    }

    await upsertUserBoardRole({
      userId,
      boardId,
    })
  }

  await updateBoardLastOpenedAt(boardId)

  const [user, boardRole] = await Promise.all([
    getUserFromDB(userId),
    getUserRoleForBoard(userId, boardId),
  ])

  if (!boardRole) {
    throw redirectWithError('/boards', {
      message: 'You are not allowed on this board.',
    })
  }

  invariant(user, 'User not found')

  return json({
    boardId,
    userName: user.name,
    userRole: boardRole.role,
  })
}

function SuspenseFallback() {
  return (
    <main>
      <Kakashi className="suspense-fallback-loader" />
    </main>
  )
}

export default function BoardRoute() {
  const { boardId, userName } = useLoaderData<typeof loader>()

  return (
    <RoomProvider
      id={boardId}
      initialPresence={{
        cursor: null,
        name: userName,
        selectedCardId: null,
        isTyping: false,
      }}
      initialStorage={{
        cards: new LiveList(),
        boardName: 'Untitled board',
        zIndexOrderListWithCardIds: new LiveList(),
      }}
    >
      <ClientSideSuspense fallback={<SuspenseFallback />}>
        {() => <Board />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function Board() {
  const { boardId, userRole } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const navigate = useNavigate()

  const boardName = useStorage((root) => root.boardName)
  const lastSubmittedBoardName = useRef(boardName)
  const cards = useStorage((root) => root.cards)
  const others = useOthers()
  const [, updateMyPresence] = useMyPresence()

  useEffect(() => {
    if (boardName === lastSubmittedBoardName.current) {
      return
    }

    const handler = setTimeout(() => {
      const formData = new FormData()
      formData.append('boardName', boardName)
      formData.append(INTENT, FORM_INTENTS.updateBoardName)

      fetcher.submit(formData, {
        method: 'post',
      })

      // Update lastSubmittedBoardName after submitting
      lastSubmittedBoardName.current = boardName
    }, 500)

    return () => clearTimeout(handler)
  }, [boardName, fetcher])

  const updateBoardName = useMutation(({ storage }, newBoardName: string) => {
    storage.set('boardName', newBoardName)
  }, [])

  useEventListener(({ event }) => {
    if (event.type === 'board-deleted') {
      // Owner is the one who deleted the board
      // Additional toast message for Owner is annoying
      if (userRole !== 'Owner') {
        toast('This board was deleted by its owner.', { type: 'info' })
        navigate('/boards')
      }
    }
  })

  const navigationPortal = document.getElementById(NAVIGATION_PORTAL_ID)!

  function focusOnNewCardContent(cardId: string) {
    setTimeout(() => {
      const newCardElement = document.getElementById(cardId)!
      const editableSpan = newCardElement.querySelector(
        '[contentEditable]'
      ) as HTMLSpanElement
      editableSpan.focus()
    }, 10)
  }

  const createNewCard = useMutation(
    ({ storage }, event: MouseEvent<HTMLElement>) => {
      const newId = v1()

      // Divide by two to center the card horizontally
      const positionX = event.clientX - CARD_DIMENSIONS.width / 2

      // Subtract the height of the card to center it vertically
      const positionY = event.clientY - CARD_DIMENSIONS.height

      const newCard: CardType = {
        id: newId,
        html: '',
        positionX,
        positionY,
        height: CARD_DIMENSIONS.height,
        width: CARD_DIMENSIONS.width,
      }

      storage.get('cards').push(new LiveObject(newCard))
      storage.get('zIndexOrderListWithCardIds').push(newId)
      focusOnNewCardContent(newId)
    },
    []
  )

  return (
    <>
      <main
        onDoubleClick={createNewCard}
        onPointerMove={(event) => {
          updateMyPresence({
            cursor: {
              x: Math.round(event.clientX),
              y: Math.round(event.clientY),
            },
          })
        }}
        onPointerLeave={() =>
          updateMyPresence({
            cursor: null,
          })
        }
      >
        {/* This is for screen readers */}
        <h1 className="sr-only">Board name: {boardName}</h1>
        {cards.map((card, index) => (
          <Card key={card.id} index={index} card={card} />
        ))}

        {others.map(({ connectionId, presence }) => {
          if (presence.cursor === null) {
            return null
          }

          return (
            <Cursor
              key={`cursor-${connectionId}`}
              color={getColorWithId(connectionId)}
              x={presence.cursor.x}
              y={presence.cursor.y}
              name={presence.name}
            />
          )
        })}
      </main>

      {createPortal(
        <>
          <input
            placeholder="Vacation trips"
            aria-label="Enter name of board"
            className="portal-board-name-input"
            value={boardName}
            onChange={(event) => {
              updateBoardName(event.target.value)
            }}
          />
          <Link
            to={`/boards/${boardId}/share`}
            prefetch="render"
            className="portal-board-share-link portal-board-link"
            aria-label="Share"
          >
            <span>Share</span>
            <People />
          </Link>
          {userRole === 'Owner' && (
            <Link
              to={`/boards/${boardId}/delete`}
              prefetch="render"
              className="portal-board-link"
              aria-label="Delete board"
            >
              <span>Delete</span>
              <Trash />
            </Link>
          )}
        </>,
        navigationPortal
      )}

      <Outlet />
    </>
  )
}

const schema = z.object({
  boardName: z.string(),
})

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema })

  if (submission.status !== 'success') {
    return submission.reply()
  }

  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const { boardName } = submission.value

  const isUserAllowedToEditBoard = await checkUserAllowedToEditBoard({
    userId,
    boardId,
  })

  // If this ever happens, likely API request, because we currently only support editor role
  // No "Read only" role yet
  // Simply throw 403 authorization error
  if (!isUserAllowedToEditBoard) {
    return json(
      { message: 'You are not allowed to edit this board' },
      { status: 403 }
    )
  }

  await updateBoardName({
    newBoardName: boardName,
    boardId,
  })

  return submission.reply()
}
