import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { experiencesTable } from "./experiences";
import { usersTable } from "./users";

export const experienceParticipantsTable = pgTable("experience_participants", {
  id: serial("id").primaryKey(),
  experience_id: integer("experience_id").notNull().references(() => experiencesTable.id),
  user_id: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("joined"),
  joined_at: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  unique("experience_user_unique").on(table.experience_id, table.user_id),
]);

export type ExperienceParticipant = typeof experienceParticipantsTable.$inferSelect;
