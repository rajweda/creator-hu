import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface ContentCreateDTO {
  title: string;
  sourceLink: string;
  tags?: string; // JSON string
  creatorId: number;
}

interface ContentUpdateDTO {
  title?: string;
  sourceLink?: string;
  tags?: string; // JSON string
}

export async function getAllContents() {
  try {
    return await prisma.content.findMany({
      include: { creator: true }
    });
  } catch (error) {
    throw new Error("Failed to get all contents");
  }
}

export async function getContentById(id: number) {
  try {
    return await prisma.content.findUnique({
      where: { id },
      include: { creator: true }
    });
  } catch (error) {
    throw new Error("Failed to get content by id");
  }
}

export async function createContent(data: ContentCreateDTO) {
  try {
    const contentData = {
      ...data,
      tags: data.tags || "[]" // Default to empty JSON array if tags is undefined
    };
    return await prisma.content.create({ data: contentData });
  } catch (error) {
    throw new Error("Failed to create content");
  }
}

export async function updateContent(id: number, data: ContentUpdateDTO) {
  try {
    const updateData = {
      ...data,
      tags: data.tags !== undefined ? data.tags : undefined // Keep undefined if not provided, or use provided value
    };
    return await prisma.content.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    throw new Error("Failed to update content");
  }
}

export async function deleteContent(id: number) {
  try {
    return await prisma.content.delete({
      where: { id }
    });
  } catch (error) {
    throw new Error("Failed to delete content");
  }
}

export async function incrementContentViewCount(id: number) {
  try {
    await prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });
  } catch (error) {
    throw new Error("Failed to increment view count");
  }
}