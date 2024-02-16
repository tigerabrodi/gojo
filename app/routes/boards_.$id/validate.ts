import { prisma } from "~/db";

export async function checkUserAllowedToEditBoard({
  userId,
  boardId,
}: {
  userId: string;
  boardId: string;
}) {
  const result = await prisma.boardRole.findUnique({
    where: {
      boardId_userId: {
        userId,
        boardId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!result || !result.role) return false;

  // We currently only support two roles: "owner" and "editor"
  // Editors also have full access, so no need for further checking
  return true;
}
