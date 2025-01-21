import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Set environment to test
  process.env.NODE_ENV = 'test';

  // Load test environment variables
  config({ path: '.env.test' });

  // Clean database before all tests
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Clean database after all tests
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Disconnect Prisma
  await prisma.$disconnect();
});
