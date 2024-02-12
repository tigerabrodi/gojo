/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `accountId` on the `BoardRole` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `Password` table. All the data in the column will be lost.
  - Added the required column `userId` to the `BoardRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Password` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Account_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Account";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "BoardRole_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BoardRole" ("boardId", "id", "role") SELECT "boardId", "id", "role" FROM "BoardRole";
DROP TABLE "BoardRole";
ALTER TABLE "new_BoardRole" RENAME TO "BoardRole";
CREATE UNIQUE INDEX "BoardRole_boardId_userId_key" ON "BoardRole"("boardId", "userId");
CREATE TABLE "new_Password" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salt" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Password" ("hash", "id", "salt") SELECT "hash", "id", "salt" FROM "Password";
DROP TABLE "Password";
ALTER TABLE "new_Password" RENAME TO "Password";
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
