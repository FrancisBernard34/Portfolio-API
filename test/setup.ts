// Load environment variables before any other imports
import { config } from 'dotenv';
import * as path from 'path';

process.env.NODE_ENV = 'test';
const result = config({ path: path.join(process.cwd(), '.env.test') });

if (!result.parsed) {
  throw new Error('Could not load test environment variables');
}

import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL?.includes('portfolio_test')) {
  throw new Error('Test database URL must include "portfolio_test"');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});
