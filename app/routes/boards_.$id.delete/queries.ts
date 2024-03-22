import { prisma } from '~/db'

export async function checkIsUserOwnerOfBoard({
  userId,
  boardId,
}: {
  userId: string
  boardId: string
}) {
  const boardRole = await prisma.boardRole.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId,
      },
    },
  })

  return boardRole?.role === 'Owner'
}

export async function deleteBoard(boardId: string) {
  return await prisma.board.delete({
    where: {
      id: boardId,
    },
  })
}
