import {
  getAllContents,
  getContentById,
  createContent,
  updateContent,
  deleteContent
} from "./contentService";
import { PrismaClient } from "@prisma/client";

const mPrisma = {
  content: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

jest.mock("@prisma/client", () => {
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const mockContent = { id: 1, title: "Test", sourceLink: "http://example.com", creatorId: 1 };

describe("contentService", () => {
  let prisma: typeof mPrisma;

  beforeEach(() => {
    prisma = mPrisma;
    prisma.content.findMany.mockReset();
    prisma.content.findUnique.mockReset();
    prisma.content.create.mockReset();
    prisma.content.update.mockReset();
    prisma.content.delete.mockReset();
  });

  it("getAllContents returns contents", async () => {
    prisma.content.findMany.mockResolvedValue([mockContent]);
    const contents = await getAllContents();
    expect(contents).toEqual([mockContent]);
    expect(prisma.content.findMany).toHaveBeenCalledWith({ include: { creator: true } });
  });

  it("getAllContents throws error on failure", async () => {
    prisma.content.findMany.mockRejectedValue(new Error("DB error"));
    await expect(getAllContents()).rejects.toThrow("Failed to get all contents");
  });

  it("getContentById returns content", async () => {
    prisma.content.findUnique.mockResolvedValue(mockContent);
    const content = await getContentById(1);
    expect(content).toEqual(mockContent);
    expect(prisma.content.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: { creator: true } });
  });

  it("getContentById throws error on failure", async () => {
    prisma.content.findUnique.mockRejectedValue(new Error("DB error"));
    await expect(getContentById(1)).rejects.toThrow("Failed to get content by id");
  });

  it("getContentById returns null when content not found", async () => {
    prisma.content.findUnique.mockResolvedValue(null);
    const content = await getContentById(999);
    expect(content).toBeNull();
  });

  it("createContent returns created content", async () => {
    prisma.content.create.mockResolvedValue(mockContent);
    const content = await createContent({ title: "Test", sourceLink: "http://example.com", creatorId: 1 });
    expect(content).toEqual(mockContent);
    expect(prisma.content.create).toHaveBeenCalledWith({ data: { title: "Test", sourceLink: "http://example.com", creatorId: 1 } });
  });

  it("createContent throws error on failure", async () => {
    prisma.content.create.mockRejectedValue(new Error("DB error"));
    await expect(createContent({ title: "Test", sourceLink: "http://example.com", creatorId: 1 })).rejects.toThrow("Failed to create content");
  });

  it("updateContent returns updated content", async () => {
    prisma.content.update.mockResolvedValue({ ...mockContent, title: "Updated" });
    const content = await updateContent(1, { title: "Updated" });
    expect(content).toEqual({ ...mockContent, title: "Updated" });
    expect(prisma.content.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: "Updated" } });
  });

  it("updateContent throws error on failure", async () => {
    prisma.content.update.mockRejectedValue(new Error("DB error"));
    await expect(updateContent(1, { title: "Updated" })).rejects.toThrow("Failed to update content");
  });

  it("updateContent throws error if content does not exist", async () => {
    prisma.content.update.mockRejectedValue(new Error("Content not found"));
    await expect(updateContent(999, { title: "No Content" })).rejects.toThrow("Failed to update content");
  });

  it("deleteContent returns deleted content", async () => {
    prisma.content.delete.mockResolvedValue(mockContent);
    const content = await deleteContent(1);
    expect(content).toEqual(mockContent);
    expect(prisma.content.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("deleteContent throws error on failure", async () => {
    prisma.content.delete.mockRejectedValue(new Error("DB error"));
    await expect(deleteContent(1)).rejects.toThrow("Failed to delete content");
  });

  it("deleteContent throws error if content does not exist", async () => {
    prisma.content.delete.mockRejectedValue(new Error("Content not found"));
    await expect(deleteContent(999)).rejects.toThrow("Failed to delete content");
  });
});