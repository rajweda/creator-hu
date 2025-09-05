// User service for authentication and user management
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface CreateUserDTO {
  name: string;
  password: string;
  tags?: string; // JSON string
}

export async function findUserByName(name: string) {
  try {
    return await prisma.user.findFirst({
      where: { name }
    });
  } catch (error) {
    // Log error and throw custom error
    throw new Error("Failed to find user by name");
  }
}

export async function createUser(data: CreateUserDTO) {
  try {
    // Add business logic here (e.g., password hashing)
    const userData = {
      ...data,
      tags: data.tags || "[]" // Default to empty JSON array if tags is undefined
    };
    return await prisma.user.create({ data: userData });
  } catch (error) {
    // Log error and throw custom error
    throw new Error("Failed to create user");
  }
}