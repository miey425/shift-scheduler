import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as drizzleSql } from "drizzle-orm";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof createDb> | undefined;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function createDb() {
  const client = neon(getDatabaseUrl());

  return drizzle(client, { schema });
}

export function getDb() {
  dbInstance ??= createDb();
  return dbInstance;
}

export async function checkDatabaseConnection() {
  try {
    await getDb().execute(drizzleSql`select 1`);

    return {
      ok: true,
      message: "Database connection succeeded",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message === "DATABASE_URL is not set"
        ? error.message
        : "Database connection failed";

    return {
      ok: false,
      message,
      checkedAt: new Date().toISOString(),
    };
  }
}
