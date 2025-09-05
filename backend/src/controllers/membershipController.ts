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

// Join a community
export const joinCommunity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: Number(communityId) }
    });

    if (!community || !community.isActive) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Check if user is already a member
    const existingMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: "Already a member of this community" });
    }

    // For private communities, create a join request
    if (community.privacyType === "private") {
      // Check if there's already a pending request
      const existingRequest = await prisma.communityJoinRequest.findUnique({
        where: {
          communityId_userId: {
            communityId: Number(communityId),
            userId: req.user.id
          }
        }
      });

      if (existingRequest) {
        return res.status(400).json({ 
          error: "Join request already pending",
          status: existingRequest.status
        });
      }

      const joinRequest = await prisma.communityJoinRequest.create({
        data: {
          communityId: Number(communityId),
          userId: req.user.id,
          status: "pending"
        },
        include: {
          user: {
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
          }
        }
      });

      // Create notification for community admins
      const adminMemberships = await prisma.communityMembership.findMany({
        where: {
          communityId: Number(communityId),
          role: "admin"
        }
      });

      for (const admin of adminMemberships) {
        await prisma.notification.create({
          data: {
            userId: admin.userId,
            type: "community_join_request",
            title: "New Join Request",
            message: `${req.user.displayName || req.user.name} wants to join ${community.name}`,
            data: JSON.stringify({
              communityId: community.id,
              requestId: joinRequest.id,
              requesterId: req.user.id
            })
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: "Join request sent successfully",
        request: joinRequest
      });
    }

    // For public communities, join directly
    const membership = await prisma.communityMembership.create({
      data: {
        communityId: Number(communityId),
        userId: req.user.id,
        role: "member"
      },
      include: {
        user: {
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
        }
      }
    });

    // Update member count
    await prisma.community.update({
      where: { id: Number(communityId) },
      data: {
        memberCount: {
          increment: 1
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Joined community successfully",
      membership
    });

  } catch (error) {
    console.error("Join community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave a community
export const leaveCommunity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;

    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: "Not a member of this community" });
    }

    // Check if user is the only admin
    if (membership.role === "admin") {
      const adminCount = await prisma.communityMembership.count({
        where: {
          communityId: Number(communityId),
          role: "admin"
        }
      });

      if (adminCount === 1) {
        return res.status(400).json({ 
          error: "Cannot leave community as the only admin. Please assign another admin first." 
        });
      }
    }

    await prisma.communityMembership.delete({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    // Update member count
    await prisma.community.update({
      where: { id: Number(communityId) },
      data: {
        memberCount: {
          decrement: 1
        }
      }
    });

    res.json({
      success: true,
      message: "Left community successfully"
    });

  } catch (error) {
    console.error("Leave community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get community members
export const getCommunityMembers = async (req: Request, res: Response) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20, role } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: { communityId: number; role?: string } = {
      communityId: Number(communityId)
    };

    if (role) {
      where.role = role as string;
    }

    const [members, total] = await Promise.all([
      prisma.communityMembership.findMany({
        where,
        skip,
        take,
        orderBy: [
          { role: "asc" }, // admins first, then moderators, then members
          { joinedAt: "asc" }
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true,
              profilePicture: true
            }
          }
        }
      }),
      prisma.communityMembership.count({ where })
    ]);

    res.json({
      members,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get community members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update member role (admin only)
export const updateMemberRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId, userId } = req.params;
    const { role } = req.body;

    if (!["admin", "moderator", "member"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if requester is admin
    const requesterMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if target user is a member
    const targetMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: Number(userId)
        }
      }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "User is not a member of this community" });
    }

    // Prevent demoting the last admin
    if (targetMembership.role === "admin" && role !== "admin") {
      const adminCount = await prisma.communityMembership.count({
        where: {
          communityId: Number(communityId),
          role: "admin"
        }
      });

      if (adminCount === 1) {
        return res.status(400).json({ 
          error: "Cannot demote the only admin. Please assign another admin first." 
        });
      }
    }

    const updatedMembership = await prisma.communityMembership.update({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: Number(userId)
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: Number(userId),
        type: "role_updated",
        title: "Role Updated",
        message: `Your role in the community has been updated to ${role}`,
        data: JSON.stringify({
          communityId: Number(communityId),
          newRole: role
        })
      }
    });

    res.json({
      success: true,
      message: "Member role updated successfully",
      membership: updatedMembership
    });

  } catch (error) {
    console.error("Update member role error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove member from community (admin/moderator only)
export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId, userId } = req.params;
    const { reason } = req.body;

    // Check if requester has permission
    const requesterMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!requesterMembership || !["admin", "moderator"].includes(requesterMembership.role)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    // Check if target user is a member
    const targetMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: Number(userId)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: "User is not a member of this community" });
    }

    // Prevent removing admins by moderators
    if (requesterMembership.role === "moderator" && targetMembership.role === "admin") {
      return res.status(403).json({ error: "Moderators cannot remove admins" });
    }

    // Prevent removing the last admin
    if (targetMembership.role === "admin") {
      const adminCount = await prisma.communityMembership.count({
        where: {
          communityId: Number(communityId),
          role: "admin"
        }
      });

      if (adminCount === 1) {
        return res.status(400).json({ 
          error: "Cannot remove the only admin. Please assign another admin first." 
        });
      }
    }

    await prisma.communityMembership.delete({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: Number(userId)
        }
      }
    });

    // Update member count
    await prisma.community.update({
      where: { id: Number(communityId) },
      data: {
        memberCount: {
          decrement: 1
        }
      }
    });

    // Create notification for the removed user
    await prisma.notification.create({
      data: {
        userId: Number(userId),
        type: "removed_from_community",
        title: "Removed from Community",
        message: reason || "You have been removed from the community",
        data: JSON.stringify({
          communityId: Number(communityId),
          reason
        })
      }
    });

    res.json({
      success: true,
      message: "Member removed successfully"
    });

  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Handle join requests (admin only)
