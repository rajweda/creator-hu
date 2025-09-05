import { Router } from "express";
import { getPublicFeed } from "../controllers/feedController";

const router = Router();

// Public feed endpoint - no authentication required
router.get("/public", getPublicFeed);

export default router;