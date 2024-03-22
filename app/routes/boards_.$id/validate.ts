import { prisma } from '~/db'

export async function checkUserAllowedToEnterBoardWithSecretId({
  boardId,
  secretId,
}: {
  boardId: string
  secretId: string
}) {
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
  })

  return board?.secretId === secretId
}
