import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma'
import { invariant } from '@epic-web/invariant'
import { redirect, type ActionFunctionArgs } from '@vercel/remix'
import { liveblocks } from '~/helpers/liveblocks'

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireAuthCookie(request)

  const user = await getUserFromDB(userId)

  if (!user) {
    // TODO: Toast message
    return redirect('/', { status: 401 })
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      email: user.email,
      name: user.name,
    },
  })

  const { room } = await request.json()

  invariant(typeof room === 'string', 'Invalid room')

  const role = await getUserRole(user.id, room)

  if (!role) {
    // TODO: Toast message
    // User is not allowed to be in the room
    return redirect('/', { status: 403 })
  }

  // currently only support editor role so give full access
  session.allow(room, session.FULL_ACCESS)

  // Authorize the user and return the result
  const result = await session.authorize()

  if (result.error) {
    console.error('Liveblocks authentication failed:', result.error)
    return new Response(undefined, { status: 403 })
  }

  return new Response(result.body, { status: result.status })
}

async function getUserFromDB(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  })
}

async function getUserRole(userId: string, boardId: string) {
  const boardRole = await prisma.boardRole.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId,
      },
    },
  })

  return boardRole
}
