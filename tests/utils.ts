import { faker } from "@faker-js/faker";
import crypto from "crypto";
import { prisma } from "~/db";

export function createRandomUser() {
  const username = faker.internet.userName();
  return {
    email: `test_${username}@example.com`,
    password: faker.internet.password(),
    name: username,
  };
}

export async function createAccount({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  let salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");

  return prisma.user.create({
    data: {
      email,
      name,
      Password: {
        create: {
          hash,
          salt,
        },
      },
    },
  });
}
