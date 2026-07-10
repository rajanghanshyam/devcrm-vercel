import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let _prisma: PrismaClient | null = null;

function getPrismaInstance(): PrismaClient {
  if (!_prisma) {
    const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("WARNING: DATABASE_URL or DATABASE_URL is not defined. Initializing Prisma client without adapter.");
      _prisma = new PrismaClient({
        log: ['error', 'warn'],
      });
    } else {
      const pool = new pg.Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      _prisma = new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      });
    }
  }
  return _prisma;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = globalForPrisma.prisma || getPrismaInstance();
    if (process.env.NODE_ENV !== 'production' && !globalForPrisma.prisma) {
      globalForPrisma.prisma = instance;
    }
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

