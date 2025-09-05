import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer = require("multer");
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";
import axios from "axios";
import videoProcessingService from "../services/videoProcessingService";

const prisma = new PrismaClient();
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.fieldname === "video") {
      const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov"];
      if (allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid video file type"));
      }
    } else if (file.fieldname === "thumbnail") {
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid thumbnail file type"));
      }
    } else {
      cb(new Error("Unexpected field"));
    }
  }
});

export const uploadMiddleware = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]);

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    name: string;
  };
}

// YouTube metadata fetching
export const getYouTubeMetadata = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "Video ID is required" });
    }

    // YouTube Data API v3 endpoint
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key not configured" });
    }

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
    );

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: "Video not found or not accessible" });
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse duration from ISO 8601 format (PT4M13S) to readable format
    const duration = parseDuration(contentDetails.duration);

    const metadata = {
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      duration: duration,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt
    };

    res.json(metadata);
  } catch (error) {
    console.error("YouTube metadata fetch error:", error);
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      res.status(403).json({ error: "YouTube API quota exceeded or invalid API key" });
    } else {
      res.status(500).json({ error: "Failed to fetch video metadata" });
    }
  }
};

// Upload YouTube video
export const uploadYouTubeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { 
      youtubeUrl, 
      videoId, 
      title, 
      description, 
      price, 
      category, 
      tags, 
      thumbnail, 
      duration, 
      channelTitle 
    } = req.body;

    // Validate required fields
    if (!youtubeUrl || !videoId || !title || !price || !category) {
      return res.status(400).json({ error: "YouTube URL, video ID, title, price, and category are required" });
    }

    // Validate price range
    const priceValue = parseFloat(price);
    if (priceValue < 10 || priceValue > 50) {
      return res.status(400).json({ error: "Price must be between ₹10 and ₹50" });
    }

    // Validate creator eligibility
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.subscriberCount >= 100) {
      return res.status(403).json({ error: "This feature is only available for creators with fewer than 100 subscribers" });
    }

    // Check if video already exists
    const existingVideo = await prisma.video.findFirst({
      where: { 
        youtubeVideoId: videoId 
      }
    });

    if (existingVideo) {
      return res.status(409).json({ error: "This YouTube video has already been uploaded" });
    }

    // Parse tags and convert to JSON string
    const tagArray = tags ? tags.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
    const tagsJson = JSON.stringify(tagArray);

    // Parse duration to seconds
    const durationInSeconds = parseDurationToSeconds(duration);

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        title,
        description: description || "",
        youtubeUrl,
        youtubeVideoId: videoId,
        thumbnailPath: thumbnail,
        duration: durationInSeconds,
        fileSize: BigInt(0), // YouTube videos don't have local file size
        mimeType: "video/youtube",
        price: priceValue,
        category,
        tags: tagsJson,
        creatorId: req.user.userId,
        channelTitle: channelTitle || ""
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      message: "YouTube video uploaded successfully",
      video: {
        ...video,
        fileSize: video.fileSize.toString(), // Convert BigInt to string for JSON
        status: "ready"
      }
    });

  } catch (error) {
    console.error("YouTube video upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to parse ISO 8601 duration to readable format
function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// Helper function to parse duration to seconds
function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(":");
  if (parts.length === 2) {
    // MM:SS format
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

export const uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Video file is required" });
    }

    const { title, description, price, category, tags } = req.body;

    // Validate required fields
    if (!title || !price || !category) {
      return res.status(400).json({ error: "Title, price, and category are required" });
    }

    // Validate price range
    const priceValue = parseFloat(price);
    if (priceValue < 10 || priceValue > 50) {
      return res.status(400).json({ error: "Price must be between ₹10 and ₹50" });
    }

    // Validate creator eligibility
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.subscriberCount >= 100) {
      return res.status(403).json({ error: "This feature is only available for creators with fewer than 100 subscribers" });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../../uploads");
    const videosDir = path.join(uploadsDir, "videos");
    const thumbnailsDir = path.join(uploadsDir, "thumbnails");

    await mkdir(uploadsDir, { recursive: true });
    await mkdir(videosDir, { recursive: true });
    await mkdir(thumbnailsDir, { recursive: true });

    // Generate unique filenames
    const timestamp = Date.now();
    const videoExtension = path.extname(videoFile.originalname);
    const videoFilename = `${timestamp}_${req.user.userId}${videoExtension}`;
    const videoPath = path.join(videosDir, videoFilename);

    let thumbnailPath = "";
    if (thumbnailFile) {
      const thumbnailExtension = path.extname(thumbnailFile.originalname);
      const thumbnailFilename = `${timestamp}_${req.user.userId}${thumbnailExtension}`;
      thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
    }

    // Save files to disk
    await writeFile(videoPath, videoFile.buffer);
    if (thumbnailFile && thumbnailPath) {
      await writeFile(thumbnailPath, thumbnailFile.buffer);
    }

    // Parse tags and convert to JSON string
    const tagArray = tags ? tags.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
    const tagsJson = JSON.stringify(tagArray);

    // Get video duration (simplified - in production, use ffprobe)
    const duration = 0; // Placeholder - implement with ffmpeg/ffprobe

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        title,
        description: description || "",
        filePath: `/uploads/videos/${videoFilename}`,
        thumbnailPath: thumbnailPath ? `/uploads/thumbnails/${path.basename(thumbnailPath)}` : null,
        duration,
        fileSize: BigInt(videoFile.size),
        mimeType: videoFile.mimetype,
        price: priceValue,
        category,
        tags: tagsJson,
        creatorId: req.user.userId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Process video in background
    processVideoAsync(video.id, videoPath);

    res.status(201).json({
      message: "Video uploaded successfully and is being processed",
      video: {
        ...video,
        fileSize: video.fileSize.toString(), // Convert BigInt to string for JSON
        status: "processing"
      }
    });

  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Background video processing
async function processVideoAsync(videoId: number, filePath: string) {
  try {
    console.log(`Starting video processing for video ${videoId}`);
    
    const result = await videoProcessingService.processVideo(filePath, videoId.toString());
    
    // Update video record with processing results
    await prisma.video.update({
      where: { id: videoId },
      data: {
        duration: Math.round(result.metadata.duration),
        thumbnailPath: result.thumbnail,
        // Store available qualities as JSON
        // Note: You might want to add a qualities field to your schema
      }
    });
    
    console.log(`Video processing completed for video ${videoId}`);
  } catch (error) {
    console.error(`Video processing failed for video ${videoId}:`, error);
    
    // Update video status to indicate processing failure
    await prisma.video.update({
      where: { id: videoId },
      data: {
        // You might want to add a status field to track processing state
      }
    });
  }
}

export const getVideos = async (req: Request, res: Response) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    interface WhereClause {
      category?: string;
      OR?: Array<{
        title?: { contains: string; mode: string };
        description?: { contains: string; mode: string };
        tags?: { contains: string; mode: string };
      }>;
    }
    
    const where: WhereClause = {};
    
    if (category) {
      where.category = category as string;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { tags: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              subscriberCount: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit)
      }),
      prisma.video.count({ where })
    ]);

    const videosWithStringFileSize = videos.map(video => ({
      ...video,
      fileSize: video.fileSize.toString()
    }));

    res.json({
      videos: videosWithStringFileSize,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVideoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const video = await prisma.video.findUnique({
      where: { id: Number(id) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            subscriberCount: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Increment view count
    await prisma.video.update({
      where: { id: Number(id) },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      ...video,
      fileSize: video.fileSize.toString()
    });

  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const videos = await prisma.video.findMany({
      where: { creatorId: req.user.userId },
      include: {
        transactions: {
          where: { status: "completed" },
          select: {
            amount: true,
            creatorEarning: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const videosWithEarnings = videos.map(video => {
      const totalEarnings = video.transactions.reduce((sum, transaction) => 
        sum + Number(transaction.creatorEarning), 0
      );
      const totalSales = video.transactions.length;

      return {
        ...video,
        fileSize: video.fileSize.toString(),
        totalEarnings,
        totalSales,
        transactions: undefined // Remove transactions from response
      };
    });

    res.json({ videos: videosWithEarnings });

  } catch (error) {
    console.error("Get my videos error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get creator earnings stats
export const getCreatorEarnings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const range = req.query.range as string || "30d";
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case "7d":
        dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case "30d":
        dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case "90d":
        dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = {};
    }

    // Get creator's videos
    const videos = await prisma.video.findMany({
      where: { creatorId: userId },
      include: {
        transactions: {
          where: {
            status: "completed",
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        }
      }
    });

    // Calculate stats
    let totalEarnings = 0;
    let totalSales = 0;
    let platformFeePaid = 0;
    
    videos.forEach(video => {
      video.transactions.forEach(transaction => {
        totalEarnings += Number(transaction.creatorEarning);
        totalSales += 1;
        platformFeePaid += Number(transaction.platformFee);
      });
    });

    // Calculate this month and last month earnings
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthTransactions = await prisma.videoTransaction.findMany({
      where: {
        video: { creatorId: userId },
        status: "completed",
        createdAt: { gte: thisMonthStart }
      }
    });

    const lastMonthTransactions = await prisma.videoTransaction.findMany({
      where: {
        video: { creatorId: userId },
        status: "completed",
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
      }
    });

    const thisMonthEarnings = thisMonthTransactions.reduce((sum, t) => sum + Number(t.creatorEarning), 0);
    const lastMonthEarnings = lastMonthTransactions.reduce((sum, t) => sum + Number(t.creatorEarning), 0);

    const stats = {
      totalEarnings,
      totalSales,
      totalVideos: videos.length,
      averageEarningPerVideo: videos.length > 0 ? totalEarnings / videos.length : 0,
      thisMonthEarnings,
      lastMonthEarnings,
      platformFeePaid
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching creator earnings:", error);
    res.status(500).json({ error: "Failed to fetch earnings data" });
  }
};

// Get creator's videos with sales data
export const getCreatorVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const videos = await prisma.video.findMany({
      where: { creatorId: userId },
      include: {
        creator: {
          select: { id: true, name: true }
        },
        transactions: {
          where: { status: "completed" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const videosWithStats = videos.map(video => ({
      id: video.id,
      title: video.title,
      price: video.price,
      createdAt: video.createdAt,
      thumbnailPath: video.thumbnailPath,
      totalSales: video.transactions.length,
      totalEarnings: video.transactions.reduce((sum, t) => sum + Number(t.creatorEarning), 0),
      viewCount: video.viewCount || 0
    }));

    res.json({ videos: videosWithStats });
  } catch (error) {
    console.error("Error fetching creator videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};

export const streamVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quality = "720p" } = req.query;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    // Check if user has purchased the video
    const purchase = await prisma.videoTransaction.findFirst({
      where: {
        buyerId: req.user!.userId,
        videoId: videoId,
        status: "completed"
      }
    });

    if (!purchase) {
      return res.status(403).json({ error: "Video not purchased" });
    }

    // Get processed video path
    const videoPath = videoProcessingService.getVideoPath(videoId.toString(), quality as string);
    
    if (!fs.existsSync(videoPath)) {
      // Fallback to original file if processed version doesn't exist
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { filePath: true }
      });
      
      if (!video || !video.filePath || !fs.existsSync(video.filePath)) {
        return res.status(404).json({ error: "Video file not found" });
      }
      
      return streamVideoFile(video.filePath, req, res);
    }

    return streamVideoFile(videoPath, req, res);
  } catch (error) {
    console.error("Stream video error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get latest public videos for homepage
export const getLatestPublicVideos = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    
    const videos = await prisma.video.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        creator: {
          select: {
            name: true
          }
        }
      }
    });

    // Convert BigInt and Decimal fields for JSON serialization
    const serializedVideos = videos.map(video => ({
      ...video,
      id: Number(video.id),
      creatorId: Number(video.creatorId),
      fileSize: video.fileSize ? Number(video.fileSize) : null,
      price: video.price ? Number(video.price) : 0
    }));

    res.json({ videos: serializedVideos });
  } catch (error) {
    console.error("Get latest public videos error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function streamVideoFile(filePath: string, req: Request, res: Response) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600"
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600"
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}