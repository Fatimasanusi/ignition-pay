# Ignition Pay Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Ignition Pay backend and setting up the environment.

## 1. Environment Setup Instructions
Before deploying, ensure the following dependencies are installed:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- pnpm (latest)

### Environment Variables
Create a `.env` file in the `ignition-api` directory based on `.env.example`:
```bash
cp ignition-api/.env.example ignition-api/.env
```
Ensure you configure the `DATABASE_URL` and other required environment variables.

## 2. Database Setup and Configuration
Ignition Pay uses PostgreSQL with Prisma ORM for database management.

1. Ensure your PostgreSQL instance is running and create a new database.
2. Set the `DATABASE_URL` in the `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/ignition_pay?schema=public"
   ```
3. Apply database migrations to initialize the schema:
   ```bash
   cd ignition-api
   pnpm dlx prisma migrate deploy
   ```
4. (Optional) Run the database seed script to populate initial data:
   ```bash
   pnpm run seed
   ```

## 3. Backend Deployment Process
1. Install project dependencies:
   ```bash
   pnpm install
   ```
2. Build the application:
   ```bash
   cd ignition-api
   pnpm run build
   ```
3. Start the production server:
   ```bash
   pnpm run start:prod
   ```

### Production Requirements
- **OS**: Linux/Ubuntu recommended
- **RAM**: Minimum 1GB
- **Process Manager**: Use PM2 or run within a Docker container to ensure process persistence and automated restarts.
