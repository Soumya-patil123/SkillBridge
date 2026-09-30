import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const coursesTable = pgTable("skillbridge_courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  level: text("level").notNull(),
  description: text("description").notNull(),
  instructor: text("instructor").notNull(),
  instructorRole: text("instructor_role").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  lessonsCount: integer("lessons_count").notNull(),
  rating: real("rating").notNull(),
  studentsCount: integer("students_count").notNull(),
  accent: text("accent").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonsTable = pgTable("skillbridge_lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  position: integer("position").notNull(),
  type: text("type").notNull(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;