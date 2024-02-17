-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardRole_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BoardRole" ("boardId", "id", "role", "userId") SELECT "boardId", "id", "role", "userId" FROM "BoardRole";
DROP TABLE "BoardRole";
ALTER TABLE "new_BoardRole" RENAME TO "BoardRole";
CREATE UNIQUE INDEX "BoardRole_boardId_userId_key" ON "BoardRole"("boardId", "userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
