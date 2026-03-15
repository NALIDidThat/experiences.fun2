import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { experiencesTable } from "./experiences";

export const experienceReflectionsTable = pgTable("experience_reflections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => usersTable.id),
  experience_id: integer("experience_id").notNull().references(() => experiencesTable.id),
  moods: text("moods").array().notNull(),
  free_text: text("free_text"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExperienceReflection = typeof experienceReflectionsTable.$inferSelect;
