import { Request } from "express";

export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export interface RegisterUserDTO {
  name: string;
  password: string;
  tags?: string; // JSON string
}

export interface LoginUserDTO {
  name: string;
  password: string;
}

export interface ContentCreateDTO {
  title: string;
  sourceLink: string;
  tags?: string; // JSON string
  creatorId: number;
}

export interface ContentUpdateDTO {
  title?: string;
  sourceLink?: string;
  tags?: string; // JSON string
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterUserDTO:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         password:
 *           type: string
 *
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *     LoginUserDTO:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         password:
 *           type: string
 *     ContentCreateDTO:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         sourceLink:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         creatorId:
 *           type: integer
 *     ContentUpdateDTO:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         sourceLink:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         displayName:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *     Content:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         sourceLink:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         creatorId:
 *           type: integer
 */