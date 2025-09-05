import * as dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const DATABASE_URL = process.env.DATABASE_URL || "";
// Add other environment variables here as needed

const config = {
  JWT_SECRET,
  DATABASE_URL,
};

export default config;