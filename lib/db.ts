import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return sql(strings, ...values) as Promise<T[]>;
}

// Re-export the tagged-template helper for direct use in route handlers
export { sql };