export const handleJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use \"approve\" or \"reject\"" });
    }

    const joinRequest = await prisma.communityJoinRequest.findUnique({
      where: { id: Number(requestId) },
      include: {
        community: true,
        user: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ error: "Join request not found" });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ error: "Join request already processed" });
    }

    // Check if requester is admin
    const requesterMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: joinRequest.communityId,
          userId: req.user.id
        }
      }
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (action === "approve") {
      // Create membership
      await prisma.communityMembership.create({
        data: {
          communityId: joinRequest.communityId,
          userId: joinRequest.userId,
          role: "member"
        }
      });

      // Update member count
      await prisma.community.update({
        where: { id: joinRequest.communityId },
        data: {
          memberCount: {
            increment: 1
          }
        }
      });
    }

    // Update request status
    await prisma.communityJoinRequest.update({
      where: { id: Number(requestId) },
      data: { 
        status: action === "approve" ? "approved" : "rejected",
        respondedAt: new Date()
      }
    });

    // Create notification for the requester
    await prisma.notification.create({
      data: {
        userId: joinRequest.userId,
        type: "join_request_response",
        title: `Join Request ${action === "approve" ? "Approved" : "Rejected"}`,
        message: `Your request to join ${joinRequest.community.name} has been ${action}d`,
        data: JSON.stringify({
          communityId: joinRequest.communityId,
          action
        })
      }
    });

    res.json({
      success: true,
      message: `Join request ${action}d successfully`
    });

  } catch (error) {
    console.error("Handle join request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get pending join requests for a community (admin only)
export const getPendingJoinRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { communityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if requester is admin
    const requesterMembership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(communityId),
          userId: req.user.id
        }
      }
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [requests, total] = await Promise.all([
      prisma.communityJoinRequest.findMany({
        where: {
          communityId: Number(communityId),
          status: "pending"
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true,
              profilePicture: true
            }
          }
        }
      }),
      prisma.communityJoinRequest.count({
        where: {
          communityId: Number(communityId),
          status: "pending"
        }
      })
    ]);

    res.json({
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get pending join requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's community memberships
export const getUserMemberships = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [memberships, total] = await Promise.all([
      prisma.communityMembership.findMany({
        where: { userId: req.user.id },
        skip,
        take,
        orderBy: { joinedAt: "desc" },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              logoUrl: true,
              memberCount: true,
              postCount: true,
              privacyType: true
            }
          }
        }
      }),
      prisma.communityMembership.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      memberships,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get user memberships error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};