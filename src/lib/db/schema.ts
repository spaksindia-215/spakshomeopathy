/**
 * Database schema types.
 *
 * MILESTONE 0 SCOPE — PLACEHOLDER
 * -------------------------------
 * This file is INTENTIONALLY a stub. Generating the real types requires a
 * live connection to a restored snapshot of the production database, which
 * is not available in the Milestone 0 environment (see Gate Report §9,
 * Outstanding Issues).
 *
 * HOW TO GENERATE (do this at the start of Milestone 1, or as soon as a
 * restored snapshot is available):
 *
 *     npm run db:codegen
 *
 * That writes `schema.generated.ts` from the LIVE database.
 *
 * CONTRACT RULES THAT GOVERN THIS FILE
 * ------------------------------------
 * - Precedence rank 5 (contract Part 3): types MUST be generated from the
 *   LIVE schema (`Database/db_newhomo.sql` restored), NEVER hand-written and
 *   NEVER derived from `database/migrations/`. The Laravel migrations cover
 *   only 7 of 34 tables and contradict the live schema for `pin_codes`
 *   (blueprint R-25). `database/migrations/` has NO authority (contract §11.1).
 *
 * - Contract F-5 / F-20: no table or column may be renamed, dropped, or
 *   normalized. All 34 tables are represented, including the 83-column
 *   `products` table with its ten inline variant slots, and including
 *   VESTIGIAL tables that are never written.
 *
 * - Misspelled column names are PRESERVED exactly as they exist in the
 *   database — e.g. `orderproducts.DelaveryDate`, `orderproducts.DelaveryBy`,
 *   `orders.qr_transection_id`, `payments.qunt`. Contract F-5.
 */

import type { Generated } from 'kysely';

/**
 * Placeholder database interface.
 *
 * Milestone 0 defines only the shape required for the connection layer to
 * type-check. It deliberately contains NO table definitions, because
 * hand-writing them would violate the precedence rule above.
 *
 * Milestone 1 replaces this import with the generated `schema.generated.ts`.
 */
export interface Database {
  /**
   * Laravel's framework bookkeeping table. Included solely so that this
   * interface is non-empty and the Kysely instance type-checks in
   * Milestone 0. It carries no application behavior.
   *
   * Live schema (Database/db_newhomo.sql):
   *   id        int(10) UNSIGNED NOT NULL  (PRIMARY KEY, AUTO_INCREMENT)
   *   migration varchar(255)     NOT NULL
   *   batch     int(11)          NOT NULL
   */
  migrations: {
    id: Generated<number>;
    migration: string;
    batch: number;
  };
}
