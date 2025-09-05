import { Request, Response } from "express";
import { getAllContents, getContentById, createContent, updateContent, deleteContent, incrementContentViewCount } from "../services/contentService";
import { ContentCreateDTO, ContentUpdateDTO } from "../types";
import { z } from "zod";

const contentCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sourceLink: z.string().url("Source link must be a valid URL"),
  tags: z.string().optional(),
  creatorId: z.number().int().positive("creatorId must be a positive integer")
});

const contentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  sourceLink: z.string().url().optional(),
  tags: z.string().optional()
});

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all content items
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of all content items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
export const getContents = async (req: Request, res: Response) => {
  try {
    const contents = await getAllContents();
    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contents" });
  }
};

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get a content item by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the content to get
 *     responses:
 *       200:
 *         description: Content item found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
 */
export const getContent = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const content = await getContentById(id);
    if (!content) return res.status(404).json({ error: "Content not found" });

    // Anti-abuse: Only increment view count if not viewed by same IP in last 10 min
    const cacheKey = `content_${id}_ip_${req.ip}`;
    const globalCache = global as typeof global & { [key: string]: number };
    const lastViewed = globalCache[cacheKey];
    const now = Date.now();
    if (!lastViewed || now - lastViewed > 10 * 60 * 1000) {
      await incrementContentViewCount(id);
      globalCache[cacheKey] = now;
    }

    // Return updated content
    const updatedContent = await getContentById(id);
    res.json(updatedContent);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch content" });
  }
};

/**
 * @swagger
 * /api/content:
 *   post:
 *     summary: Create a new content item
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentCreateDTO'
 *     responses:
 *       201:
 *         description: Content created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Validation error
 */
export const createContentHandler = async (req: Request, res: Response) => {
  try {
    const parseResult = contentCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }
    const { title, sourceLink, tags, creatorId }: ContentCreateDTO = parseResult.data;
    const content = await createContent({ title, sourceLink, tags, creatorId });
    res.status(201).json(content);
  } catch (err) {
    res.status(500).json({ error: "Failed to create content" });
  }
};

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update a content item
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the content to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentUpdateDTO'
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Validation error
 */
export const updateContentHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const parseResult = contentUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }
    const { title, sourceLink, tags }: ContentUpdateDTO = parseResult.data;
    const content = await updateContent(id, { title, sourceLink, tags });
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: "Failed to update content" });
  }
};

/**
 * @swagger
 * /api/content/{id}:
 *   delete:
 *     summary: Delete a content item
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the content to delete
 *     responses:
 *       204:
 *         description: Content deleted successfully
 */
export const deleteContentHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteContent(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete content" });
  }
};