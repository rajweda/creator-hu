import { Request, Response } from "express";
import { findUserByName, createUser } from "../services/userService";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { ValidationError, AuthError, ConflictError } from "../errors";
import { z } from "zod";
import config from "../config";
import { RegisterUserDTO } from "../types";
import { AuthRequest } from "../middleware/authenticate";
import multer = require("multer");
import * as path from "path";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
// All imports are valid. If error persists, check for missing dependencies or type mismatches.

const prisma = new PrismaClient();

const loginSchema = z.object({
  name: z.string().min(1, "Missing or invalid 'name'"),
  password: z.string().min(1, "Missing or invalid 'password'")
});

const registerSchema = z.object({
  name: z.string().min(1, "Missing or invalid 'name'"),
  password: z.string().min(1, "Missing or invalid 'password'"),
  tags: z.array(z.string()).optional()
});

/**
 * Logs in a user and returns a JWT token.
 * @param req Express request object
 * @param res Express response object
 * @returns JSON with user info and JWT token
 */
/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Log in a user and return a JWT token
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication error
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    loginSchema.parse(req.body);
    const { name, password } = req.body;
    const user = await findUserByName(name);
    if (!user || !user.password) {
      throw new AuthError("User not found");
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthError("Invalid password");
    }
    const token = jwt.sign({ userId: user.id, name: user.name }, config.JWT_SECRET, { expiresIn: "1h" });
    const safeUser = {
      id: user.id,
      name: user.name,
      createdAt: user.createdAt
    };
    res.json({ user: safeUser, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
    } else if (err instanceof ValidationError || err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

/**
 * Registers a new user and returns a JWT token.
 * @param req Express request object
 * @param res Express response object
 * @returns JSON with user info and JWT token
 */
/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user and return a JWT token
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict error (user already exists)
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    registerSchema.parse(req.body);
    const { name, password, tags }: RegisterUserDTO = req.body;
    const existing = await findUserByName(name);
    if (existing) {
      throw new ConflictError("User already exists");
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({ name, password: hashed, tags });
    const token = jwt.sign({ userId: user.id, name: user.name }, config.JWT_SECRET, { expiresIn: "1h" });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
    } else if (err instanceof ValidationError || err instanceof ConflictError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        isVerifiedCreator: true,
        verificationStatus: true,
        verificationCategory: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/verification");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, `verification-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, and PDF files are allowed."));
    }
  }
});

export const uploadVerificationDocs = upload.array("documents", 10);

export const getVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        isVerifiedCreator: true,
        verificationStatus: true,
        verificationCategory: true,
        verificationDocuments: true,
        verificationSubmittedAt: true,
        verificationApprovedAt: true,
        verificationRejectedAt: true,
        verificationNotes: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get verification status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!category) {
      return res.status(400).json({ error: "Verification category is required" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "At least one verification document is required" });
    }

    // Check if user already has a pending verification
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { verificationStatus: true }
    });

    if (existingUser?.verificationStatus === "pending") {
      return res.status(400).json({ error: "Verification request already pending" });
    }

    // Store file paths
    const documentPaths = files.map(file => file.filename);

    // Update user with verification data
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        verificationStatus: "pending",
        verificationCategory: category,
        verificationDocuments: JSON.stringify(documentPaths),
        verificationSubmittedAt: new Date(),
        verificationApprovedAt: null,
        verificationRejectedAt: null,
        verificationNotes: null
      },
      select: {
        id: true,
        isVerifiedCreator: true,
        verificationStatus: true,
        verificationCategory: true,
        verificationDocuments: true,
        verificationSubmittedAt: true,
        verificationApprovedAt: true,
        verificationRejectedAt: true,
        verificationNotes: true
      }
    });

    res.json({
      message: "Verification request submitted successfully",
      verification: updatedUser
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin endpoint to approve/reject verification
export const updateVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, notes } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be approved or rejected" });
    }

    const updateData: {
      verificationStatus: string;
      verificationNotes: string | null;
      isVerifiedCreator?: boolean;
      verificationApprovedAt?: Date | null;
      verificationRejectedAt?: Date | null;
    } = {
      verificationStatus: status,
      verificationNotes: notes || null
    };

    if (status === "approved") {
      updateData.isVerifiedCreator = true;
      updateData.verificationApprovedAt = new Date();
      updateData.verificationRejectedAt = null;
    } else {
      updateData.isVerifiedCreator = false;
      updateData.verificationRejectedAt = new Date();
      updateData.verificationApprovedAt = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        name: true,
        isVerifiedCreator: true,
        verificationStatus: true,
        verificationCategory: true,
        verificationSubmittedAt: true,
        verificationApprovedAt: true,
        verificationRejectedAt: true,
        verificationNotes: true
      }
    });

    res.json({
      message: `Verification ${status} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Update verification status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin endpoint to get all pending verifications
export const getPendingVerifications = async (req: Request, res: Response) => {
  try {
    const pendingVerifications = await prisma.user.findMany({
      where: {
        verificationStatus: "pending"
      },
      select: {
        id: true,
        name: true,
        verificationCategory: true,
        verificationDocuments: true,
        verificationSubmittedAt: true
      },
      orderBy: {
        verificationSubmittedAt: "asc"
      }
    });

    res.json(pendingVerifications);
  } catch (error) {
    console.error("Get pending verifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates user profile information
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: "Display name is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { displayName: displayName.trim() },
      select: {
        id: true,
        name: true,
        displayName: true,
        createdAt: true,
        isVerifiedCreator: true
      }
    });

    res.json({ user: updatedUser, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

/**
 * Changes user password
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};