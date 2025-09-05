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

interface CommunityWhereClause {
  isActive: boolean;
  category?: string;
  OR?: Array<{
    name?: { contains: string; mode: string };
    description?: { contains: string; mode: string };
  }>;
}

interface CommunityUpdateData {
  name?: string;
  description?: string;
  category?: string;
  tags?: string;
  privacyType?: string;
  rules?: string;
}

// Configure multer for community media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/community");
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

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Create a new community
export const createCommunity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name, description, category, tags, privacyType, rules } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    // Check if community name already exists
    const existingCommunity = await prisma.community.findUnique({
      where: { name }
    });

    if (existingCommunity) {
      return res.status(400).json({ error: "Community name already exists" });
    }

    const community = await prisma.community.create({
      data: {
        name,
        description,
        category,
        tags: JSON.stringify(tags || []),
        privacyType: privacyType || "public",
        rules: rules ? JSON.stringify(rules) : null,
        creatorId: req.user.id
      },
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

    // Automatically add creator as admin member
    await prisma.communityMembership.create({
      data: {
        communityId: community.id,
        userId: req.user.id,
        role: "admin"
      }
    });

    // Update member count
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: 1 }
    });

    res.status(201).json({
      success: true,
      community: {
        ...community,
        tags: JSON.parse(community.tags),
        rules: community.rules ? JSON.parse(community.rules) : null
      }
    });

  } catch (error) {
    console.error("Create community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all communities with pagination and filtering
export const getCommunities = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      sort = "memberCount",
      order = "desc"
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: CommunityWhereClause = {
      isActive: true
    };

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } }
      ];
    }

    let orderBy: Record<string, string> = {};
    
    // Map sort options to actual database fields
    switch (sort) {
      case "popular":
        orderBy = { memberCount: order as string };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "active":
        orderBy = { updatedAt: "desc" };
        break;
      default:
        (orderBy as Record<string, string>)[sort as string] = order as string;
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take,
        orderBy,
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
      }),
      prisma.community.count({ where })
    ]);

    const formattedCommunities = communities.map(community => ({
      ...community,
      tags: JSON.parse(community.tags),
      rules: community.rules ? JSON.parse(community.rules) : null,
      memberCount: community._count.memberships,
      postCount: community._count.posts
    }));

    res.json({
      communities: formattedCommunities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get communities error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific community by ID
export const getCommunityById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const community = await prisma.community.findUnique({
      where: { id: Number(id) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        memberships: {
          include: {
            user: {
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
            posts: true
          }
        }
      }
    });

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    res.json({
      ...community,
      tags: JSON.parse(community.tags),
      rules: community.rules ? JSON.parse(community.rules) : null,
      postCount: community._count.posts
    });

  } catch (error) {
    console.error("Get community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update community
export const updateCommunity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { name, description, category, tags, privacyType, rules } = req.body;

    // Check if user is admin of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(id),
          userId: req.user.id
        }
      }
    });

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const updateData: CommunityUpdateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = JSON.stringify(tags);
    if (privacyType) updateData.privacyType = privacyType;
    if (rules) updateData.rules = JSON.stringify(rules);

    const community = await prisma.community.update({
      where: { id: Number(id) },
      data: updateData,
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

    res.json({
      success: true,
      community: {
        ...community,
        tags: JSON.parse(community.tags),
        rules: community.rules ? JSON.parse(community.rules) : null
      }
    });

  } catch (error) {
    console.error("Update community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete community
export const deleteCommunity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    // Check if user is admin of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(id),
          userId: req.user.id
        }
      }
    });

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await prisma.community.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });

    res.json({ success: true, message: "Community deleted successfully" });

  } catch (error) {
    console.error("Delete community error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Upload community banner/logo
export const uploadCommunityMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { type } = req.body; // 'banner' or 'logo'

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check if user is admin of the community
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId: Number(id),
          userId: req.user.id
        }
      }
    });

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const fileUrl = `/uploads/community/${req.file.filename}`;
    const updateData: { bannerUrl?: string; logoUrl?: string } = {};
    
    if (type === "banner") {
      updateData.bannerUrl = fileUrl;
    } else if (type === "logo") {
      updateData.logoUrl = fileUrl;
    } else {
      return res.status(400).json({ error: "Invalid media type. Use \"banner\" or \"logo\"" });
    }

    await prisma.community.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: `${type} uploaded successfully`,
      url: fileUrl
    });

  } catch (error) {
    console.error("Upload community media error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get trending communities
export const getTrendingCommunities = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    // Get communities with most activity in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const communities = await prisma.community.findMany({
      where: {
        isActive: true,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      take: Number(limit),
      orderBy: [
        { memberCount: "desc" },
        { postCount: "desc" },
        { createdAt: "desc" }
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

    const formattedCommunities = communities.map(community => ({
      ...community,
      tags: JSON.parse(community.tags),
      memberCount: community._count.memberships,
      postCount: community._count.posts
    }));

    res.json({ communities: formattedCommunities });

  } catch (error) {
    console.error("Get trending communities error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get community categories
export const getCommunityCategories = async (req: Request, res: Response) => {
  try {
    // Predefined categories that match the dashboard categories
    const predefinedCategories = [
      "ai-tech",
      "fashion-style", 
      "entertainment",
      "learning",
      "fitness-health",
      "art-design",
      "business",
      "travel-culture"
    ];

    // Get counts for existing categories from database
    const categoryCounts = await prisma.community.groupBy({
      by: ["category"],
      where: {
        isActive: true,
        category: {
          in: predefinedCategories
        }
      },
      _count: {
        category: true
      }
    });

    // Create a map of category counts
    const countMap = categoryCounts.reduce((acc, cat) => {
      acc[cat.category] = cat._count.category;
      return acc;
    }, {} as Record<string, number>);

    // Return all predefined categories with their counts (0 if no communities exist)
    const formattedCategories = predefinedCategories.map(category => ({
      name: category,
      count: countMap[category] || 0
    }));

    res.json({ categories: formattedCategories });

  } catch (error) {
    console.error("Get community categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};