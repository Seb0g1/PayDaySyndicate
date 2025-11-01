import { PrismaClient } from "../generated/prisma/client";

declare const globalThis: any;
const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


