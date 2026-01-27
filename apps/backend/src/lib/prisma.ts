import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize Prisma Client with specific options to manage connections
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
};

export const prisma = global.prisma || createPrismaClient();

// Add event listeners for query logging to help debug connection issues
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Add graceful shutdown handler to properly disconnect
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
