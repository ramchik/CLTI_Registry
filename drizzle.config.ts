import type { Config } from 'drizzle-kit';

export default {
  schema: './src/main/database/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './registry.db',
  },
} satisfies Config;
