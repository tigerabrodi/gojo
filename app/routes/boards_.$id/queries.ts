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
