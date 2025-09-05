-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommunityPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "mediaUrls" TEXT,
    "pollOptions" TEXT,
    "pollVotes" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "communityId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityPost_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommunityPost" ("authorId", "commentCount", "communityId", "content", "createdAt", "id", "isLocked", "isPinned", "likeCount", "mediaUrls", "pollOptions", "pollVotes", "title", "type", "updatedAt", "viewCount") SELECT "authorId", "commentCount", "communityId", "content", "createdAt", "id", "isLocked", "isPinned", "likeCount", "mediaUrls", "pollOptions", "pollVotes", "title", "type", "updatedAt", "viewCount" FROM "CommunityPost";
DROP TABLE "CommunityPost";
ALTER TABLE "new_CommunityPost" RENAME TO "CommunityPost";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
