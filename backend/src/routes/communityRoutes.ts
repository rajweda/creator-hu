import express from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { Request } from "express";

interface AuthRequest extends Request {
  user: { id: string; email: string };
}

const prisma = new PrismaClient();

// Import controllers
import {
  createCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  uploadCommunityMedia,
  getTrendingCommunities,
  getCommunityCategories,
  upload
} from "../controllers/communityController";

import {
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  updateMemberRole,
  removeMember,
  handleJoinRequest,
  getPendingJoinRequests,
  getUserMemberships
} from "../controllers/membershipController";

import {
  createPost,
  getCommunityPosts,
  getPost,
  updatePost,
  deletePost,
  togglePinPost,
  voteOnPoll,
  uploadPostMedia
} from "../controllers/communityPostController";

import {
  createComment,
  getPostComments,
  getComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getCommentReplies
} from "../controllers/commentController";

import {
  togglePostLike,
  reportPost,
  reportComment,
  getCommunityReports,
  handleReport,
  getUserLikedPosts,
  getCommunityEngagementStats
} from "../controllers/engagementController";

const router = express.Router();

// ============================================================================
// COMMUNITY MANAGEMENT ROUTES
// ============================================================================

// Public routes
router.get("/communities", getCommunities);
router.get("/communities/trending", getTrendingCommunities);
router.get("/communities/categories", getCommunityCategories);
router.get("/communities/:id", getCommunityById);

// Protected routes
router.post("/communities", authenticateToken, createCommunity);
router.put("/communities/:id", authenticateToken, updateCommunity);
router.delete("/communities/:id", authenticateToken, deleteCommunity);
router.post("/communities/:id/upload", authenticateToken, upload.single("media"), uploadCommunityMedia);

// ============================================================================
// MEMBERSHIP MANAGEMENT ROUTES
// ============================================================================

// Join/Leave community
router.post("/communities/:communityId/join", authenticateToken, joinCommunity);
router.delete("/communities/:communityId/leave", authenticateToken, leaveCommunity);

// Member management
router.get("/communities/:communityId/members", getCommunityMembers);
router.put("/communities/:communityId/members/:userId/role", authenticateToken, updateMemberRole);
router.delete("/communities/:communityId/members/:userId", authenticateToken, removeMember);

// Join requests
router.get("/communities/:communityId/join-requests", authenticateToken, getPendingJoinRequests);
router.put("/join-requests/:requestId", authenticateToken, handleJoinRequest);

// User memberships
router.get("/user/memberships", authenticateToken, getUserMemberships);

// ============================================================================
// COMMUNITY POSTS ROUTES
// ============================================================================

// Post management
router.post("/communities/:communityId/posts", authenticateToken, uploadPostMedia.array("media", 5), createPost);
router.get("/communities/:communityId/posts", getCommunityPosts);
router.get("/posts/:postId", getPost);
router.put("/posts/:postId", authenticateToken, updatePost);
router.delete("/posts/:postId", authenticateToken, deletePost);

// Post actions
router.put("/posts/:postId/pin", authenticateToken, togglePinPost);
router.post("/posts/:postId/vote", authenticateToken, voteOnPoll);
router.post("/posts/:postId/like", authenticateToken, togglePostLike);
router.post("/posts/:postId/report", authenticateToken, reportPost);

// ============================================================================
// COMMENTS ROUTES
// ============================================================================

// Comment management
router.post("/posts/:postId/comments", authenticateToken, createComment);
router.get("/posts/:postId/comments", getPostComments);
router.get("/comments/:commentId", getComment);
router.put("/comments/:commentId", authenticateToken, updateComment);
router.delete("/comments/:commentId", authenticateToken, deleteComment);

// Comment actions
router.post("/comments/:commentId/like", authenticateToken, toggleCommentLike);
router.post("/comments/:commentId/report", authenticateToken, reportComment);
router.get("/comments/:commentId/replies", getCommentReplies);

// ============================================================================
// ENGAGEMENT & MODERATION ROUTES
// ============================================================================

// User engagement
router.get("/user/liked-posts", authenticateToken, getUserLikedPosts);

// Moderation (admin/moderator only)
router.get("/communities/:communityId/reports", authenticateToken, getCommunityReports);
router.put("/reports/:reportId", authenticateToken, handleReport);
router.get("/communities/:communityId/stats", authenticateToken, getCommunityEngagementStats);

// ============================================================================
// DISCOVERY & SEARCH ROUTES
// ============================================================================

// Search communities (using existing getCommunities with search params)
router.get("/search/communities", getCommunities);

// Get recommended communities based on user interests
router.get("/communities/recommended", authenticateToken, async (req, res) => {
  try {
    // This is a placeholder for recommendation logic
    // In a real implementation, you would use user's interests, joined communities, etc.
    const { limit = 10 } = req.query;
    
    // For now, return trending communities as recommendations
    const communities = await prisma.community.findMany({
      where: {
        isActive: true
      },
      take: Number(limit),
      orderBy: [
        { memberCount: "desc" },
        { postCount: "desc" }
      ],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        _count: {
          select: {
            memberships: true,
            posts: true
          }
        }
      }
    });

    const formattedCommunities = communities.map((community) => ({
      ...community,
      tags: JSON.parse(community.tags),
      memberCount: community._count.memberships,
      postCount: community._count.posts
    }));

    res.json({ communities: formattedCommunities });
  } catch (error) {
    console.error("Get recommended communities error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// NOTIFICATION ROUTES (Community-specific)
// ============================================================================

// Get community-related notifications
router.get("/notifications/community", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {
      userId: Number((req as AuthRequest).user.id),
      type: {
        in: [
          "new_community_post",
          "post_comment",
          "comment_reply",
          "post_like",
          "comment_like",
          "community_join_request",
          "join_request_response",
          "role_updated",
          "removed_from_community",
          "content_reported",
          "report_resolved"
        ]
      }
    };

    if (type) {
      where.type = {
        in: [type as string]
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.notification.count({ where })
    ]);

    const formattedNotifications = notifications.map((notification) => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Get community notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark community notifications as read
router.put("/notifications/community/read", authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: "notificationIds must be an array" });
    }

    await prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds.map((id) => Number(id))
        },
        userId: Number((req as AuthRequest).user.id)
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      message: "Notifications marked as read"
    });
  } catch (error) {
    console.error("Mark notifications as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// ANALYTICS ROUTES (Future implementation)
// ============================================================================

// Get community analytics (admin only)
router.get("/communities/:communityId/analytics", authenticateToken, async (req, res) => {
  try {
    // Placeholder for future analytics implementation
    res.json({
      message: "Analytics feature coming soon",
      communityId: req.params.communityId
    });
  } catch (error) {
    console.error("Get community analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;