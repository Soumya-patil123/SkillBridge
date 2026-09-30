import {
  db,
  activitiesTable,
  coursesTable,
  enrollmentsTable,
  lessonsTable,
  mentorSessionsTable,
  mentorsTable,
  profilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

let seedPromise: Promise<void> | undefined;

export function ensureSkillBridgeSeeded(): Promise<void> {
  seedPromise ??= seed();
  return seedPromise;
}

const placementCourses = [
  {
    title: "C / C++ Programming Fundamentals",
    slug: "c-cpp-programming-fundamentals",
    category: "Programming",
    level: "beginner" as const,
    description:
      "Build placement-ready C and C++ fundamentals through variables, control flow, functions, arrays, pointers, strings and basic problem solving.",
    instructor: "Arjun Rao",
    instructorRole: "Programming Mentor",
    durationMinutes: 300,
    rating: 4.8,
    studentsCount: 2480,
    accent: "mint",
    isFeatured: true,
    lessons: [
      "Variables, data types and input/output",
      "Operators and conditional statements",
      "Loops and nested loops",
      "Functions and parameter passing",
      "Arrays and strings",
      "Pointers and references",
      "Structures and basic OOP in C++",
      "Placement coding practice",
    ],
  },
  {
    title: "SQL & Database Interview Preparation",
    slug: "sql-database-interview-preparation",
    category: "Database",
    level: "beginner" as const,
    description:
      "Learn practical SQL for placements: SELECT, filtering, joins, grouping, subqueries, constraints and interview-style query problems.",
    instructor: "Neha Kulkarni",
    instructorRole: "Database & Analytics Mentor",
    durationMinutes: 270,
    rating: 4.9,
    studentsCount: 3120,
    accent: "coral",
    isFeatured: true,
    lessons: [
      "Tables, rows, columns and keys",
      "SELECT, WHERE and ORDER BY",
      "Aggregate functions and GROUP BY",
      "INNER, LEFT and RIGHT JOIN",
      "Subqueries and nested queries",
      "Constraints and data integrity",
      "INSERT, UPDATE and DELETE",
      "Practice 20 placement queries",
    ],
  },
  {
    title: "Data Structures for Placements",
    slug: "data-structures-for-placements",
    category: "DSA",
    level: "beginner" as const,
    description:
      "Master the data structures commonly tested in coding rounds with simple explanations and practice problems.",
    instructor: "Vikram Shah",
    instructorRole: "DSA & Coding Mentor",
    durationMinutes: 330,
    rating: 4.9,
    studentsCount: 4210,
    accent: "violet",
    isFeatured: true,
    lessons: [
      "Arrays and dynamic arrays",
      "Strings and frequency counting",
      "Linked lists",
      "Stacks",
      "Queues and circular queues",
      "Hash maps and sets",
      "Trees and binary search trees",
      "Placement data structure problems",
    ],
  },
  {
    title: "Algorithms & Big-O Problem Solving",
    slug: "algorithms-big-o-problem-solving",
    category: "Algorithms",
    level: "intermediate" as const,
    description:
      "Practice searching, sorting, recursion and complexity analysis with common placement coding patterns.",
    instructor: "Rahul Mehta",
    instructorRole: "Algorithms Mentor",
    durationMinutes: 315,
    rating: 4.8,
    studentsCount: 2980,
    accent: "sun",
    isFeatured: false,
    lessons: [
      "What is an algorithm?",
      "Time and space complexity",
      "Linear and binary search",
      "Bubble, selection and insertion sort",
      "Merge sort and quick sort",
      "Recursion and basic backtracking",
      "Maximum, minimum and duplicate problems",
      "Timed coding practice",
    ],
  },
  {
    title: "Java & OOP Interview Preparation",
    slug: "java-oop-interview-preparation",
    category: "Programming",
    level: "intermediate" as const,
    description:
      "Strengthen Java and object-oriented programming for technical interviews with examples and output-based questions.",
    instructor: "Priya Nair",
    instructorRole: "Java & Backend Mentor",
    durationMinutes: 330,
    rating: 4.9,
    studentsCount: 3650,
    accent: "coral",
    isFeatured: true,
    lessons: [
      "Classes and objects",
      "Constructors, this and super",
      "Encapsulation and access modifiers",
      "Inheritance and polymorphism",
      "Method overloading and overriding",
      "Abstraction and interfaces",
      "Exceptions and collections basics",
      "Java interview output questions",
    ],
  },
  {
    title: "Python for Placement Problem Solving",
    slug: "python-placement-problem-solving",
    category: "Programming",
    level: "beginner" as const,
    description:
      "Use Python to solve placement-style number, string, array and logic problems with clean beginner-friendly programs.",
    instructor: "Kiran Desai",
    instructorRole: "Python & Automation Mentor",
    durationMinutes: 285,
    rating: 4.8,
    studentsCount: 3920,
    accent: "mint",
    isFeatured: false,
    lessons: [
      "Variables, data types and type conversion",
      "Conditions and loops",
      "Functions and return values",
      "Lists, tuples and dictionaries",
      "Strings and common methods",
      "Number problems and digit logic",
      "Functions, recursion and debugging",
      "Placement coding practice",
    ],
  },
  {
    title: "JavaScript for Placement Preparation",
    slug: "javascript-placement-preparation",
    category: "Web Programming",
    level: "beginner" as const,
    description:
      "Prepare for JavaScript coding questions covering conditions, loops, functions, arrays, strings, type conversion and debugging.",
    instructor: "Ananya Iyer",
    instructorRole: "Frontend Developer & Mentor",
    durationMinutes: 270,
    rating: 4.8,
    studentsCount: 2740,
    accent: "sun",
    isFeatured: false,
    lessons: [
      "Variables, types and type conversion",
      "if, if-else and nested conditions",
      "for, while and nested loops",
      "Functions and parameters",
      "Arrays and array methods",
      "Strings and string methods",
      "Recursion and program tracing",
      "Debugging and placement problems",
    ],
  },
  {
    title: "DBMS Concepts & Interview Questions",
    slug: "dbms-concepts-interview-questions",
    category: "Database",
    level: "intermediate" as const,
    description:
      "Cover DBMS fundamentals used in technical interviews: keys, normalization, transactions, indexing and database design.",
    instructor: "Meera Joshi",
    instructorRole: "DBMS & Data Engineering Mentor",
    durationMinutes: 300,
    rating: 4.7,
    studentsCount: 2190,
    accent: "violet",
    isFeatured: false,
    lessons: [
      "DBMS and relational database basics",
      "Primary, candidate and foreign keys",
      "Functional dependency",
      "1NF, 2NF and 3NF",
      "Transactions and ACID properties",
      "Indexing and basic optimization",
      "Joins, views and constraints",
      "DBMS interview questions",
    ],
  },
  {
    title: "Operating Systems Fundamentals",
    slug: "operating-systems-fundamentals",
    category: "Core CS",
    level: "beginner" as const,
    description:
      "Revise processes, threads, scheduling, memory management, deadlocks and file systems for placement interviews.",
    instructor: "Siddharth Rao",
    instructorRole: "Computer Science Mentor",
    durationMinutes: 285,
    rating: 4.7,
    studentsCount: 1850,
    accent: "mint",
    isFeatured: false,
    lessons: [
      "Operating system basics",
      "Processes and process states",
      "Threads and concurrency",
      "CPU scheduling",
      "Memory management and paging",
      "Deadlocks",
      "File systems and storage",
      "OS interview questions",
    ],
  },
  {
    title: "Computer Networks for Placements",
    slug: "computer-networks-for-placements",
    category: "Core CS",
    level: "beginner" as const,
    description:
      "Understand OSI and TCP/IP, networking devices, IP addressing, HTTP and common computer-network interview questions.",
    instructor: "Rohit Verma",
    instructorRole: "Network & Systems Mentor",
    durationMinutes: 285,
    rating: 4.8,
    studentsCount: 2310,
    accent: "coral",
    isFeatured: false,
    lessons: [
      "Networking basics and topologies",
      "OSI model",
      "TCP/IP model",
      "IP addresses and ports",
      "Switches, routers and gateways",
      "TCP vs UDP",
      "HTTP, HTTPS and DNS",
      "Network interview questions",
    ],
  },
  {
    title: "Placement Aptitude Practice",
    slug: "placement-aptitude-practice",
    category: "Aptitude",
    level: "beginner" as const,
    description:
      "Practice quantitative aptitude and logical reasoning topics with timed placement-style questions.",
    instructor: "Sneha Patil",
    instructorRole: "Aptitude Trainer",
    durationMinutes: 300,
    rating: 4.9,
    studentsCount: 5120,
    accent: "sun",
    isFeatured: true,
    lessons: [
      "Percentages and profit & loss",
      "Ratios and proportions",
      "Averages",
      "Time, speed and distance",
      "Time and work",
      "Number systems",
      "Logical reasoning patterns",
      "Timed aptitude mock test",
    ],
  },
  {
    title: "Communication, HR & Interview Skills",
    slug: "communication-hr-interview-skills",
    category: "Communication",
    level: "beginner" as const,
    description:
      "Build professional communication, self-introduction, resume discussion and HR interview confidence for placements.",
    instructor: "Maya Patel",
    instructorRole: "Career & Communication Coach",
    durationMinutes: 240,
    rating: 4.9,
    studentsCount: 3480,
    accent: "coral",
    isFeatured: true,
    lessons: [
      "Professional communication basics",
      "Self-introduction",
      "Strengths and weaknesses",
      "Project explanation",
      "Resume-based questions",
      "Common HR questions",
      "STAR method for answers",
      "Mock HR interview",
    ],
  },
];

const placementMentors = [
  {
    name: "Arjun Rao",
    role: "C / C++ & DSA Mentor",
    company: "Software Engineering Coach",
    bio: "I help students turn programming fundamentals into placement-ready coding skills.",
    expertise: ["C", "C++", "DSA", "Coding"],
    rating: 4.9,
    reviewCount: 73,
    sessionPrice: 60,
    availability: "Next availability Mon",
    accent: "mint",
  },
  {
    name: "Neha Kulkarni",
    role: "SQL & DBMS Mentor",
    company: "Data Engineering Coach",
    bio: "I simplify SQL, DBMS and database interview questions with practical examples.",
    expertise: ["SQL", "DBMS", "Databases"],
    rating: 4.9,
    reviewCount: 81,
    sessionPrice: 65,
    availability: "Next availability Tue",
    accent: "coral",
  },
  {
    name: "Vikram Shah",
    role: "DSA & Coding Mentor",
    company: "Competitive Programming Coach",
    bio: "I focus on problem-solving patterns, complexity and coding-round practice.",
    expertise: ["DSA", "Algorithms", "Coding"],
    rating: 4.8,
    reviewCount: 69,
    sessionPrice: 70,
    availability: "Next availability Wed",
    accent: "violet",
  },
  {
    name: "Priya Nair",
    role: "Java & OOP Mentor",
    company: "Backend Development Coach",
    bio: "I prepare students for Java, OOP and technical interview output questions.",
    expertise: ["Java", "OOP", "Backend"],
    rating: 4.8,
    reviewCount: 57,
    sessionPrice: 65,
    availability: "Next availability Thu",
    accent: "sun",
  },
  {
    name: "Sneha Patil",
    role: "Aptitude & HR Mentor",
    company: "Placement Trainer",
    bio: "I help students practice aptitude, communication and common HR interview questions.",
    expertise: ["Aptitude", "Communication", "HR"],
    rating: 4.9,
    reviewCount: 94,
    sessionPrice: 55,
    availability: "Next availability Fri",
    accent: "coral",
  },
];

async function seed(): Promise<void> {
  const existingProfile = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .limit(1);

  if (existingProfile.length === 0) {
    await db.insert(profilesTable).values({
      name: "Alex Morgan",
      email: "alex.morgan@example.com",
      role: "BCA Student",
      bio: "Final-year BCA student building practical skills for software placement.",
      skills: ["Java", "Python", "JavaScript"],
      weeklyGoalHours: 8,
      timezone: "Asia/Calcutta",
    });
  }

  // Add placement-focused courses without deleting the original courses.
  for (const course of placementCourses) {
    let existing = await db
      .select({ id: coursesTable.id })
      .from(coursesTable)
      .where(eq(coursesTable.slug, course.slug))
      .limit(1);

    let courseId = existing[0]?.id;

    if (!courseId) {
      const inserted = await db
        .insert(coursesTable)
        .values({
          title: course.title,
          slug: course.slug,
          category: course.category,
          level: course.level,
          description: course.description,
          instructor: course.instructor,
          instructorRole: course.instructorRole,
          durationMinutes: course.durationMinutes,
          lessonsCount: course.lessons.length,
          rating: course.rating,
          studentsCount: course.studentsCount,
          accent: course.accent,
          isFeatured: course.isFeatured,
        })
        .returning({ id: coursesTable.id });

      courseId = inserted[0]?.id;
    }

    if (!courseId) continue;

    const existingLessons = await db
      .select({ id: lessonsTable.id })
      .from(lessonsTable)
      .where(eq(lessonsTable.courseId, courseId))
      .limit(1);

    if (existingLessons.length === 0) {
      await db.insert(lessonsTable).values(
        course.lessons.map((title, index) => ({
          courseId,
          title,
          durationMinutes: 20 + (index % 3) * 5,
          position: index + 1,
          type:
            index === 0
              ? "video"
              : index % 3 === 0
                ? "exercise"
                : "lesson",
        })),
      );
    }
  }

  // Add placement-focused mentors without duplicating existing mentors.
  for (const mentor of placementMentors) {
    const existing = await db
      .select({ id: mentorsTable.id })
      .from(mentorsTable)
      .where(eq(mentorsTable.name, mentor.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(mentorsTable).values(mentor);
    }
  }

  const existingActivities = await db
    .select({ id: activitiesTable.id })
    .from(activitiesTable)
    .limit(1);

  if (existingActivities.length === 0) {
    await db.insert(activitiesTable).values([
      {
        type: "assessment",
        title: "Completed Skill Assessment",
        description: "Your results are now connected to your placement roadmap.",
        occurredAt: new Date("2026-09-27T05:30:00.000Z"),
        accent: "mint",
      },
      {
        type: "roadmap",
        title: "Placement roadmap generated",
        description: "SkillBridge created a learning sequence from your assessment.",
        occurredAt: new Date("2026-09-27T05:35:00.000Z"),
        accent: "violet",
      },
      {
        type: "course",
        title: "Placement courses added",
        description: "Your library now includes programming, DSA, SQL, core CS, aptitude and interview paths.",
        occurredAt: new Date("2026-09-27T05:40:00.000Z"),
        accent: "coral",
      },
    ]);
  }

  // Enroll the learner in two placement courses so the dashboard has active paths.
  const allCourses = await db
    .select()
    .from(coursesTable)
    .orderBy(coursesTable.id);

  const targetSlugs = [
    "c-cpp-programming-fundamentals",
    "sql-database-interview-preparation",
  ];

  const enrolled = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable);

  const enrolledIds = new Set(enrolled.map((item) => item.courseId));

  for (const course of allCourses) {
    if (!targetSlugs.includes(course.slug) || enrolledIds.has(course.id)) {
      continue;
    }

    await db.insert(enrollmentsTable).values({
      courseId: course.id,
      progress: 0,
      completedLessons: 0,
      enrolledAt: new Date(),
      lastActivityAt: new Date(),
    });
  }

  // Create a placement-oriented mentor session only when none exists.
  const existingSessions = await db
    .select({ id: mentorSessionsTable.id })
    .from(mentorSessionsTable)
    .limit(1);

  if (existingSessions.length === 0) {
    const mentor = await db
      .select({ id: mentorsTable.id })
      .from(mentorsTable)
      .where(eq(mentorsTable.name, "Neha Kulkarni"))
      .limit(1);

    if (mentor[0]) {
      await db.insert(mentorSessionsTable).values({
        mentorId: mentor[0].id,
        scheduledAt: new Date("2026-09-30T11:30:00.000Z"),
        topic: "SQL and DBMS preparation for placement interviews",
        status: "scheduled",
      });
    }
  }
}
