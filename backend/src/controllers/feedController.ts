import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FeedParams {
  page?: string;
  limit?: string;
  sort?: "newest" | "oldest" | "popular";
}

interface FeedItem {
  id: string;
  type: "content" | "community_post" | "video";
  title: string;
  content?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  author: {
    id: number;
    name: string;
    displayName?: string;
  };
  createdAt: string;
  updatedAt: string;
  likes: number;
  comments: number;
  views?: number;
  community?: {
    id: number;
    name: string;
  };
}

/**
 * @swagger
 * /api/feed/public:
 *   get:
 *     summary: Get public feed with mixed content
 *     tags: [Feed]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular]
 *           default: newest
 *         description: Sort order for feed items
 *     responses:
 *       200:
 *         description: Public feed items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeedItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
export const getPublicFeed = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", sort = "newest" } = req.query as FeedParams;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    let orderBy: { createdAt?: "asc" | "desc"; viewCount?: "desc" } = { createdAt: "desc" }; // newest by default
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "popular") {
      orderBy = { viewCount: "desc" };
    }

    const feedItems: FeedItem[] = [];

    // Fetch regular content
    const contents = await prisma.content.findMany({
      take: Math.ceil(limitNum / 3), // Allocate 1/3 for regular content
      skip: Math.floor(skip / 3),
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    // Transform content to feed items
    contents.forEach(content => {
      feedItems.push({
        id: `content_${content.id}`,
        type: "content",
        title: content.title,
        content: content.sourceLink,
        author: {
          id: content.creator.id,
          name: content.creator.name,
          displayName: content.creator.displayName || undefined
        },
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.createdAt.toISOString(), // Content doesn't have updatedAt, use createdAt
        likes: 0, // Content doesn't have likes yet
        comments: 0, // Content doesn't have comments yet
        views: content.viewCount || 0
      });
    });

    // Fetch community posts from public communities
    const communityPosts = await prisma.communityPost.findMany({
      take: Math.ceil(limitNum / 3), // Allocate 1/3 for community posts
      skip: Math.floor(skip / 3),
      orderBy,
      where: {
        community: {
          privacyType: "public"
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    // Transform community posts to feed items
    communityPosts.forEach(post => {
      feedItems.push({
        id: `post_${post.id}`,
        type: "community_post",
        title: post.title || "Untitled Post",
        content: post.content || undefined,
        mediaUrl: post.mediaUrls ? JSON.parse(post.mediaUrls)[0] || undefined : undefined,
        author: {
          id: post.author.id,
          name: post.author.name,
          displayName: post.author.displayName || undefined
        },
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        likes: post._count.likes,
        comments: post._count.comments,
        community: {
          id: post.community.id,
          name: post.community.name
        }
      });
    });

    // Fetch videos
    const videos = await prisma.video.findMany({
      take: Math.ceil(limitNum / 3), // Allocate 1/3 for videos
      skip: Math.floor(skip / 3),
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    // Transform videos to feed items
    videos.forEach(video => {
      feedItems.push({
        id: `video_${video.id}`,
        type: "video",
        title: video.title,
        content: video.description || undefined,
        mediaUrl: video.filePath || undefined,
        thumbnailUrl: video.thumbnailPath || undefined,
        author: {
          id: video.creator.id,
          name: video.creator.name,
          displayName: video.creator.displayName || undefined
        },
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
        likes: 0, // Videos don't have likes yet
        comments: 0, // Videos don't have comments yet
        views: video.viewCount || 0
      });
    });

    // Sort all feed items by creation date (newest first by default)
    feedItems.sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === "popular") {
        return (b.views || 0) + b.likes - ((a.views || 0) + a.likes);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Limit to requested number of items
    const paginatedItems = feedItems.slice(0, limitNum);

    // Calculate total count for pagination
    const totalContent = await prisma.content.count();
    const totalPosts = await prisma.communityPost.count({
      where: {
        community: {
          privacyType: "public"
        }
      }
    });
    const totalVideos = await prisma.video.count();
    const total = totalContent + totalPosts + totalVideos;

    res.json({
      items: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + limitNum < total
      }
    });
  } catch (error) {
    console.error("Error fetching public feed:", error);
    res.status(500).json({ error: "Failed to fetch public feed" });
  }
};