import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    displayName: string | null;
  };
}

interface CustomerInfo {
  id: number;
  name: string;
  email?: string;
}

// Mock UPI payment gateway - In production, integrate with actual UPI gateway
class UPIPaymentGateway {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async initiatePayment(amount: number, _orderId: string, _customerInfo: CustomerInfo) {
    // Simulate UPI payment initiation
    const transactionId = `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, this would call actual UPI gateway API
    return {
      success: true,
      transactionId,
      paymentUrl: `upi://pay?pa=merchant@upi&pn=CreatorHub&am=${amount}&tr=${transactionId}&tn=Video Purchase`,
      qrCode: `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">UPI QR Code\n₹${amount}\nID: ${transactionId}</text></svg>`).toString("base64")}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }

  static async verifyPayment(transactionId: string) {
    // Simulate payment verification
    // In production, this would verify with actual UPI gateway
    const isSuccess = Math.random() > 0.1; // 90% success rate for demo
    
    return {
      success: isSuccess,
      transactionId,
      status: isSuccess ? "completed" : "failed",
      timestamp: new Date()
    };
  }
}

export const initiateVideoPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: Number(videoId) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Check if user already owns this video
    const existingPurchase = await prisma.videoTransaction.findFirst({
      where: {
        videoId: Number(videoId),
        buyerId: req.user.id,
        status: "completed"
      }
    });

    if (existingPurchase) {
      return res.status(400).json({ error: "You already own this video" });
    }

    // Check if user is trying to buy their own video
    if (video.creatorId === req.user.id) {
      return res.status(400).json({ error: "You cannot purchase your own video" });
    }

    // Calculate fees
    const videoPrice = Number(video.price);
    const platformFeeRate = 0.15; // 15%
    const platformFee = Math.round(videoPrice * platformFeeRate * 100) / 100;
    const creatorEarning = videoPrice - platformFee;

    // Create pending transaction
    const transaction = await prisma.videoTransaction.create({
      data: {
        videoId: Number(videoId),
        buyerId: req.user.id,
        amount: videoPrice,
        platformFee,
        creatorEarning,
        upiTransactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: "pending"
      }
    });

    // Initiate UPI payment
    const paymentResult = await UPIPaymentGateway.initiatePayment(
      videoPrice,
      transaction.id.toString(),
      {
        id: req.user.id,
        name: req.user.name
      }
    );

    if (!paymentResult.success) {
      // Update transaction status to failed
      await prisma.videoTransaction.update({
        where: { id: transaction.id },
        data: { status: "failed" }
      });
      return res.status(500).json({ error: "Failed to initiate payment" });
    }

    // Update transaction with UPI details
    await prisma.videoTransaction.update({
      where: { id: transaction.id },
      data: {
        upiTransactionId: paymentResult.transactionId
      }
    });

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: videoPrice,
        platformFee,
        creatorEarning,
        video: {
          id: video.id,
          title: video.title,
          creator: video.creator
        }
      },
      payment: {
        transactionId: paymentResult.transactionId,
        paymentUrl: paymentResult.paymentUrl,
        qrCode: paymentResult.qrCode,
        expiresAt: paymentResult.expiresAt
      }
    });

  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyVideoPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    // Find the transaction
    const transaction = await prisma.videoTransaction.findFirst({
      where: {
        id: Number(transactionId),
        buyerId: req.user.id,
        status: "pending"
      },
      include: {
        video: {
          include: {
            creator: {
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

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found or already processed" });
    }

    // Verify payment with UPI gateway
    const verificationResult = await UPIPaymentGateway.verifyPayment(
      transaction.upiTransactionId!
    );

    if (verificationResult.success && verificationResult.status === "completed") {
      // Update transaction status to completed
      await prisma.videoTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "completed"
        }
      });

      // Update or create creator earnings record
      const existingEarnings = await prisma.creatorEarnings.findUnique({
        where: { creatorId: transaction.video.creatorId }
      });

      if (existingEarnings) {
        await prisma.creatorEarnings.update({
          where: { creatorId: transaction.video.creatorId },
          data: {
            totalEarnings: {
              increment: transaction.creatorEarning
            },
            totalSales: {
              increment: 1
            }
          }
        });
      } else {
        await prisma.creatorEarnings.create({
          data: {
            creatorId: transaction.video.creatorId,
            totalEarnings: transaction.creatorEarning,
            totalSales: 1
          }
        });
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        transaction: {
          id: transaction.id,
          status: "completed",
          amount: transaction.amount,
          video: {
            id: transaction.video.id,
            title: transaction.video.title,
            filePath: transaction.video.filePath,
            thumbnailPath: transaction.video.thumbnailPath
          }
        }
      });
    } else {
      // Update transaction status to failed
      await prisma.videoTransaction.update({
        where: { id: transaction.id },
        data: { status: "failed" }
      });

      res.status(400).json({
        success: false,
        error: "Payment verification failed",
        status: verificationResult.status
      });
    }

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserPurchases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const purchases = await prisma.videoTransaction.findMany({
      where: {
        buyerId: req.user.id,
        status: "completed"
      },
      include: {
        video: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const purchasedVideos = purchases.map(purchase => ({
      transactionId: purchase.id,
      purchaseDate: purchase.createdAt,
      amount: purchase.amount,
      video: {
        id: purchase.video.id,
        title: purchase.video.title,
        description: purchase.video.description,
        filePath: purchase.video.filePath,
        thumbnailPath: purchase.video.thumbnailPath,
        duration: purchase.video.duration,
        category: purchase.video.category,
        tags: purchase.video.tags,
        creator: purchase.video.creator
      }
    }));

    res.json({
      purchases: purchasedVideos,
      totalPurchases: purchases.length,
      totalSpent: purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0)
    });

  } catch (error) {
    console.error("Get user purchases error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { transactionId } = req.params;

    const transaction = await prisma.videoTransaction.findFirst({
      where: {
        id: Number(transactionId),
        buyerId: req.user.id
      },
      include: {
        video: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        video: transaction.video
      }
    });

  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get creator transactions
export const getCreatorTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const range = req.query.range as string || "30d";
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case "7d":
        dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case "30d":
        dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case "90d":
        dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = {};
    }

    const transactions = await prisma.videoTransaction.findMany({
      where: {
        video: { creatorId: userId },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      include: {
        video: {
          select: { id: true, title: true }
        },
        buyer: {
          select: { id: true, name: true, displayName: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      videoId: transaction.video.id,
      videoTitle: transaction.video.title,
      amount: transaction.amount,
      platformFee: transaction.platformFee,
      creatorEarning: transaction.creatorEarning,
      buyerName: transaction.buyer.displayName || transaction.buyer.name,
      createdAt: transaction.createdAt,
      status: transaction.status
    }));

    res.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Error fetching creator transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};