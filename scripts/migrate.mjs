import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;

const sql = neon(DATABASE_URL);
const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf8");

// Split on semicolons, skip empty statements
const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  console.log("→", stmt.slice(0, 60).replace(/\n/g, " "), "...");
  await sql(stmt);
}

// Test query
const rows = await sql`SELECT current_database() AS db, now() AS ts`;
console.log("\nTest query OK:", rows[0]);
