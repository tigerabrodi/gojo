import { prisma } from ".";

export async function getUserFromDB(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
}

export async function getUserRoleForBoard(userId: string, boardId: string) {
  return await prisma.boardRole.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId,
      },
    },
  });
}
