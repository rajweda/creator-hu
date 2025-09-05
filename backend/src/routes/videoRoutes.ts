import { Router, Request, Response } from "express";
import { 
  uploadVideo, 
  uploadMiddleware, 
  getVideos, 
  getVideoById,
  getCreatorEarnings,
  getCreatorVideos,
  streamVideo,
  getYouTubeMetadata,
  uploadYouTubeVideo,
  getLatestPublicVideos
} from "../controllers/videoController";
import { authenticateToken, AuthRequest } from "../middleware/authenticate";
import videoProcessingService from "../services/videoProcessingService";
import * as path from "path";
import * as fs from "fs";

const router = Router();

// Public routes
router.get("/", getVideos);
router.get("/public/latest", getLatestPublicVideos);

// Protected routes
router.post("/upload", authenticateToken, uploadMiddleware, uploadVideo);
router.post("/upload-youtube", authenticateToken, uploadYouTubeVideo);
router.get("/youtube-metadata", authenticateToken, getYouTubeMetadata);

// Dynamic routes (must be after specific routes)
router.get("/:id", getVideoById);
router.get("/creator/earnings", authenticateToken, getCreatorEarnings);
router.get("/creator/videos", authenticateToken, getCreatorVideos);

// Video streaming and quality routes
router.get("/:id/stream", authenticateToken, streamVideo);
router.get("/:id/thumbnail", getThumbnail);
router.get("/:id/qualities", authenticateToken, getAvailableQualities);

// Thumbnail endpoint
async function getThumbnail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const thumbnailPath = videoProcessingService.getThumbnailPath(id);
    
    // Check if file exists
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }
    
    res.sendFile(path.resolve(thumbnailPath));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// Available qualities endpoint
async function getAvailableQualities(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const qualities = await videoProcessingService.getAvailableQualities(id);
    
    return res.json({ qualities });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default router;