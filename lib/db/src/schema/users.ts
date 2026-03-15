import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: text("telegram_id").unique(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  interests: text("interests").array().notNull(),
  role: text("role").notNull(),
  bio: text("bio"),
  xp: integer("xp").notNull().default(0),
  upvote_count: integer("upvote_count").notNull().default(0),
  token_interest: boolean("token_interest").notNull().default(false),
  session_token: text("session_token"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
