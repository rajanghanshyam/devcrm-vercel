import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
  },
});
