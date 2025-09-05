-- Database initialization script for Creator Hub
-- This script will be executed when the PostgreSQL container starts for the first time

-- Create the main database if it doesn't exist
CREATE DATABASE creator_hub;

-- Connect to the database
\c creator_hub;

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE creator_hub TO postgres;

-- Note: Prisma will handle the actual table creation through migrations
-- This script just sets up the basic database structure and extensions