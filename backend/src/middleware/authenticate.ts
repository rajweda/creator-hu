import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    name: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number; name: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Alias for backward compatibility
export const authenticateToken = authenticate;