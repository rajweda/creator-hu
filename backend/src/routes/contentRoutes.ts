import { Router } from "express";
import { getContents, getContent, createContentHandler, updateContentHandler, deleteContentHandler } from "../controllers/contentController";
import { authenticate } from "../middleware/authenticate";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/", getContents);
router.get("/:id", getContent);
router.post("/", authLimiter, authenticate, createContentHandler);
router.put("/:id", authenticate, updateContentHandler);
router.delete("/:id", authenticate, deleteContentHandler);

export default router;