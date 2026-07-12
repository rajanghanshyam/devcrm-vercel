import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL && !process.env.VERCEL) {
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
}
