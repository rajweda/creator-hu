import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";

// Interfaces
interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  userIds: number[];
}

interface MessageReaction {
  id: number;
  emoji: string;
  userId: number;
  messageId: number;
  user: {
    id: number;
    name: string;
  };
}

interface ReplyToMessage {
  id: number;
  content: string;
  sender: {
    id: number;
    name: string;
  };
}

interface MessageWithReactions {
  id: number;
  content: string;
  type: string;
  senderId: number;
  chatRoomId: number;
  replyToId?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: number;
    name: string;
  };
  replyTo?: ReplyToMessage;
  reactions: ReactionGroup[];
  _count?: {
    readBy: number;
  };
}

interface RoomFilters {
  type?: string;
  category?: string;
}

interface MessageReaction {
  id: number;
  emoji: string;
  userId: number;
  user: {
    id: number;
    name: string;
  };
}

const prisma = new PrismaClient();

// Validation schemas
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["topic", "region"]),
  category: z.string().min(1).max(50),
  subcategory: z.string().optional(),
  isPrivate: z.boolean().optional().default(false),
  maxUsers: z.number().min(2).max(1000).optional().default(100)
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(["text", "image", "file"]).optional().default("text"),
  replyToId: z.number().optional()
});

const sendDirectMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(["text", "image", "file"]).optional().default("text"),
  recipientId: z.number()
});

/**
 * @swagger
 * /api/chat/rooms:
 *   get:
 *     summary: Get all chat rooms
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [topic, region]
 *         description: Filter rooms by type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter rooms by category
 *     responses:
 *       200:
 *         description: List of chat rooms
 */
export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const { type, category } = req.query;
    
    const where: RoomFilters = {};
    if (type) where.type = type as string;
    if (category) where.category = category as string;
    
    const rooms = await prisma.chatRoom.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          where: {
            status: "online"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            participants: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
};

/**
 * @swagger
 * /api/chat/rooms:
 *   post:
 *     summary: Create a new chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [topic, region]
 *               category:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *               maxUsers:
 *                 type: number
 *     responses:
 *       201:
 *         description: Chat room created successfully
 */
export const createChatRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createRoomSchema.parse(req.body);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const room = await prisma.chatRoom.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        subcategory: validatedData.subcategory,
        isPrivate: validatedData.isPrivate || false,
        maxUsers: validatedData.maxUsers || 100,
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Add creator as first participant
    await prisma.userPresence.create({
      data: {
        userId,
        chatRoomId: room.id,
        status: "online"
      }
    });
    
    res.status(201).json(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error creating chat room:", error);
    res.status(500).json({ error: "Failed to create chat room" });
  }
};

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   get:
 *     summary: Get messages from a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of messages
 */
export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const messages = await prisma.message.findMany({
      where: {
        chatRoomId: roomId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            readBy: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });
    
    // Transform messages to group reactions by emoji
    const transformedMessages: MessageWithReactions[] = messages.reverse().map(message => {
      // Group reactions by emoji
      const reactionGroups = (message.reactions as MessageReaction[]).reduce((groups: Record<string, ReactionGroup>, reaction: MessageReaction) => {
        const emoji = reaction.emoji;
        if (!groups[emoji]) {
          groups[emoji] = {
            emoji,
            count: 0,
            users: [],
            userIds: []
          };
        }
        groups[emoji].count++;
        groups[emoji].users.push(reaction.user.name);
        groups[emoji].userIds.push(reaction.user.id);
        return groups;
      }, {});
      
      return {
        ...message,
        replyToId: message.replyToId || undefined,
        fileUrl: message.fileUrl || undefined,
        fileName: message.fileName || undefined,
        fileSize: message.fileSize || undefined,
        replyTo: message.replyTo || undefined,
        reactions: Object.values(reactionGroups)
      };
    });
    
    res.json(transformedMessages);
  } catch (error) {
    console.error("Error fetching room messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   post:
 *     summary: Send a message to a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *               replyToId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
export const sendRoomMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const validatedData = sendMessageSchema.parse(req.body);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Check if user is in the room
    const userPresence = await prisma.userPresence.findUnique({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId: roomId
        }
      }
    });
    
    if (!userPresence) {
      return res.status(403).json({ error: "User not in this chat room" });
    }
    
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        type: validatedData.type || "text",
        replyToId: validatedData.replyToId,
        senderId: userId,
        chatRoomId: roomId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * @swagger
 * /api/chat/rooms/{roomId}/join:
 *   post:
 *     summary: Join a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully joined the room
 */
export const joinChatRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Check if room exists and has space
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: {
            participants: true
          }
        }
      }
    });
    
    if (!room) {
      return res.status(404).json({ error: "Chat room not found" });
    }
    
    if (room._count.participants >= room.maxUsers) {
      return res.status(400).json({ error: "Chat room is full" });
    }
    
    // Create or update user presence
    const presence = await prisma.userPresence.upsert({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId: roomId
        }
      },
      update: {
        status: "online",
        lastSeen: new Date()
      },
      create: {
        userId,
        chatRoomId: roomId,
        status: "online"
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
    
    res.json({ message: "Successfully joined the room", presence });
  } catch (error) {
    console.error("Error joining chat room:", error);
    res.status(500).json({ error: "Failed to join chat room" });
  }
};

