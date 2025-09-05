const ffmpeg = require("fluent-ffmpeg");
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  suffix: string;
}

export const VIDEO_QUALITIES: VideoQuality[] = [
  { name: "480p", width: 854, height: 480, bitrate: "1000k", suffix: "_480p" },
  { name: "720p", width: 1280, height: 720, bitrate: "2500k", suffix: "_720p" },
  { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", suffix: "_1080p" }
];

export interface VideoMetadata {
  duration: number;
  size: number;
  format: string;
  codec: string;
  width: number;
  height: number;
  bitrate: number;
}

export interface QualityResult {
  quality: string;
  path: string;
  size: number;
  duration: number;
}

export interface ProcessingResult {
  originalPath: string;
  qualities: {
    quality: string;
    path: string;
    size: number;
    duration: number;
  }[];
  thumbnail: string;
  metadata: {
    duration: number;
    originalSize: number;
    format: string;
    codec: string;
  };
}

class VideoProcessingService {
  private uploadsDir: string;
  private processedDir: string;
  private thumbnailsDir: string;

  constructor() {
    this.uploadsDir = path.join(__dirname, "../../uploads/videos");
    this.processedDir = path.join(__dirname, "../../uploads/processed");
    this.thumbnailsDir = path.join(__dirname, "../../uploads/thumbnails");
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [this.uploadsDir, this.processedDir, this.thumbnailsDir];
    
    for (const dir of dirs) {
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  async processVideo(inputPath: string, videoId: string): Promise<ProcessingResult> {
    try {
      // Get video metadata first
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Create directories for this video
      const videoDir = path.join(this.processedDir, videoId.toString());
      await mkdir(videoDir, { recursive: true });
      
      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(inputPath, videoId);
      
      // Process different quality versions
      const qualities = await this.processQualities(inputPath, videoDir, metadata);
      
      return {
        originalPath: inputPath,
        qualities,
        thumbnail: thumbnailPath,
        metadata: {
          duration: metadata.duration,
          originalSize: metadata.size,
          format: metadata.format,
          codec: metadata.codec
        }
      };
    } catch (error) {
      console.error("Video processing error:", error);
      throw new Error(`Failed to process video: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find((stream: any) => stream.codec_type === "video");
        const format = metadata.format;
        
        resolve({
          duration: format.duration || 0,
          size: format.size || 0,
          format: format.format_name || "unknown",
          codec: videoStream?.codec_name || "unknown",
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          bitrate: format.bit_rate || 0
        });
      });
    });
  }

  private async generateThumbnail(inputPath: string, videoId: string): Promise<string> {
    const thumbnailPath = path.join(this.thumbnailsDir, `${videoId}_thumbnail.jpg`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ["10%"],
          filename: `${videoId}_thumbnail.jpg`,
          folder: this.thumbnailsDir,
          size: "320x240"
        })
        .on("end", () => {
          resolve(thumbnailPath);
        })
        .on("error", (err: Error) => {
          reject(err);
        });
    });
  }

  private async processQualities(inputPath: string, outputDir: string, metadata: VideoMetadata): Promise<QualityResult[]> {
    const results: QualityResult[] = [];
    
    // Determine which qualities to generate based on original resolution
    const originalHeight = metadata.height;
    const qualitiesToProcess = VIDEO_QUALITIES.filter(quality => quality.height <= originalHeight);
    
    // Always include at least 480p
    if (qualitiesToProcess.length === 0) {
      qualitiesToProcess.push(VIDEO_QUALITIES[0]); // 480p
    }
    
    for (const quality of qualitiesToProcess) {
      try {
        const outputPath = path.join(outputDir, `video${quality.suffix}.mp4`);
        await this.processQuality(inputPath, outputPath, quality);
        
        const stats = await stat(outputPath);
        results.push({
          quality: quality.name,
          path: outputPath,
          size: stats.size,
          duration: metadata.duration
        });
      } catch (error) {
        console.error(`Failed to process ${quality.name}:`, error);
        // Continue with other qualities even if one fails
      }
    }
    
    return results;
  }

  private async processQuality(inputPath: string, outputPath: string, quality: VideoQuality): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${quality.width}x${quality.height}`)
        .videoBitrate(quality.bitrate)
        .audioBitrate("128k")
        .format("mp4")
        .outputOptions([
          "-preset fast",
          "-crf 23",
          "-movflags +faststart", // Enable progressive download
          "-pix_fmt yuv420p"
        ])
        .output(outputPath)
        .on("end", () => {
          resolve();
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .on("progress", (progress: any) => {
          console.log(`Processing ${quality.name}: ${Math.round(progress.percent || 0)}% done`);
        })
        .run();
    });
  }

  async getVideoStream(videoPath: string, range?: string): Promise<{ stream: fs.ReadStream; start: number; end: number; total: number }> {
    const stats = await stat(videoPath);
    const total = stats.size;
    
    let start = 0;
    let end = total - 1;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    }
    
    const stream = fs.createReadStream(videoPath, { start, end });
    
    return { stream, start, end, total };
  }

  async optimizeForStreaming(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset fast",
          "-crf 23",
          "-movflags +faststart", // Move metadata to beginning for faster streaming
          "-pix_fmt yuv420p",
          "-profile:v baseline",
          "-level 3.0"
        ])
        .format("mp4")
        .output(outputPath)
        .on("end", () => {
          resolve();
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .run();
    });
  }

  async generateHLSPlaylist(inputPath: string, outputDir: string): Promise<string> {
    const playlistPath = path.join(outputDir, "playlist.m3u8");
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-codec: copy",
          "-start_number 0",
          "-hls_time 10",
          "-hls_list_size 0",
          "-f hls"
        ])
        .output(playlistPath)
        .on("end", () => {
          resolve(playlistPath);
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .run();
    });
  }

  async cleanupProcessedFiles(videoId: string): Promise<void> {
    const videoDir = path.join(this.processedDir, videoId.toString());
    const thumbnailPath = path.join(this.thumbnailsDir, `${videoId}_thumbnail.jpg`);
    
    try {
      // Remove processed video directory
      if (fs.existsSync(videoDir)) {
        fs.rmSync(videoDir, { recursive: true, force: true });
      }
      
      // Remove thumbnail
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  getVideoPath(videoId: string, quality: string = "720p"): string {
    const qualityObj = VIDEO_QUALITIES.find(q => q.name === quality) || VIDEO_QUALITIES[1];
    return path.join(this.processedDir, videoId.toString(), `video${qualityObj.suffix}.mp4`);
  }

  getThumbnailPath(videoId: string): string {
    return path.join(this.thumbnailsDir, `${videoId}_thumbnail.jpg`);
  }

  async getAvailableQualities(videoId: string): Promise<string[]> {
    const videoDir = path.join(this.processedDir, videoId.toString());
    const qualities = [];
    
    for (const quality of VIDEO_QUALITIES) {
      const videoPath = path.join(videoDir, `video${quality.suffix}.mp4`);
      if (fs.existsSync(videoPath)) {
        qualities.push(quality.name);
      }
    }
    
    return qualities;
  }
}

export default new VideoProcessingService();