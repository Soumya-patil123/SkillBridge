import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db, activitiesTable, coursesTable, enrollmentsTable, lessonsTable, mentorSessionsTable, mentorsTable, profilesTable } from "@workspace/db";
import {
  CreateMentorSessionBody,
  CreateMentorSessionResponse,
  EnrollInCourseBody,
  EnrollInCourseParams,
  EnrollInCourseResponse,
  GetActivityResponse,
  GetCourseParams,
  GetCourseResponse,
  GetDashboardResponse,
  GetProfileResponse,
  ListCoursesQueryParams,
  ListCoursesResponse,
  ListMentorSessionsResponse,
  ListMentorsQueryParams,
  ListMentorsResponse,
  UpdateCourseProgressBody,
  UpdateCourseProgressParams,
  UpdateCourseProgressResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import { ensureSkillBridgeSeeded } from "../lib/skillbridge-seed";

const router: IRouter = Router();

function courseResponse(course: typeof coursesTable.$inferSelect, enrollment?: typeof enrollmentsTable.$inferSelect) {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    category: course.category,
    level: course.level as "beginner" | "intermediate" | "advanced",
    description: course.description,
    instructor: course.instructor,
    instructorRole: course.instructorRole,
    durationMinutes: course.durationMinutes,
    lessonsCount: course.lessonsCount,
    rating: course.rating,
    studentsCount: course.studentsCount,
    accent: course.accent,
    isFeatured: course.isFeatured,
    progress: enrollment?.progress ?? null,
    enrolled: Boolean(enrollment),
  };
}

function mentorSessionResponse(session: typeof mentorSessionsTable.$inferSelect, mentorName: string) {
  return {
    id: session.id,
    mentorId: session.mentorId,
    mentorName,
    scheduledAt: session.scheduledAt,
    topic: session.topic,
    status: session.status as "scheduled" | "completed" | "cancelled",
  };
}

router.get("/dashboard", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const profile = (await db.select().from(profilesTable).limit(1))[0];
  const courses = await db.select().from(coursesTable).orderBy(asc(coursesTable.id));
  const enrollments = await db.select().from(enrollmentsTable);
  const activities = await db.select().from(activitiesTable).orderBy(desc(activitiesTable.occurredAt)).limit(4);
  const sessions = await db.select().from(mentorSessionsTable).where(eq(mentorSessionsTable.status, "scheduled")).orderBy(asc(mentorSessionsTable.scheduledAt)).limit(1);
  const firstSession = sessions[0];
  const firstName = profile?.name.split(" ")[0] ?? "there";
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const activeCourses = enrollments.filter((enrollment) => enrollment.progress < 100);
  const completedLessons = enrollments.reduce((total, enrollment) => total + enrollment.completedLessons, 0);
  const nextSession = firstSession?.scheduledAt.toISOString() ?? null;

  const result = {
    greeting: `Good morning, ${firstName}`,
    activeCourses: activeCourses.length,
    completedLessons,
    learningHours: Number((completedLessons * 0.55 + 2.6).toFixed(1)),
    currentStreak: 3,
    weeklyActivity: [
      { day: "Mon", hours: 0.8 },
      { day: "Tue", hours: 1.4 },
      { day: "Wed", hours: 0.6 },
      { day: "Thu", hours: 1.8 },
      { day: "Fri", hours: 1.1 },
      { day: "Sat", hours: 0.4 },
      { day: "Sun", hours: 0 },
    ],
    continueLearning: activeCourses
      .map((enrollment) => {
        const course = courseById.get(enrollment.courseId);
        return course ? courseResponse(course, enrollment) : null;
      })
      .filter((course): course is NonNullable<typeof course> => course !== null),
    recentActivity: activities,
    nextSession,
  };
  res.json(GetDashboardResponse.parse(result));
});

router.get("/activity", async (_req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const activities = await db.select().from(activitiesTable).orderBy(desc(activitiesTable.occurredAt));
  res.json(GetActivityResponse.parse(activities));
});

router.get("/courses", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const parsed = ListCoursesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { query, category, level } = parsed.data;
  const filters = [];
  if (query) {
    filters.push(or(ilike(coursesTable.title, `%${query}%`), ilike(coursesTable.description, `%${query}%`)));
  }
  if (category) filters.push(eq(coursesTable.category, category));
  if (level) filters.push(eq(coursesTable.level, level));
  const courses = await db.select().from(coursesTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(coursesTable.isFeatured), asc(coursesTable.id));
  const enrollments = await db.select().from(enrollmentsTable);
  const enrollmentByCourse = new Map(enrollments.map((enrollment) => [enrollment.courseId, enrollment]));
  res.json(ListCoursesResponse.parse(courses.map((course) => courseResponse(course, enrollmentByCourse.get(course.id)))));
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const course = (await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id)).limit(1))[0];
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const enrollment = (await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id)).limit(1))[0];
  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.courseId, course.id)).orderBy(asc(lessonsTable.position));
  const completedLessons = enrollment?.completedLessons ?? 0;
  res.json(GetCourseResponse.parse({
    ...courseResponse(course, enrollment),
    lessons: lessons.map((lesson) => ({ ...lesson, completed: lesson.position <= completedLessons })),
  }));
});

