import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const mentorsTable = pgTable("skillbridge_mentors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  bio: text("bio").notNull(),
  expertise: text("expertise").array().notNull(),
  rating: real("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  sessionPrice: integer("session_price").notNull(),
  availability: text("availability").notNull(),
  accent: text("accent").notNull(),
});

export const mentorSessionsTable = pgTable("skillbridge_mentor_sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  topic: text("topic").notNull(),
  status: text("status").notNull().default("scheduled"),
});

export const insertMentorSchema = createInsertSchema(mentorsTable).omit({ id: true });
export const insertMentorSessionSchema = createInsertSchema(mentorSessionsTable).omit({ id: true });
export type Mentor = typeof mentorsTable.$inferSelect;
export type MentorSession = typeof mentorSessionsTable.$inferSelect;
export type InsertMentorSession = z.infer<typeof insertMentorSessionSchema>;