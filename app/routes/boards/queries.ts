import { prisma } from '~/db'

export async function createBoard(
  userId: string,
  boardName: string = 'Untitled'
) {
  const board = await prisma.board.create({
    data: {
      name: boardName,
    },
  })

  if (!board) {
    throw new Error('Failed to create board')
  }

  await prisma.boardRole.create({
    data: {
      role: 'Owner',
      boardId: board.id,
      userId: userId,
    },
  })

  return board
}

export async function getBoardsForUser(userId: string) {
  const result = await prisma.boardRole.findMany({
    where: {
      userId,
    },
    include: {
      board: true,
    },
  })

  return result.map(({ board }) => ({
    ...board,
    lastOpenedAt: board.lastOpenedAt?.toLocaleDateString() ?? null,
  }))
}
