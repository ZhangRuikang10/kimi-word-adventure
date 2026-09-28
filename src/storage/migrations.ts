/** DB migrations are co-located with the schema. Version 1 creates progress, attempts, sessions and analytics stores. Future versions append non-destructive upgrade steps in db.ts. */
export const CURRENT_SCHEMA_VERSION = 1;
