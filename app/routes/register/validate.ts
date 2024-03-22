import { prisma } from '~/db'

export async function checkUserExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  return user !== null
}
