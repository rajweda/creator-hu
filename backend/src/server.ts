const express = require("express");
const http = require("http");
import { Server as SocketIOServer } from "socket.io";
const multer = require("multer");
const path = require("path");
const cors = require("cors");
import { Request, Response } from "express";
import { MulterRequest } from "./types";
import userRoutes from "./routes/userRoutes";
import contentRoutes from "./routes/contentRoutes";
import videoRoutes from "./routes/videoRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatRoutes from "./routes/chatRoutes";
import communityRoutes from "./routes/communityRoutes";
import feedRoutes from "./routes/feedRoutes";
const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Type definitions
interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  userIds: number[];
}

interface Reaction {
  id: number;
  emoji: string;
  userId: number;
  messageId: number;
  user: {
    id: number;
    name: string;
    displayName: string | null;
  };
}

// Extend Socket interface to include userId
declare module "socket.io" {
  interface Socket {
    userId?: number;
  }
}

const app = express();

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(requestLogger);

// Serve static files for uploaded videos and thumbnails
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const upload = multer({ dest: "uploads/" });

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Creator Hub API",
    version: "1.0.0",
    description: "API documentation for Creator Hub backend."
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local server"
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"]
};

const swaggerSpec = swaggerJSDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.post("/api/upload", upload.single("file"), (req: MulterRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Backend health check
 *     responses:
 *       200:
 *         description: Backend running message
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
app.get("/", (req: Request, res: Response) => {
  res.send("Creator Hub Backend Running");
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the application and its dependencies
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: number
 *       503:
 *         description: Application is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get("/health", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: {
      status: "unknown",
      responseTime: 0
    }
  };

  const errors: string[] = [];

  try {
    // Test database connection
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.database.status = "connected";
    healthCheck.database.responseTime = Date.now() - dbStartTime;
  } catch (error) {
    healthCheck.database.status = "disconnected";
    errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check if there are any critical errors
  if (errors.length > 0) {
    return res.status(503).json({
      status: "unhealthy",
      timestamp: healthCheck.timestamp,
      errors
    });
  }

  res.status(200).json(healthCheck);
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe endpoint
 *     description: Returns whether the application is ready to serve traffic
 *     responses:
 *       200:
 *         description: Application is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not ready
 */
app.get("/health/ready", async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      reason: "Database not accessible"
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe endpoint
 *     description: Returns whether the application is alive (basic health check)
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/health/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Socket.IO chat functionality
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  let currentUserId: number | null = null;

  // Authenticate socket connection
  socket.on("authenticate", async (data) => {
    try {
      const { userId } = data;
      currentUserId = userId;
      socket.userId = userId;
      
      // Update user presence to online
      await prisma.userPresence.updateMany({
        where: { userId },
        data: { 
          status: "online",
          lastSeen: new Date()
        }
      });
      
      // Notify all rooms about user coming online
      const userPresences = await prisma.userPresence.findMany({
        where: { userId },
        select: { chatRoomId: true }
      });
      
      userPresences.forEach((presence: { chatRoomId: number | null }) => {
        if (presence.chatRoomId) {
          socket.to(`room_${presence.chatRoomId}`).emit("user_online", {
            userId,
            status: "online",
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Join user's personal room for direct messages
      socket.join(`user_${userId}`);
      
      socket.emit("authenticated", { success: true });
      console.log(`User ${userId} authenticated with socket ${socket.id} and joined personal room`);
    } catch (error) {
      console.error("Socket authentication error:", error);
      socket.emit("authentication_error", { error: "Authentication failed" });
    }
  });

  // Join a chat room
  socket.on("join_room", async (data) => {
    try {
      const { roomId, userId } = data;
      
      // Verify user is authenticated and can join room
      if (!userId || userId !== currentUserId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }
      
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { _count: { select: { participants: true } } }
      });
      
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }
      
      if (room._count.participants >= room.maxUsers) {
        socket.emit("error", { message: "Room is full" });
        return;
      }
      
      // Join socket room
      socket.join(`room_${roomId}`);
      
      // Update user presence
      await prisma.userPresence.upsert({
        where: {
          userId_chatRoomId: { userId, chatRoomId: roomId }
        },
        update: {
          status: "online",
          lastSeen: new Date()
        },
        create: {
          userId,
          chatRoomId: roomId,
          status: "online"
        }
      });
      
      // Notify room about new user
      socket.to(`room_${roomId}`).emit("user_joined", {
        userId,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`User ${userId} joined room: ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Handle sending messages to rooms
  socket.on("send_room_message", async (data) => {
    try {
      const { roomId, content, type = "text", replyToId } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Verify user is in the room
      const userPresence = await prisma.userPresence.findUnique({
        where: {
          userId_chatRoomId: {
            userId: currentUserId,
            chatRoomId: roomId
          }
        }
      });
      
      if (!userPresence) {
        socket.emit("error", { message: "Not in this room" });
        return;
      }
      
      // Save message to database
      const message = await prisma.message.create({
        data: {
          content,
          type,
          senderId: currentUserId,
          chatRoomId: roomId,
          replyToId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  displayName: true
                }
              }
            }
          }
        }
      });
      
      // Send message to all users in the room
      io.to(`room_${roomId}`).emit("receive_room_message", message);
      
      console.log(`Message sent to room ${roomId}:`, message.id);
    } catch (error) {
      console.error("Error sending room message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle direct message typing
  socket.on("typing_dm", async (data) => {
    try {
      const { recipientId, isTyping } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Send typing indicator to recipient
      const recipientSockets = await io.in(`user_${recipientId}`).fetchSockets();
      if (recipientSockets.length > 0) {
        io.to(`user_${recipientId}`).emit("user_typing_dm", {
          userId: currentUserId,
          isTyping
        });
      }
      
      console.log(`User ${currentUserId} ${isTyping ? "started" : "stopped"} typing to ${recipientId}`);
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  });

  // Handle direct messages
  socket.on("send_direct_message", async (data) => {
    try {
      const { recipientId, content, type = "text" } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Save direct message to database
      const message = await prisma.directMessage.create({
        data: {
          content,
          type,
          senderId: currentUserId,
          recipientId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          }
        }
      });
      
      // Send to recipient if they're online
      const recipientSockets = await io.in(`user_${recipientId}`).fetchSockets();
      if (recipientSockets.length > 0) {
        io.to(`user_${recipientId}`).emit("receive_direct_message", message);
      }
      
      // Confirm to sender
      socket.emit("direct_message_sent", message);
      
      console.log(`Direct message sent from ${currentUserId} to ${recipientId}`);
    } catch (error) {
      console.error("Error sending direct message:", error);
      socket.emit("error", { message: "Failed to send direct message" });
    }
  });

  // Leave a chat room
  socket.on("leave_room", async (data) => {
    try {
      const { roomId } = data;
      
      if (!currentUserId) return;
      
      socket.leave(`room_${roomId}`);
      
      // Update user presence
      await prisma.userPresence.updateMany({
        where: {
          userId: currentUserId,
          chatRoomId: roomId
        },
        data: {
          status: "offline",
          lastSeen: new Date()
        }
      });
      
      // Notify room about user leaving
      socket.to(`room_${roomId}`).emit("user_left", {
        userId: currentUserId,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`User ${currentUserId} left room: ${roomId}`);
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  });

  // Handle user typing indicator
  socket.on("typing", async (data) => {
    try {
      const { roomId, isTyping } = data;
      
      if (!currentUserId) return;
      
      socket.to(`room_${roomId}`).emit("user_typing", {
        userId: currentUserId,
        roomId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  });

  // WebRTC signaling for voice/video calls
  socket.on("call_user", (data) => {
    const { room, signal, from, video } = data;
    socket.to(room).emit("call_user", {
      signal,
      from,
      video,
      callerId: socket.id
    });
    console.log(`Call initiated in room ${room} by ${from}`);
  });

  socket.on("accept_call", (data) => {
    const { room, signal } = data;
    socket.to(room).emit("call_accepted", signal);
    console.log(`Call accepted in room ${room}`);
  });

  socket.on("end_call", (data) => {
    const { room } = data;
    socket.to(room).emit("call_ended");
    console.log(`Call ended in room ${room}`);
  });

  // Message reactions
  socket.on("add_reaction", async (data) => {
    try {
      const { messageId, emoji } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Save reaction to database
      const reaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId: currentUserId,
          emoji
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          },
          message: {
            select: {
              chatRoomId: true
            }
          }
        }
      });
      
      // Get updated reaction groups for this message
      const allReactions = await prisma.messageReaction.findMany({
        where: { messageId },
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
      
      // Group reactions by emoji
      interface ReactionGroup {
        emoji: string;
        count: number;
        users: string[];
        userIds: number[];
      }
      
      interface Reaction {
        emoji: string;
        user: { name: string; id: number };
      }
      
      const reactionGroups = allReactions.reduce((groups: Record<string, ReactionGroup>, r: Reaction) => {
        const emoji = r.emoji;
        if (!groups[emoji]) {
          groups[emoji] = {
            emoji,
            count: 0,
            users: [],
            userIds: []
          };
        }
        groups[emoji].count++;
        groups[emoji].users.push(r.user.name);
        groups[emoji].userIds.push(r.user.id);
        return groups;
      }, {});
      
      // Broadcast to room
      if (reaction.message.chatRoomId) {
        io.to(`room_${reaction.message.chatRoomId}`).emit("reaction_added", {
          messageId,
          reactions: Object.values(reactionGroups)
        });
      }
      
      console.log(`Reaction added to message ${messageId}`);
    } catch (error) {
      console.error("Error adding reaction:", error);
      socket.emit("error", { message: "Failed to add reaction" });
    }
  });

  socket.on("remove_reaction", async (data) => {
    try {
      const { messageId, emoji } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Remove reaction from database
      const deletedReaction = await prisma.messageReaction.deleteMany({
        where: {
          messageId,
          userId: currentUserId,
          emoji
        }
      });
      
      if (deletedReaction.count > 0) {
        // Get message to find room
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { chatRoomId: true }
        });
        
        if (message?.chatRoomId) {
          // Get updated reaction groups for this message
          const allReactions = await prisma.messageReaction.findMany({
            where: { messageId },
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
          
          // Group reactions by emoji
          const reactionGroups = allReactions.reduce((groups: Record<string, ReactionGroup>, r: Reaction) => {
            const emoji = r.emoji;
            if (!groups[emoji]) {
              groups[emoji] = {
                emoji,
                count: 0,
                users: [],
                userIds: []
              };
            }
            groups[emoji].count++;
            groups[emoji].users.push(r.user.displayName || r.user.name);
            groups[emoji].userIds.push(r.userId);
            return groups;
          }, {});
          
          io.to(`room_${message.chatRoomId}`).emit("reaction_removed", {
            messageId,
            reactions: Object.values(reactionGroups)
          });
        }
      }
      
      console.log(`Reaction removed from message ${messageId}`);
    } catch (error) {
      console.error("Error removing reaction:", error);
      socket.emit("error", { message: "Failed to remove reaction" });
    }
  });

  // Read receipts
  socket.on("mark_as_read", async (data) => {
    try {
      const { messageId } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      // Save read receipt to database
      const readReceipt = await prisma.messageRead.upsert({
        where: {
          userId_messageId: {
            userId: currentUserId,
            messageId
          }
        },
        update: {
          readAt: new Date()
        },
        create: {
          messageId,
          userId: currentUserId
        }
      });
      
      // Get the message to find the chat room
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { chatRoomId: true }
      });
      
      // Notify message sender
      if (message?.chatRoomId) {
        io.to(`room_${message.chatRoomId}`).emit("message_read", {
          messageId,
          userId: currentUserId,
          readAt: readReceipt.readAt
        });
      }
      
      console.log(`Message ${messageId} marked as read by user ${currentUserId}`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark as read" });
    }
  });

  // Handle status change
  socket.on("change_status", async (data) => {
    try {
      const { status } = data;
      
      if (!currentUserId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }
      
      if (!["online", "away", "busy"].includes(status)) {
        socket.emit("error", { message: "Invalid status" });
        return;
      }
      
      // Update user presence status
      await prisma.userPresence.updateMany({
        where: { userId: currentUserId },
        data: {
          status,
          lastSeen: new Date()
        }
      });
      
      // Notify all rooms about status change
      const userPresences = await prisma.userPresence.findMany({
        where: { userId: currentUserId },
        select: { chatRoomId: true }
      });
      
      userPresences.forEach((presence: { chatRoomId: number | null }) => {
        if (presence.chatRoomId) {
          socket.to(`room_${presence.chatRoomId}`).emit("user_status_change", {
            userId: currentUserId,
            status,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      socket.emit("status_changed", { status, timestamp: new Date().toISOString() });
      console.log(`User ${currentUserId} changed status to ${status}`);
    } catch (error) {
      console.error("Error changing status:", error);
      socket.emit("error", { message: "Failed to change status" });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    try {
      if (currentUserId) {
        // Update all user presences to offline
        await prisma.userPresence.updateMany({
          where: { userId: currentUserId },
          data: {
            status: "offline",
            lastSeen: new Date()
          }
        });
        
        // Notify all rooms about user going offline
        const userPresences = await prisma.userPresence.findMany({
          where: { userId: currentUserId },
          select: { chatRoomId: true }
        });
        
        userPresences.forEach((presence: { chatRoomId: number | null }) => {
          if (presence.chatRoomId) {
            socket.to(`room_${presence.chatRoomId}`).emit("user_offline", {
              userId: currentUserId,
              status: "offline",
              timestamp: new Date().toISOString()
            });
          }
        });
        
        console.log(`User ${currentUserId} disconnected and set to offline`);
      }
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
    
    console.log("User disconnected:", socket.id);
  });
});

// Register routes before errorHandler
app.use("/api/users", userRoutes);
app.use("/api/contents", contentRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/feed", feedRoutes);

// Move errorHandler after all routes and ensure all imports are valid
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;