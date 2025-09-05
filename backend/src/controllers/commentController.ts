import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    displayName: string | null;
  };
}

interface CommentWhereClause {
  postId: number;
  isActive: boolean;
  parentId?: number | null;
}



// Create a comment on a post
export const createComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Check if post exists and is active
    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      include: {
        community: true,
        author: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
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
      return res.status(403).json({ error: "Must be a member to comment" });
    }

    // If this is a reply, check if parent comment exists
    let parentComment = null;
    if (parentId) {
      parentComment = await prisma.communityComment.findUnique({
        where: { id: Number(parentId) }
      });

      if (!parentComment || !parentComment.isActive || parentComment.postId !== Number(postId)) {
        return res.status(400).json({ error: "Invalid parent comment" });
      }
    }

    const comment = await prisma.communityComment.create({
      data: {
        content: content.trim(),
        postId: Number(postId),
        authorId: req.user.id,
        parentId: parentId ? Number(parentId) : null
      },
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
    });

    // Update post comment count
    await prisma.communityPost.update({
      where: { id: Number(postId) },
      data: {
        commentCount: {
          increment: 1
        }
      }
    });

    // Create notification for post author (if not commenting on own post)
    if (post.authorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "post_comment",
          title: "New Comment",
          message: `${req.user.displayName || req.user.name} commented on your post`,
          data: JSON.stringify({
            postId: Number(postId),
            commentId: comment.id,
            communityId: post.communityId
          })
        }
      });
    }

    // Create notification for parent comment author (if replying and not replying to own comment)
    if (parentComment && parentComment.authorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: parentComment.authorId,
          type: "comment_reply",
          title: "New Reply",
          message: `${req.user.displayName || req.user.name} replied to your comment`,
          data: JSON.stringify({
            postId: Number(postId),
            commentId: comment.id,
            parentCommentId: parentComment.id,
            communityId: post.communityId
          })
        }
      });
    }

    const formattedComment = {
      ...comment,
      likeCount: comment._count.likes,
      replyCount: comment._count.replies
    };

    res.status(201).json({
      success: true,
      comment: formattedComment
    });

  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get comments for a post
export const getPostComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sort = "createdAt",
      order = "desc",
      parentId = null
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: CommentWhereClause = {
      postId: Number(postId),
      isActive: true
    };

    // Filter by parent comment (for threaded replies)
    if (parentId === "null" || parentId === null) {
      where.parentId = null; // Top-level comments only
    } else if (parentId) {
      where.parentId = Number(parentId); // Replies to specific comment
    }

    const orderBy: Record<string, string> = {};
    orderBy[sort as string] = order as string;

    const [comments, total] = await Promise.all([
      prisma.communityComment.findMany({
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
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  displayName: true
                }
              }
            }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      }),
      prisma.communityComment.count({ where })
    ]);

    const formattedComments = comments.map(comment => ({
      ...comment,
      likeCount: comment._count.likes,
      replyCount: comment._count.replies
    }));

    res.json({
      comments: formattedComments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get post comments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific comment with its replies
export const getComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { includeReplies = "true", repliesLimit = 10 } = req.query;

    const comment = await prisma.communityComment.findUnique({
      where: { id: Number(commentId) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            profilePicture: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
                displayName: true
              }
            }
          }
        },
        replies: includeReplies === "true" ? {
          where: { isActive: true },
          take: Number(repliesLimit),
          orderBy: { createdAt: "asc" },
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
        } : false,
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const formattedComment = {
      ...comment,
      likeCount: comment._count.likes,
      replyCount: comment._count.replies,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replies: comment.replies ? comment.replies.map((reply: any) => ({
        ...reply,
        likeCount: reply._count.likes,
        replyCount: reply._count.replies
      })) : undefined
    };

    res.json({ comment: formattedComment });

  } catch (error) {
    console.error("Get comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a comment
export const updateComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const comment = await prisma.communityComment.findUnique({
      where: { id: Number(commentId) }
    });

    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: "Can only edit your own comments" });
    }

    const updatedComment = await prisma.communityComment.update({
      where: { id: Number(commentId) },
      data: {
        content: content.trim(),
        updatedAt: new Date()
      },
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
    });

    const formattedComment = {
      ...updatedComment,
      likeCount: updatedComment._count.likes,
      replyCount: updatedComment._count.replies
    };

    res.json({
      success: true,
      comment: formattedComment
    });

  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a comment
