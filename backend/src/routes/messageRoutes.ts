import express from "express";
import { authenticateToken } from "../middleware/authenticate";

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/messages:
 *   get:
 *     summary: Get dashboard messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dashboard messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       read:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get("/messages", authenticateToken, async (req, res) => {
  try {
    // For now, return empty messages array
    // This can be expanded later to fetch actual messages from database
    res.json({
      messages: [],
      total: 0
    });
  } catch (error) {
    console.error("Error fetching dashboard messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;