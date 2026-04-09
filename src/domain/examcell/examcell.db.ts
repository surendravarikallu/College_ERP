import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./examcell.schema";

const { Pool } = pg;

// Uses the same DATABASE_URL as Prisma — all exam cell tables live in college_erp DB
// Tables are prefixed with 'ec_' to avoid naming collisions with Prisma tables
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL must be set for ExamCell Drizzle connection.");
}

export const ecPool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

ecPool.on("error", (err) => {
  console.error("[ExamCell DB] Pool error:", err.message);
});

export const ecDb = drizzle(ecPool, { schema });
export const db = ecDb;
