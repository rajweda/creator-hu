-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommunityComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommunityComment" ("authorId", "content", "createdAt", "id", "likeCount", "parentId", "postId", "updatedAt") SELECT "authorId", "content", "createdAt", "id", "likeCount", "parentId", "postId", "updatedAt" FROM "CommunityComment";
DROP TABLE "CommunityComment";
ALTER TABLE "new_CommunityComment" RENAME TO "CommunityComment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
