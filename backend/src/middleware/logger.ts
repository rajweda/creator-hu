import pino from "pino";
import { Request, Response, NextFunction } from "express";

const logger = pino({ level: "info" });

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  logger.info({ method: req.method, url: req.url, body: req.body, query: req.query }, "Incoming request");
  next();
}

export default logger;