import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const profilesTable = pgTable("skillbridge_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  skills: text("skills").array().notNull(),
  weeklyGoalHours: integer("weekly_goal_hours").notNull().default(5),
  timezone: text("timezone").notNull().default("Asia/Calcutta"),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true });
export type Profile = typeof profilesTable.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;