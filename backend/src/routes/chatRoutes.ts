import express from "express";
import multer from "multer";
import {
  getChatRooms,
  createChatRoom,
  getRoomMessages,
  sendRoomMessage,
  joinChatRoom,
  leaveChatRoom,
  getDirectMessageConversations,
  getDirectMessages,
  sendDirectMessage,
  getAllUsers,
  getOnlineUsers,
  uploadChatFile
} from "../controllers/chatController";
import { authenticateToken } from "../middleware/auth";

// Configure multer for chat file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/chat/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = express.Router();

// Chat room routes
router.get("/rooms", authenticateToken, getChatRooms);
router.post("/rooms", authenticateToken, createChatRoom);
router.get("/rooms/:roomId/messages", authenticateToken, getRoomMessages);
router.post("/rooms/:roomId/messages", authenticateToken, sendRoomMessage);
router.post("/rooms/:roomId/join", authenticateToken, joinChatRoom);
router.post("/rooms/:roomId/leave", authenticateToken, leaveChatRoom);

// Direct message routes
router.get("/direct", authenticateToken, getDirectMessageConversations);
router.get("/direct/:userId", authenticateToken, getDirectMessages);
router.post("/direct", authenticateToken, sendDirectMessage);

// User routes
router.get("/users", authenticateToken, getAllUsers);
router.get("/users/online", authenticateToken, getOnlineUsers);

// File upload route
router.post("/upload", authenticateToken, upload.single("file"), uploadChatFile);

export default router;