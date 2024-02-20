import { prisma } from "~/db";

export async function updateBoardLastOpenedAt(boardId: string) {
  await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      lastOpenedAt: new Date(),
    },
  });
}

export async function updateBoardName({
  boardId,
  newBoardName,
}: {
  boardId: string;
  newBoardName: string;
}) {
  await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      name: newBoardName,
    },
  });
}

export async function upsertUserBoardRole({
  userId,
  boardId,
}: {
  userId: string;
  boardId: string;
}) {
  await prisma.boardRole.upsert({
    where: {
      boardId_userId: {
        boardId,
        userId,
      },
    },
    update: {},
    create: {
      boardId,
      userId,
      role: "Editor",
    },
  });
}
