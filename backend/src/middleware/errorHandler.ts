import { Request, Response } from "express";
import { ValidationError, AuthError, ConflictError } from "../errors";

import logger from "./logger";

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function errorHandler(err: Error, req: AuthRequest, res: Response) {
  logger.error({
    error: err,
    url: req.originalUrl,
    method: req.method,
    user: req.user || null,
    body: req.body,
    params: req.params,
    query: req.query,
  }, "Error occurred");

  if (err instanceof ValidationError || err instanceof AuthError || err instanceof ConflictError) {
    res.status(err.status).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}