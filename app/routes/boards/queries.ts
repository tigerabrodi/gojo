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
        role: "owner",
        boardId: board.id,
        userId: userId,
      },
    });

    return board;
  });
}