/**
 * @swagger
 * /api/chat/rooms/{roomId}/leave:
 *   post:
 *     summary: Leave a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully left the room
 */
export const leaveChatRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    await prisma.userPresence.update({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId: roomId
        }
      },
      data: {
        status: "offline",
        lastSeen: new Date()
      }
    });
    
    res.json({ message: "Successfully left the room" });
  } catch (error) {
    console.error("Error leaving chat room:", error);
    res.status(500).json({ error: "Failed to leave chat room" });
  }
};

/**
 * @swagger
 * /api/chat/direct:
 *   get:
 *     summary: Get direct message conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of direct message conversations
 */
export const getDirectMessageConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Get unique conversations with latest message
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT ON (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id))
        dm.*,
        sender.name as sender_name,
        sender.display_name as sender_display_name,
        recipient.name as recipient_name,
        recipient.display_name as recipient_display_name
      FROM "DirectMessage" dm
      JOIN "User" sender ON dm.sender_id = sender.id
      JOIN "User" recipient ON dm.recipient_id = recipient.id
      WHERE dm.sender_id = ${userId} OR dm.recipient_id = ${userId}
      ORDER BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), dm.created_at DESC
    `;
    
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching direct message conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/**
 * @swagger
 * /api/chat/direct/{userId}:
 *   get:
 *     summary: Get direct messages with a specific user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of direct messages
 */
export const getDirectMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const currentUserId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!currentUserId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId }
        ]
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
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });
    
    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    res.status(500).json({ error: "Failed to fetch direct messages" });
  }
};

/**
 * @swagger
 * /api/chat/direct:
 *   post:
 *     summary: Send a direct message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - recipientId
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *               recipientId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Direct message sent successfully
 */
export const sendDirectMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = sendDirectMessageSchema.parse(req.body);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: validatedData.recipientId },
      select: { id: true }
    });
    
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }
    
    const message = await prisma.directMessage.create({
      data: {
        content: validatedData.content,
        type: validatedData.type || "text",
        senderId: userId,
        recipientId: validatedData.recipientId
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
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error sending direct message:", error);
    res.status(500).json({ error: "Failed to send direct message" });
  }
};

/**
 * @swagger
 * /api/chat/users:
 *   get:
 *     summary: Get all users for direct messaging
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    
    if (!currentUserId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId } // Exclude current user
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        createdAt: true
      },
      orderBy: {
        displayName: "asc"
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

/**
 * @swagger
 * /api/chat/users/online:
 *   get:
 *     summary: Get list of online users
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: integer
 *         description: Filter by specific room
 *     responses:
 *       200:
 *         description: List of online users
 */
export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
    
    const where: {
      status: string;
      chatRoomId?: number;
    } = {
      status: "online"
    };
    
    if (roomId) {
      where.chatRoomId = roomId;
    }
    
    const onlineUsers = await prisma.userPresence.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isVerifiedCreator: true
          }
        },
        chatRoom: roomId ? undefined : {
          select: {
            id: true,
            name: true,
            type: true,
            category: true
          }
        }
      },
      orderBy: {
        lastSeen: "desc"
      }
    });
    
    res.json(onlineUsers);
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
};

/**
 * Upload a file to chat
 */
export const uploadChatFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, replyToId } = req.body;
    const file = req.file;
    const userId = req.user?.id;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }
    
    // Create the message with file information
    const message = await prisma.message.create({
      data: {
        content: file.originalname,
        type: "file",
        senderId: userId,
        chatRoomId: parseInt(roomId),
        replyToId: replyToId ? parseInt(replyToId) : null,
        fileUrl: `/uploads/chat/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size
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
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                name: true,
                displayName: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
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
    
    // Transform reactions to grouped format
    const reactionGroups = message.reactions.reduce((groups: Record<string, ReactionGroup>, reaction: MessageReaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) {
        groups[emoji] = {
          emoji,
          count: 0,
          users: [],
          userIds: []
        };
      }
      groups[emoji].count++;
      groups[emoji].users.push(reaction.user.name);
      groups[emoji].userIds.push(reaction.userId);
      return groups;
    }, {});
    
    const transformedMessage: MessageWithReactions = {
      ...message,
      replyToId: message.replyToId || undefined,
      fileUrl: message.fileUrl || undefined,
      fileName: message.fileName || undefined,
      fileSize: message.fileSize || undefined,
      replyTo: message.replyTo || undefined,
      reactions: Object.values(reactionGroups)
    };
    
    res.json({
      message: "File uploaded successfully",
      data: transformedMessage
    });
  } catch (error) {
    console.error("Error uploading chat file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};