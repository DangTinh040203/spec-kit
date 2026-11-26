import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env on its own; use Node's built-in loader (no dotenv dependency).
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on variables already set in the environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
