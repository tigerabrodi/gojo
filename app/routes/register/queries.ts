import crypto from "crypto";
import { prisma } from "~/db";

export async function createUser(email: string, password: string) {
  let salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");

  return prisma.user.create({
    data: {
      email: email,
      Password: {
        create: {
          hash,
          salt,
        },
      },
    },
  });
}