export const deleteComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { commentId } = req.params;

    const comment = await prisma.communityComment.findUnique({
      where: { id: Number(commentId) },
      include: {
        post: {
          include: {
            community: true
          }
        }
      }
    });

    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user can delete (author or admin/moderator)
    let canDelete = comment.authorId === req.user.id;
    
    if (!canDelete) {
      const membership = await prisma.communityMembership.findUnique({
        where: {
          communityId_userId: {
            communityId: comment.post.communityId,
            userId: req.user.id
          }
        }
      });
      canDelete = !!(membership && ["admin", "moderator"].includes(membership.role));
    }

    if (!canDelete) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Soft delete the comment
    await prisma.communityComment.update({
      where: { id: Number(commentId) },
      data: { isActive: false }
    });

    // Update post comment count
    await prisma.communityPost.update({
      where: { id: comment.postId },
      data: {
        commentCount: {
          decrement: 1
        }
      }
    });

    res.json({
      success: true,
      message: "Comment deleted successfully"
    });

  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Like/Unlike a comment
export const toggleCommentLike = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { commentId } = req.params;

    const comment = await prisma.communityComment.findUnique({
      where: { id: Number(commentId) },
      include: {
        post: {
          include: {
            community: true
          }
        }
      }
    });

    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is a member of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: comment.post.communityId,
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Must be a member to like comments" });
    }

    // Check if user already liked this comment
    const existingLike = await prisma.communityCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: Number(commentId),
          userId: req.user.id
        }
      }
    });

    let isLiked = false;
    let likeCountChange = 0;

    if (existingLike) {
      // Unlike the comment
      await prisma.communityCommentLike.delete({
        where: {
          commentId_userId: {
            commentId: Number(commentId),
            userId: req.user.id
          }
        }
      });
      likeCountChange = -1;
    } else {
      // Like the comment
      await prisma.communityCommentLike.create({
        data: {
          commentId: Number(commentId),
          userId: req.user.id
        }
      });
      isLiked = true;
      likeCountChange = 1;

      // Create notification for comment author (if not liking own comment)
      if (comment.authorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: comment.authorId,
            type: "comment_like",
            title: "Comment Liked",
            message: `${req.user.displayName || req.user.name} liked your comment`,
            data: JSON.stringify({
              commentId: Number(commentId),
              postId: comment.postId,
              communityId: comment.post.communityId
            })
          }
        });
      }
    }

    // Update comment like count
    await prisma.communityComment.update({
      where: { id: Number(commentId) },
      data: {
        likeCount: {
          increment: likeCountChange
        }
      }
    });

    // Get updated like count
    const updatedComment = await prisma.communityComment.findUnique({
      where: { id: Number(commentId) },
      select: {
        likeCount: true
      }
    });

    res.json({
      success: true,
      isLiked,
      likeCount: updatedComment?.likeCount || 0
    });

  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get comment replies with pagination
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10, sort = "createdAt", order = "asc" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const orderBy: Record<string, string> = {};
    orderBy[sort as string] = order as string;

    const [replies, total] = await Promise.all([
      prisma.communityComment.findMany({
        where: {
          parentId: Number(commentId),
          isActive: true
        },
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
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      }),
      prisma.communityComment.count({
        where: {
          parentId: Number(commentId),
          isActive: true
        }
      })
    ]);

    const formattedReplies = replies.map(reply => ({
      ...reply,
      likeCount: reply._count.likes,
      replyCount: reply._count.replies
    }));

    res.json({
      replies: formattedReplies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get comment replies error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};