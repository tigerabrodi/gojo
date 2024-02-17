import { prisma } from ".";

export async function getUserFromDB(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
}
