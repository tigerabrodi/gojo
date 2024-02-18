import { prisma } from "~/db";

export async function createBoard(
  userId: string,
  boardName: string = "Untitled"
) {
  return await prisma.$transaction(async (tx) => {
    const board = await tx.board.create({
      data: {
        name: boardName,
      },
    });

    await tx.boardRole.create({
      data: {
        role: "Owner",
        boardId: board.id,
        userId: userId,
      },
    });

    return board;
  });
}

export async function getBoardsForUser(userId: string) {
  const result = await prisma.boardRole.findMany({
    where: {
      userId,
    },
    include: {
      board: true,
    },
  });

  return result.map(({ board }) => ({
    ...board,
    lastOpenedAt: board.lastOpenedAt?.toLocaleDateString() ?? null,
  }));
}
