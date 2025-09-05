import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
  };
}

interface ReportItem {
  id: number;
  reason: string;
  status: string;
  createdAt: Date;
  type: string;
  reporter: {
    id: number;
    name: string;
  };
  post?: {
    id: number;
    title: string;
    content: string;
    author: {
      id: number;
      name: string;
    };
  };
  comment?: {
    id: number;
    content: string;
    author: {
      id: number;
      name: string;
    };
  };
}

interface ReportWithPost {
  id: number;
  reason: string;
  status: string;
  createdAt: Date;
  postId: number;
  reporterId: number;
  post: {
    id: number;
    title: string | null;
    content: string;
    communityId: number;
    author: {
      id: number;
      name: string;
    };
  };
}

interface ReportWithComment {
  id: number;
  reason: string;
  status: string;
  createdAt: Date;
  commentId: number;
  reporterId: number;
  comment: {
    id: number;
    content: string;
    post: {
      communityId: number;
    };
    author: {
      id: number;
      name: string;
    };
  };
}

interface UpdatedReport {
  id: number;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  postId?: number;
  commentId?: number;
  reporterId: number;
}

// Like/Unlike a post
export const togglePostLike = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      include: {
        community: true,
        author: {
          select: {
            id: true,
            name: true
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
      return res.status(403).json({ error: "Must be a member to like posts" });
    }

    // Check if user already liked this post
    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId: Number(postId),
          userId: req.user.id
        }
      }
    });

    let isLiked = false;
    let likeCountChange = 0;

    if (existingLike) {
      // Unlike the post
      await prisma.communityPostLike.delete({
        where: {
          postId_userId: {
            postId: Number(postId),
            userId: req.user.id
          }
        }
      });
      likeCountChange = -1;
    } else {
      // Like the post
      await prisma.communityPostLike.create({
        data: {
          postId: Number(postId),
          userId: req.user.id,
          type: "like"
        }
      });
      isLiked = true;
      likeCountChange = 1;

      // Create notification for post author (if not liking own post)
      if (post.authorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "post_like",
            title: "Post Liked",
            message: `${req.user.name} liked your post in ${post.community.name}`,
            data: JSON.stringify({
              postId: Number(postId),
              communityId: post.communityId,
              likerId: req.user.id
            })
          }
        });
      }
    }

    // Update post like count
    await prisma.communityPost.update({
      where: { id: Number(postId) },
      data: {
        likeCount: {
          increment: likeCountChange
        }
      }
    });

    // Get updated like count
    const updatedPost = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      select: {
        likeCount: true
      }
    });

    res.json({
      success: true,
      isLiked,
      likeCount: updatedPost?.likeCount || 0
    });

  } catch (error) {
    console.error("Toggle post like error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Report a post
export const reportPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: Number(postId) },
      include: {
        community: true
      }
    });

    if (!post || !post.isActive) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user already reported this post
    const existingReport = await prisma.communityPostReport.findUnique({
      where: {
        postId_reporterId: {
          postId: Number(postId),
          reporterId: req.user.id
        }
      }
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this post" });
    }

    const report = await prisma.communityPostReport.create({
      data: {
        postId: Number(postId),
        reporterId: req.user.id,
        reason,
        description: description || null,
        status: "pending"
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Notify community admins and moderators
    const adminModerators = await prisma.communityMembership.findMany({
      where: {
        communityId: post.communityId,
        role: {
          in: ["admin", "moderator"]
        }
      }
    });

    const notifications = adminModerators.map(member => ({
      userId: member.userId,
      type: "content_reported",
      title: "Content Reported",
      message: `A post has been reported in ${post.community.name}`,
      data: JSON.stringify({
        reportId: report.id,
        postId: Number(postId),
        communityId: post.communityId,
        reason
      })
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report
    });

  } catch (error) {
    console.error("Report post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Report a comment
export const reportComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { commentId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

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

    // Check if user already reported this comment
    const existingReport = await prisma.communityCommentReport.findUnique({
      where: {
        commentId_reporterId: {
          commentId: Number(commentId),
          reporterId: req.user.id
        }
      }
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this comment" });
    }

    const report = await prisma.communityCommentReport.create({
      data: {
        commentId: Number(commentId),
        reporterId: req.user.id,
        reason,
        description: description || null,
        status: "pending"
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Notify community admins and moderators
    const adminModerators = await prisma.communityMembership.findMany({
      where: {
        communityId: comment.post.communityId,
        role: {
          in: ["admin", "moderator"]
        }
      }
    });

    const notifications = adminModerators.map(member => ({
      userId: member.userId,
      type: "content_reported",
      title: "Comment Reported",
      message: `A comment has been reported in ${comment.post.community.name}`,
      data: JSON.stringify({
        reportId: report.id,
        commentId: Number(commentId),
        postId: comment.postId,
        communityId: comment.post.communityId,
        reason
      })
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report
    });

  } catch (error) {
    console.error("Report comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get reports for moderation (admin/moderator only)
export const getCommunityReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status = "pending",
      type // 'post' or 'comment'
    } = req.query;

    // Check if user is admin or moderator
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    let reports: ReportItem[] = [];
    let total = 0;

    if (type === "post") {
      // Get only post reports
      const [postReports, postTotal] = await Promise.all([
        prisma.communityPostReport.findMany({
          where: {
            status: status as string,
            post: {
              communityId: Number(communityId)
            }
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            reporter: {
              select: {
                id: true,
                name: true
              }
            },
            post: {
              select: {
                id: true,
                title: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }),
        prisma.communityPostReport.count({
          where: {
            status: status as string,
            post: {
              communityId: Number(communityId)
            }
          }
        })
      ]);
      reports = postReports.map(report => ({ 
        ...report, 
        type: "post",
        post: {
          ...report.post,
          title: report.post.title || "Untitled Post"
        }
      }));
      total = postTotal;
    } else if (type === "comment") {
      // Get only comment reports
      const [commentReports, commentTotal] = await Promise.all([
        prisma.communityCommentReport.findMany({
          where: {
            status: status as string,
            comment: {
              post: {
                communityId: Number(communityId)
              }
            }
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            reporter: {
              select: {
                id: true,
                name: true
              }
            },
            comment: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                post: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }),
        prisma.communityCommentReport.count({
          where: {
            status: status as string,
            comment: {
              post: {
                communityId: Number(communityId)
              }
            }
          }
        })
      ]);
      reports = commentReports.map(report => ({ ...report, type: "comment" }));
      total = commentTotal;
    } else {
      // Get both post and comment reports
      const [postReports, commentReports, postTotal, commentTotal] = await Promise.all([
        prisma.communityPostReport.findMany({
          where: {
            status: status as string,
            post: {
              communityId: Number(communityId)
            }
          },
          take: Math.ceil(take / 2),
          orderBy: { createdAt: "desc" },
          include: {
            reporter: {
              select: {
                id: true,
                name: true
              }
            },
            post: {
              select: {
                id: true,
                title: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }),
        prisma.communityCommentReport.findMany({
          where: {
            status: status as string,
            comment: {
              post: {
                communityId: Number(communityId)
              }
            }
          },
          take: Math.ceil(take / 2),
          orderBy: { createdAt: "desc" },
          include: {
            reporter: {
              select: {
                id: true,
                name: true
              }
            },
            comment: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                post: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }),
        prisma.communityPostReport.count({
          where: {
            status: status as string,
            post: {
              communityId: Number(communityId)
            }
          }
        }),
        prisma.communityCommentReport.count({
          where: {
            status: status as string,
            comment: {
              post: {
                communityId: Number(communityId)
              }
            }
          }
        })
      ]);
      
      const allReports = [
        ...postReports.map(report => ({ 
          ...report, 
          type: "post",
          post: {
            ...report.post,
            title: report.post.title || "Untitled Post"
          }
        })),
        ...commentReports.map(report => ({ 
          ...report, 
          type: "comment",
          comment: {
            ...report.comment,
            post: {
              ...report.comment.post,
              title: report.comment.post.title || "Untitled Post"
            }
          }
        }))
      ];
      
      // Sort by createdAt and apply pagination
      reports = allReports
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(skip, skip + take);
      
      total = postTotal + commentTotal;
    }

    res.json({
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get community reports error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Handle a report (admin/moderator only)
export const handleReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { reportId } = req.params;
    const { action, moderatorNote, type } = req.body; // 'approve', 'reject', or 'dismiss', and 'post' or 'comment'

    if (!["approve", "reject", "dismiss"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use \"approve\", \"reject\", or \"dismiss\"" });
    }

    if (!["post", "comment"].includes(type)) {
      return res.status(400).json({ error: "Invalid type. Use \"post\" or \"comment\"" });
    }

    let report: ReportWithPost | ReportWithComment | null = null;
    let communityId: number | undefined;

    if (type === "post") {
      report = await prisma.communityPostReport.findUnique({
        where: { id: Number(reportId) },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true
                }
              },
              community: true
            }
          }
        }
      });
      communityId = (report as ReportWithPost)?.post?.communityId;
    } else {
      report = await prisma.communityCommentReport.findUnique({
        where: { id: Number(reportId) },
        include: {
          comment: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true
                }
              },
              post: {
                include: {
                  community: true
                }
              }
            }
          }
        }
      });      communityId = (report as ReportWithComment)?.comment?.post?.communityId;
    }

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (report.status !== "pending") {
      return res.status(400).json({ error: "Report already processed" });
    }
    
    // Check if user is admin or moderator
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: communityId!,
          userId: req.user.id
        }
      }
    });

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    let contentAction = null;

    if (action === "approve") {
      // Remove the reported content
      if (type === "post") {
        await prisma.communityPost.update({
          where: { id: (report as ReportWithPost).post.id },
          data: { isActive: false }
        });
        contentAction = "Post removed";
      } else {
        await prisma.communityComment.update({
          where: { id: (report as ReportWithComment).comment.id },
          data: { isActive: false }
        });
        contentAction = "Comment removed";
      }
    }

    // Update report status
    let updatedReport: UpdatedReport;
    if (type === "post") {
      updatedReport = await prisma.communityPostReport.update({
        where: { id: Number(reportId) },
        data: {
          status: action === "approve" ? "resolved" : action === "reject" ? "rejected" : "dismissed",
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        }
      });
    } else {
      updatedReport = await prisma.communityCommentReport.update({
        where: { id: Number(reportId) },
        data: {
          status: action === "approve" ? "resolved" : action === "reject" ? "rejected" : "dismissed",
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        }
      });
    }

    // Notify the reporter
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: "report_resolved",
        title: "Report Update",
        message: `Your report has been ${action}d by a moderator`,
        data: JSON.stringify({
          reportId: report.id,
          action,
          contentAction,
          moderatorNote
        })
      }
    });

    res.json({
      success: true,
      message: `Report ${action}d successfully`,
      report: updatedReport,
      contentAction
    });

  } catch (error) {
    console.error("Handle report error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's liked posts
export const getUserLikedPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [likes, total] = await Promise.all([
      prisma.communityPostLike.findMany({
        where: {
          userId: req.user.id,
          type: "like"
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          post: {
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
                  likes: true,
                  comments: true
                }
              }
            }
          }
        }
      }),
      prisma.communityPostLike.count({
        where: {
          userId: req.user.id,
          type: "like"
        }
      })
    ]);

    const likedPosts = likes.map(like => ({
      ...like.post,
      mediaUrls: like.post?.mediaUrls ? JSON.parse(like.post.mediaUrls) : [],
      pollOptions: like.post?.pollOptions ? JSON.parse(like.post.pollOptions) : null,
      likeCount: like.post?._count.likes || 0,
      commentCount: like.post?._count.comments || 0,
      likedAt: like.createdAt
    })).filter(post => post.id); // Filter out null posts

    res.json({
      posts: likedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get user liked posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get engagement statistics for a community (admin/moderator only)
export const getCommunityEngagementStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;
    const { days = 30 } = req.query;

    // Check if user is admin or moderator
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const [totalPosts, totalComments, totalLikes, totalMembers, recentActivity] = await Promise.all([
      // Total posts
      prisma.communityPost.count({
        where: {
          communityId: Number(communityId),
          isActive: true
        }
      }),
      // Total comments
      prisma.communityComment.count({
        where: {
          post: {
            communityId: Number(communityId)
          },
          isActive: true
        }
      }),
      // Total likes
      prisma.communityPostLike.count({
        where: {
          post: {
            communityId: Number(communityId)
          }
        }
      }),
      // Total members
      prisma.communityMembership.count({
        where: {
          communityId: Number(communityId)
        }
      }),
      // Recent activity (last N days)
      Promise.all([
        prisma.communityPost.count({
          where: {
            communityId: Number(communityId),
            isActive: true,
            createdAt: {
              gte: daysAgo
            }
          }
        }),
        prisma.communityComment.count({
          where: {
            post: {
              communityId: Number(communityId)
            },
            isActive: true,
            createdAt: {
              gte: daysAgo
            }
          }
        }),
        prisma.communityPostLike.count({
          where: {
            post: {
              communityId: Number(communityId)
            },
            createdAt: {
              gte: daysAgo
            }
          }
        }),
        prisma.communityMembership.count({
          where: {
            communityId: Number(communityId),
            joinedAt: {
              gte: daysAgo
            }
          }
        })
      ])
    ]);

    const [recentPosts, recentComments, recentLikes, newMembers] = recentActivity;

    res.json({
      totalStats: {
        posts: totalPosts,
        comments: totalComments,
        likes: totalLikes,
        members: totalMembers
      },
      recentActivity: {
        days: Number(days),
        posts: recentPosts,
        comments: recentComments,
        likes: recentLikes,
        newMembers
      },
      engagementRate: totalPosts > 0 ? ((totalComments + totalLikes) / totalPosts).toFixed(2) : "0.00"
    });

  } catch (error) {
    console.error("Get community engagement stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};