import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    displayName: string | null;
  };
}

interface PostData {
  title: string;
  content: string;
  type: string;
  communityId: number;
  authorId: number;
  mediaUrls?: string;
  pollOptions?: string;
}

interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

interface PostWhereClause {
  communityId: number;
  isActive: boolean;
  type?: string;
}

interface PostUpdateData {
  title?: string;
  content?: string;
  updatedAt?: Date;
}

interface PollOption {
  id: number;
  text: string;
  votes: number;
}

// Configure multer for post media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/posts");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadPostMedia = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith("video/");
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  }
});

// Create a new post in a community
export const createPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;
    const { title, content, type = "text", pollOptions } = req.body;

    if (!title && !content) {
      return res.status(400).json({ error: "Title or content is required" });
    }

    // Check if user is a member of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Must be a member to post in this community" });
    }

    const postData: PostData = {
      title,
      content,
      type,
      communityId: Number(communityId),
      authorId: req.user.id
    };

    // Handle media uploads
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const mediaUrls = (req.files as UploadedFile[]).map((file) => `/uploads/posts/${file.filename}`);
      postData.mediaUrls = JSON.stringify(mediaUrls);
    }

    // Handle poll creation
    if (type === "poll" && pollOptions) {
      try {
        const options = JSON.parse(pollOptions);
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ error: "Poll must have at least 2 options" });
        }
        postData.pollOptions = JSON.stringify(options.map((option: string, index: number) => ({
          id: index,
          text: option,
          votes: 0
        })));
      } catch (error) {
        return res.status(400).json({ error: "Invalid poll options format" });
      }
    }

    const post = await prisma.communityPost.create({
      data: postData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            profilePicture: true
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
            comments: true,
            likes: true
          }
        }
      }
    });

    // Update community post count
    await prisma.community.update({
      where: { id: Number(communityId) },
      data: {
        postCount: {
          increment: 1
        }
      }
    });

    // Notify community members (except the author)
    const communityMembers = await prisma.communityMembership.findMany({
      where: {
        communityId: Number(communityId),
        userId: {
          not: req.user?.id
        }
      },
      take: 100 // Limit to avoid too many notifications
    });

    const notifications = communityMembers.map(member => ({
      userId: member.userId,
      type: "new_community_post",
      title: "New Post",
      message: `${req.user?.displayName || req.user?.name} posted in ${post.community.name}`,
      data: JSON.stringify({
        postId: post.id,
        communityId: Number(communityId),
        authorId: req.user?.id
      })
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    const formattedPost = {
      ...post,
      mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
      pollOptions: post.pollOptions ? JSON.parse(post.pollOptions) : null,
      likeCount: post._count.likes,
      commentCount: post._count.comments
    };

    res.status(201).json({
      success: true,
      post: formattedPost
    });

  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get posts from a community
export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { communityId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sort = "createdAt",
      order = "desc",
      type
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: PostWhereClause = {
      communityId: Number(communityId),
      isActive: true
    };

    if (type) {
      where.type = type as string;
    }

    let orderBy: Record<string, string> | Record<string, string>[] = {};
    if (sort === "trending") {
      // Sort by engagement score (likes + comments) in the last 24 hours
      orderBy = [
        { likeCount: "desc" },
        { commentCount: "desc" },
        { createdAt: "desc" }
      ];
    } else {
      (orderBy as Record<string, string>)[sort as string] = order as string;
    }

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayName: true,
              profilePicture: true
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
              comments: true,
              likes: true
            }
          }
        }
      }),
      prisma.communityPost.count({ where })
    ]);

    const formattedPosts = posts.map(post => ({
      ...post,
      mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
      pollOptions: post.pollOptions ? JSON.parse(post.pollOptions) : null,
      likeCount: post._count.likes,
      commentCount: post._count.comments
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get community posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific post
export const getPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            profilePicture: true
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                displayName: true,
                profilePicture: true
              }
            },
            _count: {
              select: {
                likes: true,
                replies: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
    }

    const formattedPost = {
      ...post,
      mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
      pollOptions: post.pollOptions ? JSON.parse(post.pollOptions) : null,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      comments: post.comments.map(comment => ({
        ...comment,
        likeCount: comment._count.likes,
        replyCount: comment._count.replies
      }))
    };

    res.json({ post: formattedPost });

  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a post
export const updatePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { title, content } = req.body;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: "Can only edit your own posts" });
    }

    const updateData: PostUpdateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    updateData.updatedAt = new Date();

    const updatedPost = await prisma.communityPost.update({
      where: { id: Number(postId) },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            profilePicture: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    const formattedPost = {
      ...updatedPost,
      mediaUrls: updatedPost.mediaUrls ? JSON.parse(updatedPost.mediaUrls) : [],
      pollOptions: updatedPost.pollOptions ? JSON.parse(updatedPost.pollOptions) : null,
      likeCount: updatedPost._count.likes,
      commentCount: updatedPost._count.comments
    };

    res.json({
      success: true,
      post: formattedPost
    });

  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a post
export const deletePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      include: {
        community: true
      }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user can delete (author or admin/moderator)
    let canDelete = post.authorId === req.user.id;
    
    if (!canDelete) {
      const membership = await prisma.communityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId: post.communityId,
            userId: req.user.id
          }
        }
      });
      canDelete = membership ? ["admin", "moderator"].includes(membership.role) : false;
    }

    if (!canDelete) {
      return res.status(403).json({ error: "Permission denied" });
    }

    await prisma.communityPost.update({
      where: { id: Number(postId) },
      data: { isActive: false }
    });

    // Update community post count
    await prisma.community.update({
      where: { id: post.communityId },
      data: {
        postCount: {
          decrement: 1
        }
      }
    });

    res.json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Pin/Unpin a post (admin/moderator only)
