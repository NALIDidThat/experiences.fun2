import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiProfilesTable = pgTable("ai_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => usersTable.id).unique(),
  preference_summary: text("preference_summary").notNull(),
  last_updated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export type AiProfile = typeof aiProfilesTable.$inferSelect;
