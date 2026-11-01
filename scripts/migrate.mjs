import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(__dirname, "../db/migrations");
const isCheckOnly = process.argv.includes("--check");

function splitStatements(source) {
  const statements = [];
  let statement = "";
  let quote = null;
  let dollarQuote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (lineComment) {
      statement += character;
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      statement += character;
      if (character === "*" && nextCharacter === "/") {
        statement += nextCharacter;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (dollarQuote) {
      if (source.startsWith(dollarQuote, index)) {
        statement += dollarQuote;
        index += dollarQuote.length - 1;
        dollarQuote = null;
      } else {
        statement += character;
      }
      continue;
    }
    if (quote) {
      statement += character;
      if (character === quote) {
        if (nextCharacter === quote) {
          statement += nextCharacter;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "-" && nextCharacter === "-") {
      statement += character + nextCharacter;
      index += 1;
      lineComment = true;
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      statement += character + nextCharacter;
      index += 1;
      blockComment = true;
      continue;
    }
    if (character === "'" || character === '"') {
      statement += character;
      quote = character;
      continue;
    }
    if (character === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        statement += match[0];
        index += match[0].length - 1;
        dollarQuote = match[0];
        continue;
      }
    }
    if (character === ";") {
      if (statement.trim()) statements.push(statement.trim());
      statement = "";
      continue;
    }
    statement += character;
  }

  if (quote || dollarQuote || blockComment) {
    throw new Error("Migration contains an unclosed SQL quote or comment.");
  }
  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

function loadMigrations() {
  const filenames = readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const seenVersions = new Set();

  return filenames.map((filename) => {
    const match = filename.match(/^(\d{3,})_([a-z0-9][a-z0-9_-]*)\.sql$/i);
    if (!match) throw new Error(`Migration filename must use NNN_description.sql: ${filename}`);
    const [, version, name] = match;
    if (seenVersions.has(version)) throw new Error(`Duplicate migration version: ${version}`);
    seenVersions.add(version);

    const source = readFileSync(join(migrationsDirectory, filename), "utf8");
    const statements = splitStatements(source);
    if (statements.length === 0) throw new Error(`Migration is empty: ${filename}`);

    return {
      version,
      name,
      filename,
      statements,
      checksum: createHash("sha256").update(source).digest("hex"),
    };
  });
}

const migrations = loadMigrations();
if (isCheckOnly) {
  console.log(`Migration check OK: ${migrations.length} file(s).`);
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");
const sql = neon(databaseUrl);

await sql(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    name text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const appliedRows = await sql`
  SELECT version, checksum FROM schema_migrations ORDER BY version
`;
const applied = new Map(appliedRows.map((row) => [row.version, row.checksum]));

for (const migration of migrations) {
  const existingChecksum = applied.get(migration.version);
  if (existingChecksum && existingChecksum !== migration.checksum) {
    throw new Error(`Migration ${migration.filename} was changed after it was applied. Create a new migration instead.`);
  }
}

const baseline = migrations[0];
if (applied.size === 0 && baseline?.version === "001") {
  const [legacyDatabase] = await sql`SELECT to_regclass('public.sessions') AS sessions_table`;
  if (legacyDatabase.sessions_table) {
    await sql`
      INSERT INTO schema_migrations (version, name, checksum)
      VALUES (${baseline.version}, ${baseline.name}, ${baseline.checksum})
    `;
    applied.set(baseline.version, baseline.checksum);
    console.log(`→ Marked existing database as baseline ${baseline.filename}`);
  }
}

for (const migration of migrations) {
  if (applied.has(migration.version)) continue;
  console.log(`→ Applying ${migration.filename}`);
  await sql.transaction((transaction) => [
    ...migration.statements.map((statement) => transaction(statement)),
    transaction(
      "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
      [migration.version, migration.name, migration.checksum]
    ),
  ]);
}

const [result] = await sql`
  SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1
`;
console.log(`Migration run complete. Latest: ${result.version}_${result.name} (${result.applied_at}).`);
