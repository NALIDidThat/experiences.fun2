import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const experiencesTable = pgTable("experiences", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  date: text("date").notNull(),
  max_participants: integer("max_participants"),
  xp_reward: integer("xp_reward").notNull().default(100),
  status: text("status").notNull().default("active"),
  creator_id: integer("creator_id").notNull().references(() => usersTable.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Experience = typeof experiencesTable.$inferSelect;
