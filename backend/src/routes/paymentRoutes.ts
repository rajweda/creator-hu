import express from "express";
import { 
  initiateVideoPayment, 
  verifyVideoPayment, 
  getUserPurchases, 
  getPaymentStatus,
  getCreatorTransactions
} from "../controllers/paymentController";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();

// All payment routes require authentication
router.post("/initiate", authenticate, initiateVideoPayment);
router.post("/verify", authenticate, verifyVideoPayment);
router.get("/purchases", authenticate, getUserPurchases);
router.get("/status/:transactionId", authenticate, getPaymentStatus);
router.get("/creator/transactions", authenticate, getCreatorTransactions);

export default router;