router.post("/courses/:id", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const params = EnrollInCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const input = EnrollInCourseBody.safeParse(req.body ?? {});
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const course = (await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id)).limit(1))[0];
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const existing = (await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id)).limit(1))[0];
  const enrollment = existing ?? (await db.insert(enrollmentsTable).values({ courseId: course.id }).returning())[0];
  if (!enrollment) {
    res.status(500).json({ error: "Unable to create enrollment" });
    return;
  }
  if (!existing) {
    await db.insert(activitiesTable).values({
      type: "course",
      title: "Started a new course",
      description: `${course.title} is now in your learning plan.`,
      accent: course.accent,
    });
  }
  res.status(201).json(EnrollInCourseResponse.parse(enrollment));
});

router.patch("/courses/:courseId/progress", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const params = UpdateCourseProgressParams.safeParse(req.params);
  const input = UpdateCourseProgressBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const existing = (await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.courseId, params.data.courseId)).limit(1))[0];
  if (!existing) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }
  const updated = (await db.update(enrollmentsTable).set({
    progress: input.data.progress,
    completedLessons: input.data.completedLessons,
    lastActivityAt: new Date(),
  }).where(eq(enrollmentsTable.id, existing.id)).returning())[0];
  res.json(UpdateCourseProgressResponse.parse(updated));
});

router.get("/mentors", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const parsed = ListMentorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { query, expertise } = parsed.data;
  const mentors = await db.select().from(mentorsTable).orderBy(desc(mentorsTable.rating), asc(mentorsTable.id));
  const filtered = mentors.filter((mentor) => {
    const matchesQuery = !query || `${mentor.name} ${mentor.role} ${mentor.company}`.toLowerCase().includes(query.toLowerCase());
    const matchesExpertise = !expertise || mentor.expertise.some((item) => item.toLowerCase().includes(expertise.toLowerCase()));
    return matchesQuery && matchesExpertise;
  });
  res.json(ListMentorsResponse.parse(filtered));
});

router.post("/mentor-sessions", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const parsed = CreateMentorSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mentor = (await db.select().from(mentorsTable).where(eq(mentorsTable.id, parsed.data.mentorId)).limit(1))[0];
  if (!mentor) {
    res.status(404).json({ error: "Mentor not found" });
    return;
  }
  const session = (await db.insert(mentorSessionsTable).values({
    mentorId: parsed.data.mentorId,
    scheduledAt: parsed.data.scheduledAt,
    topic: parsed.data.topic,
    status: "scheduled",
  }).returning())[0];
  if (!session) {
    res.status(500).json({ error: "Unable to book session" });
    return;
  }
  await db.insert(activitiesTable).values({
    type: "mentor",
    title: "Booked a mentor session",
    description: `Your session with ${mentor.name} is ready.`,
    accent: mentor.accent,
  });
  res.status(201).json(CreateMentorSessionResponse.parse(mentorSessionResponse(session, mentor.name)));
});

router.get("/mentor-sessions", async (_req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const sessions = await db.select({
    session: mentorSessionsTable,
    mentorName: mentorsTable.name,
  }).from(mentorSessionsTable).leftJoin(mentorsTable, eq(mentorSessionsTable.mentorId, mentorsTable.id)).orderBy(asc(mentorSessionsTable.scheduledAt));
  res.json(ListMentorSessionsResponse.parse(sessions.map(({ session, mentorName }) => mentorSessionResponse(session, mentorName ?? "SkillBridge mentor"))));
});

router.get("/profile", async (_req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const profile = (await db.select().from(profilesTable).limit(1))[0];
  res.json(GetProfileResponse.parse(profile));
});

router.patch("/profile", async (req, res): Promise<void> => {
  await ensureSkillBridgeSeeded();
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = (await db.select().from(profilesTable).limit(1))[0];
  if (!existing) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const profile = (await db.update(profilesTable).set(parsed.data).where(eq(profilesTable.id, existing.id)).returning())[0];
  res.json(UpdateProfileResponse.parse(profile));
});

export default router;