export const togglePinPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is admin or moderator
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: post.communityId,
          userId: req.user.id
        }
      }
    });

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const updatedPost = await prisma.communityPost.update({
      where: { id: Number(postId) },
      data: { isPinned: !post.isPinned }
    });

    res.json({
      success: true,
      message: `Post ${updatedPost.isPinned ? "pinned" : "unpinned"} successfully`,
      isPinned: updatedPost.isPinned
    });

  } catch (error) {
    console.error("Toggle pin post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Vote on a poll
export const voteOnPoll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { optionId } = req.body;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) }
    });

    if (!post || !post.isActive || post.type !== "poll") {
      return res.status(404).json({ error: "Poll not found" });
    }

    if (!post.pollOptions) {
      return res.status(400).json({ error: "Invalid poll data" });
    }

    // Check if user is a member of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: post.communityId,
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Must be a member to vote" });
    }

    // Check if user already voted
    const existingVote = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId: Number(postId),
          userId: req.user.id
        }
      }
    });

    if (existingVote && existingVote.type === "poll_vote") {
      return res.status(400).json({ error: "Already voted on this poll" });
    }

    const pollOptions: PollOption[] = JSON.parse(post.pollOptions);
    const optionIndex = pollOptions.findIndex((option) => option.id === Number(optionId));
    
    if (optionIndex === -1) {
      return res.status(400).json({ error: "Invalid poll option" });
    }

    // Update poll option vote count
    pollOptions[optionIndex].votes += 1;

    await Promise.all([
      // Update post with new poll data
      prisma.communityPost.update({
        where: { id: Number(postId) },
        data: { pollOptions: JSON.stringify(pollOptions) }
      }),
      // Record the vote
      prisma.communityPostLike.create({
        data: {
          postId: Number(postId),
          userId: req.user.id,
          type: "poll_vote",
          metadata: JSON.stringify({ optionId: Number(optionId) })
        }
      })
    ]);

    res.json({
      success: true,
      message: "Vote recorded successfully",
      pollOptions
    });

  } catch (error) {
    console.error("Vote on poll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};