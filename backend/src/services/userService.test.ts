import { findUserByName, createUser } from "./userService";
import { PrismaClient } from "@prisma/client";

const mPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn()
  }
};

jest.mock("@prisma/client", () => {
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const mockUser = { id: 1, name: "testuser", password: "hashedpass" };

describe("userService", () => {
  let prisma: typeof mPrisma;

  beforeEach(() => {
    prisma = mPrisma;
    prisma.user.findFirst.mockReset();
    prisma.user.create.mockReset();
  });

  it("findUserByName returns null when user not found", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const user = await findUserByName("nouser");
    expect(user).toBeNull();
  });

  it("findUserByName returns user when found", async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    const user = await findUserByName("testuser");
    expect(user).toEqual(mockUser);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { name: "testuser" } });
  });

  it("findUserByName throws error on failure", async () => {
    prisma.user.findFirst.mockRejectedValue(new Error("DB error"));
    await expect(findUserByName("testuser")).rejects.toThrow("Failed to find user by name");
  });

  it("createUser returns created user", async () => {
    prisma.user.create.mockResolvedValue(mockUser);
    const user = await createUser({ name: "testuser", password: "hashedpass" });
    expect(user).toEqual(mockUser);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { name: "testuser", password: "hashedpass" } });
  });

  it("createUser throws error if missing password", async () => {
    prisma.user.create.mockRejectedValue(new Error("Missing password"));
    await expect(createUser({ name: "testuser", password: "testpass" })).rejects.toThrow("Failed to create user");
  });

  it("createUser throws error on failure", async () => {
    prisma.user.create.mockRejectedValue(new Error("DB error"));
    await expect(createUser({ name: "testuser", password: "testpass" })).rejects.toThrow("Failed to create user");
  });
});