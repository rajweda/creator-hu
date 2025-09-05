import { Router, Request, Response } from "express";
import { 
  loginUser, 
  registerUser, 
  getProfile, 
  updateProfile,
  changePassword,
  getVerificationStatus, 
  submitVerification, 
  uploadVerificationDocs,
  updateVerificationStatus,
  getPendingVerifications
} from "../controllers/userController";
import { authLimiter } from "../middleware/rateLimiter";
import { authenticateToken } from "../middleware/authenticate";

const router = Router();

// Public routes
router.post("/login", authLimiter, loginUser);
router.post("/register", authLimiter, registerUser);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.get("/me", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/change-password", authenticateToken, changePassword);
router.get("/verification-status", authenticateToken, getVerificationStatus);
router.post("/submit-verification", authenticateToken, uploadVerificationDocs, submitVerification);

// Admin routes (would need admin middleware in production)
router.get("/pending-verifications", getPendingVerifications);
router.put("/verification/:userId", updateVerificationStatus);

export default router;