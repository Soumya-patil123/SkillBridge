import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const enrollmentsTable = pgTable("skillbridge_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completedLessons: integer("completed_lessons").notNull().default(0),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activitiesTable = pgTable("skillbridge_activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  accent: text("accent").notNull(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, enrolledAt: true, lastActivityAt: true });
export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, occurredAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type Activity = typeof activitiesTable.$inferSelect;