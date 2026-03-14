import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const upvotesTable = pgTable("upvotes", {
  id: serial("id").primaryKey(),
  from_user_id: integer("from_user_id").notNull().references(() => usersTable.id),
  to_user_id: integer("to_user_id").notNull().references(() => usersTable.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("upvote_pair_unique").on(table.from_user_id, table.to_user_id),
]);

export type Upvote = typeof upvotesTable.$inferSelect;
