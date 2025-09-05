import rateLimit from "express-rate-limit";

// Rate limiting: 10 requests per minute per IP for auth and content creation endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "Too many requests from this IP, please try again after a minute."
});