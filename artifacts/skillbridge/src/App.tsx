import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Compass,
  Edit3,
  Filter,
  Flame,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageCircle,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetActivityQueryKey,
  getGetCourseQueryKey,
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getListCoursesQueryKey,
  getListMentorSessionsQueryKey,
  getListMentorsQueryKey,
  useCreateMentorSession,
  useEnrollInCourse,
  useGetActivity,
  useGetCourse,
  useGetDashboard,
  useGetProfile,
  useListCourses,
  useListMentorSessions,
  useListMentors,
  useUpdateCourseProgress,
  useUpdateProfile,
} from '@workspace/api-client-react';
import type { Activity, Course, Mentor, MentorSession } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/courses', label: 'Course library', icon: BookOpen },
  { href: '/mentors', label: 'Mentors', icon: Users },
  { href: '/sessions', label: 'My sessions', icon: CalendarDays },
  { href: '/assessment', label: 'Skill Assessment', icon: Target },
  { href: '/roadmap', label: 'Placement Roadmap', icon: Compass },
];

const accents = ['#df765e', '#5e8f84', '#dbac53', '#7a77a8', '#cf7090'];
const fallbackActivity: Activity[] = [];

type AssessmentResult = {
  score: number;
  total: number;
  readinessScore: number;
  skillResults: Record<string, { total: number; correct: number }>;
  completedAt: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Not scheduled yet';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

function initials(name = 'SkillBridge') {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function LoadingBlock({ label = 'Gathering your studio' }: { label?: string }) {
  return (
    <div className="grid gap-4" data-testid="loading-state">
      <div className="h-32 animate-pulse rounded-[1.25rem] bg-muted/70" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
      </div>

      <p className="mono text-center text-xs text-muted-foreground">
        {label}...
      </p>
    </div>
  );
}

function ErrorState({
  onRetry,
  label = 'Something went off track.',
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <div
      className="rounded-[1.25rem] border border-destructive/25 bg-destructive/5 p-8 text-center"
      data-testid="error-state"
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Zap size={18} />
      </div>

      <p className="font-semibold">{label}</p>

      <p className="mt-1 text-sm text-muted-foreground">
        Give it another try — your progress is safe.
      </p>

      <button
        onClick={onRetry}
        data-testid="button-retry"
        className="focus-ring mt-4 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
      >
        Try again
      </button>
    </div>
  );
}

function ProgressBar({
  value,
  accent = '#5e8f84',
  compact = false,
}: {
  value: number;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'h-2 overflow-hidden rounded-full bg-foreground/10',
        compact && 'h-1.5',
      )}
      data-testid="progress-bar"
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: accent,
        }}
      />
    </div>
  );
}

function Avatar({
  name,
  accent = '#5e8f84',
  size = 'md',
}: {
  name?: string;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimensions =
    size === 'lg'
      ? 'h-16 w-16 text-lg'
      : size === 'sm'
        ? 'h-9 w-9 text-xs'
        : 'h-11 w-11 text-sm';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl font-bold text-foreground',
        dimensions,
      )}
      style={{ backgroundColor: `${accent}2d` }}
      data-testid={`img-avatar-${name || 'learner'}`}
    >
      {initials(name)}
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: profile } = useGetProfile();

  const activeLabel =
    navItems.find((item) => item.href === location)?.label ||
    (location.startsWith('/courses/') ? 'Course detail' : 'SkillBridge');

  return (
    <div className="app-shell grain">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] -translate-x-full flex-col border-r border-border/70 bg-[#f6f0e6] px-5 py-6 transition-transform duration-300 lg:translate-x-0',
          mobileOpen && 'translate-x-0',
        )}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="focus-ring flex items-center gap-3"
            data-testid="link-brand"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
              <span className="absolute h-5 w-5 rounded-full border-2 border-primary-foreground/80" />
              <span className="absolute h-1.5 w-1.5 rounded-full bg-accent" />
            </div>

            <div>
              <p className="display text-lg font-bold leading-none">
                SkillBridge
              </p>

              <p className="mono mt-1 text-[9px] uppercase tracking-[.18em] text-muted-foreground">
                your learning studio
              </p>
            </div>
          </Link>

          <button
            className="focus-ring rounded-full p-2 lg:hidden"
            onClick={() => setMobileOpen(false)}
            data-testid="button-close-menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-12">
          <p className="mono mb-3 px-3 text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">
            Workspace
          </p>

          <nav className="grid gap-1" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active =
                location === item.href ||
                (item.href !== '/' && location.startsWith(item.href));

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'focus-ring group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(47,105,94,.18)]'
                      : 'text-muted-foreground hover:bg-background/75 hover:text-foreground',
                  )}
                  data-testid={`link-nav-${item.label
                    .toLowerCase()
                    .replaceAll(' ', '-')}`}
                >
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.5 : 1.8}
                  />

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto">
          <Link
            href="/profile"
            className="focus-ring mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 p-3 transition-colors hover:bg-background"
            data-testid="link-profile-sidebar"
          >
            <Avatar
              name={profile?.name}
              size="sm"
              accent="#df765e"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {profile?.name || 'Your profile'}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {profile?.role || 'Keep growing'}
              </p>
            </div>

            <ChevronDown
              className="ml-auto text-muted-foreground"
              size={15}
            />
          </Link>

          <p className="px-1 text-[11px] leading-5 text-muted-foreground">
            A little progress, practiced often, becomes a new professional
            instinct.
          </p>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/25 lg:hidden"
          onClick={() => setMobileOpen(false)}
          data-testid="button-dismiss-menu"
        />
      )}

      <div className="lg:pl-[260px]">
        <header
          className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/60 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12"
          data-testid="topbar"
        >
          <div className="flex items-center gap-3">
            <button
              className="focus-ring rounded-xl p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              data-testid="button-open-menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Studio / {activeLabel}
              </p>

              <p className="display mt-0.5 text-xl font-bold lg:hidden">
                SkillBridge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/mentors"
              className="focus-ring hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-muted sm:flex"
              data-testid="link-find-mentor"
            >
              <MessageCircle size={14} className="text-primary" />
              Find a mentor
            </Link>

            <Link
              href="/profile"
              className="focus-ring"
              data-testid="link-profile-top"
            >
              <Avatar
                name={profile?.name}
                size="sm"
                accent="#dbac53"
              />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="animate-rise">
        <p className="mono mb-3 text-[10px] font-medium uppercase tracking-[.2em] text-primary">
          {eyebrow}
        </p>

        <h1
          className="display max-w-2xl text-4xl font-bold leading-[1.05] sm:text-5xl"
          data-testid="heading-page"
        >
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="animate-rise delay-1">
          {action}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  color = '#5e8f84',
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  detail: string;
  color?: string;
}) {
  return (
    <div
      className="card-lift rounded-[1.15rem] border border-card-border bg-card p-5"
      data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${color}25`,
            color,
          }}
        >
          <Icon size={17} />
        </div>

        <span className="mono text-[10px] text-muted-foreground">
          this week
        </span>
      </div>

      <p className="display mt-5 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold">
        {label}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function CourseCard({
  course,
  compact = false,
}: {
  course: Course;
  compact?: boolean;
}) {
  const accent = course.accent || accents[course.id % accents.length];
  const progress = course.progress ?? 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        'card-lift group block overflow-hidden rounded-[1.25rem] border border-card-border bg-card',
        compact ? '' : 'animate-rise',
      )}
      style={
        {
          '--course-accent': accent,
        } as Record<string, string>
      }
      data-testid={`card-course-${course.id}`}
    >
      <div
        className="relative h-28 overflow-hidden p-5"
        style={{ backgroundColor: `${accent}20` }}
      >
        <div
          className="absolute -right-4 -top-8 h-32 w-32 rounded-full border-[18px] border-current opacity-20"
          style={{ color: accent }}
        />

        <div
          className="absolute -bottom-14 right-10 h-24 w-24 rounded-full border-[10px] border-current opacity-15"
          style={{ color: accent }}
        />

        <span
          className="relative rounded-full bg-card/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em]"
          style={{ color: accent }}
        >
          {course.category}
        </span>

        {course.isFeatured && (
          <span className="relative ml-2 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-background">
            Featured
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>

          <ArrowRight
            size={16}
            className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
          />
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {course.description}
        </p>

        <div className="mt-5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock3 size={13} />
            {Math.round(course.durationMinutes / 60)}h
          </span>

          <span className="flex items-center gap-1">
            <BookOpen size={13} />
            {course.lessonsCount} lessons
          </span>

          <span className="ml-auto flex items-center gap-1 font-semibold text-foreground">
            <Star
              size={12}
              fill="currentColor"
              className="text-accent"
            />
            {course.rating.toFixed(1)}
          </span>
        </div>

        {course.enrolled && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[10px] font-semibold">
              <span className="text-muted-foreground">
                Your progress
              </span>

              <span style={{ color: accent }}>
                {Math.round(progress)}%
              </span>
            </div>

            <ProgressBar
              value={progress}
              accent={accent}
              compact
            />
          </div>
        )}
      </div>
    </Link>
  );
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  const activity = useGetActivity();
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentResult | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        'skillbridge-assessment-result',
      );

      if (stored) {
        setAssessmentResult(JSON.parse(stored));
      }
    } catch {
      setAssessmentResult(null);
    }
  }, []);

  if (dashboard.isLoading) return <LoadingBlock />;

  if (dashboard.isError || !dashboard.data) {
    return <ErrorState onRetry={() => dashboard.refetch()} />;
  }

  const data = dashboard.data;

  const activities = activity.data?.length
    ? activity.data
    : data.recentActivity || fallbackActivity;

  const maxHours = Math.max(
    ...(data.weeklyActivity || []).map((item) => item.hours),
    1,
  );

  const assessmentSkills = assessmentResult
    ? Object.entries(assessmentResult.skillResults)
        .map(([skill, item]) => ({
          skill,
          percentage: Math.round(
            (item.correct / item.total) * 100,
          ),
        }))
        .sort((a, b) => a.percentage - b.percentage)
    : [];

  const topFocusSkills = assessmentSkills.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="animate-rise relative overflow-hidden rounded-[1.5rem] bg-primary p-7 text-primary-foreground sm:p-9">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[42px] border-primary-foreground/10" />

        <div className="absolute -bottom-36 right-44 h-64 w-64 rounded-full border-[26px] border-accent/30" />

        <div className="relative max-w-2xl">
          <p className="mono text-[10px] uppercase tracking-[.2em] text-primary-foreground/65">
            Tuesday, a good day to practice
          </p>

          <h1
            className="display mt-4 text-4xl font-bold leading-[1.03] sm:text-6xl"
            data-testid="text-greeting"
          >
            {data.greeting || 'Welcome back to your studio.'}
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/75">
            Your next useful step is closer than it looks. Keep the thread
            going.
          </p>

          <Link
            href="/courses"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-foreground transition-transform hover:-translate-y-0.5"
            data-testid="link-explore-courses"
          >
            Explore the library
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={BookOpen}
          label="Active courses"
          value={data.activeCourses}
          detail="paths currently open"
          color="#5e8f84"
        />

        <Stat
          icon={Check}
          label="Lessons finished"
          value={data.completedLessons}
          detail="small wins add up"
          color="#df765e"
        />

        <Stat
          icon={Clock3}
          label="Learning hours"
          value={data.learningHours}
          detail="time invested with intent"
          color="#7a77a8"
        />

        <Stat
          icon={Flame}
          label="Day streak"
          value={data.currentStreak}
          detail="keep the rhythm alive"
          color="#dbac53"
        />
      </div>

      <section
        className="overflow-hidden rounded-[1.25rem] border border-primary/20 bg-card"
        data-testid="section-placement-readiness"
      >
        <div className="grid gap-0 lg:grid-cols-[.72fr_1.28fr]">
          <div className="bg-primary p-6 text-primary-foreground sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/70">
                  Placement readiness
                </p>
                <h2 className="display mt-2 text-2xl font-bold">
                  Your current position
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10">
                <Target size={18} />
              </div>
            </div>

            {assessmentResult ? (
              <>
                <div className="mt-7 flex items-end gap-3">
                  <span className="display text-5xl font-bold leading-none">
                    {assessmentResult.readinessScore}%
                  </span>
                  <span className="pb-1 text-xs font-semibold text-primary-foreground/70">
                    readiness score
                  </span>
                </div>

                <p className="mt-3 text-sm text-primary-foreground/75">
                  {assessmentResult.score} correct out of {assessmentResult.total} questions
                </p>

                <Link
                  href="/roadmap"
                  className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-4 py-2.5 text-xs font-bold text-primary"
                  data-testid="link-view-placement-roadmap"
                >
                  View placement roadmap
                  <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-6 text-sm leading-6 text-primary-foreground/75">
                  Complete the skill assessment to calculate your placement readiness score and identify your focus areas.
                </p>

                <Link
                  href="/assessment"
                  className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-4 py-2.5 text-xs font-bold text-primary"
                  data-testid="link-start-skill-assessment"
                >
                  Start skill assessment
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                  Skill gap snapshot
                </p>
                <h3 className="display mt-2 text-xl font-bold">
                  What to work on next
                </h3>
              </div>
              <Sparkles size={18} className="text-accent" />
            </div>

            {assessmentResult ? (
              <div className="mt-6 grid gap-4">
                {topFocusSkills.map((item, index) => (
                  <div key={item.skill}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{item.skill}</span>
                      </div>
                      <span className="font-bold">{item.percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Priority areas are based on your latest assessment.
                  </p>
                  <Link
                    href="/assessment"
                    className="focus-ring text-xs font-bold text-primary hover:underline"
                    data-testid="link-retake-assessment-dashboard"
                  >
                    Retake assessment <ArrowRight size={13} className="ml-1 inline" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Your skill-gap snapshot will appear here after the assessment.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.45fr_.8fr]">
        <section
          className="rounded-[1.25rem] border border-card-border bg-card p-6 sm:p-7"
          data-testid="section-continue-learning"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Pick up the thread
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Continue learning
              </h2>
            </div>

            <Link
              href="/courses"
              className="focus-ring text-xs font-bold text-primary hover:underline"
              data-testid="link-view-all-courses"
            >
              View all
              <ArrowRight
                size={13}
                className="ml-1 inline"
              />
            </Link>
          </div>

          {data.continueLearning?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.continueLearning
                .slice(0, 2)
                .map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    compact
                  />
                ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Your next chapter is waiting."
              action={
                <Link
                  href="/courses"
                  className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  data-testid="link-browse-library"
                >
                  Browse courses
                </Link>
              }
            />
          )}
        </section>

        <section
          className="rounded-[1.25rem] border border-card-border bg-card p-6 sm:p-7"
          data-testid="section-weekly-activity"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Your rhythm
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Weekly activity
              </h2>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Target size={17} />
            </div>
          </div>

          <div className="mt-8 flex h-36 items-end justify-between gap-2">
            {(data.weeklyActivity || []).map((item, index) => (
              <div
                className="flex flex-1 flex-col items-center gap-2"
                key={`${item.day}-${index}`}
              >
                <div className="relative flex h-24 w-full items-end justify-center rounded-lg bg-muted/55">
                  <div
                    className="w-3/5 min-w-2 rounded-t-md bg-primary transition-all duration-700"
                    style={{
                      height: `${Math.max(
                        9,
                        (item.hours / maxHours) * 100,
                      )}%`,
                      opacity: 0.6 + index / 20,
                    }}
                    title={`${item.hours} hours`}
                    data-testid={`bar-activity-${item.day}`}
                  />
                </div>

                <span className="mono text-[9px] uppercase text-muted-foreground">
                  {item.day.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.1fr_.9fr]">
        <section
          className="rounded-[1.25rem] border border-card-border bg-card p-6 sm:p-7"
          data-testid="section-recent-activity"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                The paper trail
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Recent activity
              </h2>
            </div>

            <Sparkles size={18} className="text-accent" />
          </div>

          {activities.length ? (
            <div className="divide-y divide-border/70">
              {activities.slice(0, 5).map((item, index) => (
                <div
                  className="flex items-center gap-3 py-4 first:pt-1"
                  key={item.id || index}
                  data-testid={`activity-${item.id || index}`}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        item.accent ||
                        accents[index % accents.length],
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.title}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>

                  <time className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(item.occurredAt)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Your practice notes will appear here."
            />
          )}
        </section>

        <section
          className="relative overflow-hidden rounded-[1.25rem] border border-primary/20 bg-[#e6eee8] p-6 sm:p-7"
          data-testid="section-next-session"
        >
          <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full border-[18px] border-primary/10" />

          <p className="mono relative text-[10px] uppercase tracking-[.18em] text-primary">
            Next mentor session
          </p>

          <div className="relative mt-5">
            {data.nextSession ? (
              <>
                <p className="display text-3xl font-bold">
                  {formatDate(data.nextSession, true)}
                </p>

                <p className="mt-2 max-w-xs text-sm leading-5 text-foreground/65">
                  A focused hour to bring your questions and leave with a
                  sharper next move.
                </p>

                <Link
                  href="/sessions"
                  className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                  data-testid="link-next-session"
                >
                  Open session details
                  <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="display text-2xl font-bold">
                  Make your next move count.
                </p>

                <p className="mt-2 max-w-xs text-sm leading-5 text-foreground/65">
                  A good conversation can save weeks of guessing.
                </p>

                <Link
                  href="/mentors"
                  className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                  data-testid="link-book-session"
                >
                  Meet a mentor
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border p-7 text-center"
      data-testid="empty-state"
    >
      <Icon size={21} className="mb-3 text-primary" />

      <p className="font-semibold">{title}</p>

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function CoursesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  const params = useMemo(
    () =>
      ({
        query: search || undefined,
        category: category || undefined,
        level: level || undefined,
      }) as {
        query?: string;
        category?: string;
        level?: 'beginner' | 'intermediate' | 'advanced';
      },
    [search, category, level],
  );

  const courses = useListCourses(params, {
    query: {
      queryKey: getListCoursesQueryKey(params),
    },
  });

  const list = courses.data || [];
  const categories = [
    ...new Set(list.map((course) => course.category)),
  ];

  return (
    <div>
      <PageIntro
        eyebrow="Course library"
        title="Choose the skill worth your next season."
        description="Practical paths for people who want to become more capable, not just more busy."
        action={
          <Link
            href="/mentors"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
            data-testid="link-course-mentor"
          >
            Talk it through
            <MessageCircle size={14} />
          </Link>
        }
      />

      <div
        className="mb-7 flex flex-col gap-3 rounded-[1.25rem] border border-card-border bg-card p-3 sm:flex-row"
        data-testid="course-filters"
      >
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-muted/60 px-3">
          <Search size={17} className="text-muted-foreground" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by skill, role, or topic"
            className="focus-ring min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            data-testid="input-course-search"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-border/70 px-3">
            <Filter
              size={14}
              className="text-muted-foreground"
            />

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="focus-ring bg-transparent py-2 text-xs font-semibold outline-none"
              data-testid="select-course-category"
            >
              <option value="">All categories</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="focus-ring rounded-xl border border-border/70 bg-transparent px-3 text-xs font-semibold outline-none"
            data-testid="select-course-level"
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {courses.isLoading ? (
        <LoadingBlock label="Curating the right paths" />
      ) : courses.isError ? (
        <ErrorState onRetry={() => courses.refetch()} />
      ) : list.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No course matches that yet."
          description="Try a broader search or clear one of the filters."
          action={
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setLevel('');
              }}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              data-testid="button-clear-course-filters"
            >
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}

function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const course = useGetCourse(id);
  const enroll = useEnrollInCourse();
  const update = useUpdateCourseProgress();
  const [notice, setNotice] = useState('');
  const [lessonOverrides, setLessonOverrides] = useState<Record<number, boolean>>({});

  if (course.isLoading) {
    return <LoadingBlock label="Opening your course" />;
  }

  if (course.isError || !course.data) {
    return (
      <ErrorState
        onRetry={() => course.refetch()}
        label="We couldn't open that course."
      />
    );
  }

  const data = course.data;
  const accent =
    data.accent || accents[id % accents.length];

  const isLessonCompleted = (lesson: { id: number; completed: boolean }) =>
    lessonOverrides[lesson.id] ?? lesson.completed;

  const completed = data.lessons.filter(isLessonCompleted).length;

  const progress = data.lessons.length
    ? (completed / data.lessons.length) * 100
    : data.progress ?? 0;

  const handleEnroll = () =>
    enroll.mutate(
      {
        id,
        data: { source: 'course-detail' },
      },
      {
        onSuccess: () => {
          setNotice(
            'You are enrolled. Your first lesson is ready.',
          );

          queryClient.invalidateQueries({
            queryKey: getGetCourseQueryKey(id),
          });

          queryClient.invalidateQueries({
            queryKey: getListCoursesQueryKey(),
          });

          queryClient.invalidateQueries({
            queryKey: getGetDashboardQueryKey(),
          });
        },
      },
    );

  const handleLesson = (
    lessonId: number,
    lessonCompleted: boolean,
  ) => {
    const nextCompleted = !lessonCompleted;

    // Update the UI immediately so the checkbox always responds.
    setLessonOverrides((current) => ({
      ...current,
      [lessonId]: nextCompleted,
    }));
    setNotice(nextCompleted ? 'Saving lesson progress…' : 'Saving change…');

    const next = data.lessons.filter((lesson) =>
      lesson.id === lessonId ? nextCompleted : isLessonCompleted(lesson),
    ).length;

   update.mutate(
  {
    courseId: id,
    data: {
      progress: Math.round(
        (next / data.lessons.length) * 100,
      ),
      completedLessons: next,
    
  },
      },
      {
        onSuccess: () => {
          setLessonOverrides((current) => {
            const nextOverrides = { ...current };
            delete nextOverrides[lessonId];
            return nextOverrides;
          });
          setNotice(
            nextCompleted
              ? 'Lesson complete. Nice work.'
              : 'Lesson marked as open.',
          );

          queryClient.invalidateQueries({
            queryKey: getGetCourseQueryKey(id),
          });

          queryClient.invalidateQueries({
            queryKey: getGetDashboardQueryKey(),
          });

          queryClient.invalidateQueries({
            queryKey: getGetActivityQueryKey(),
          });
        },
        onError: () => {
          setLessonOverrides((current) => {
            const nextOverrides = { ...current };
            delete nextOverrides[lessonId];
            return nextOverrides;
          });
          setNotice('Could not save this lesson. Please try again.');
        },
      },
    );
  };

  return (
    <div>
      <Link
        href="/courses"
        className="focus-ring mb-7 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-courses"
      >
        <ChevronLeft size={15} />
        Back to library
      </Link>

      <section
        className="relative overflow-hidden rounded-[1.5rem] p-7 sm:p-10"
        style={{ backgroundColor: `${accent}20` }}
      >
        <div
          className="absolute -right-8 -top-24 h-72 w-72 rounded-full border-[44px] opacity-30"
          style={{ borderColor: accent }}
        />

        <div className="relative max-w-3xl">
          <span
            className="rounded-full bg-card/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em]"
            style={{ color: accent }}
          >
            {data.category} · {data.level}
          </span>

          <h1
            className="display mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl"
            data-testid="text-course-title"
          >
            {data.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/65">
            {data.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-foreground/65">
            <span className="flex items-center gap-1.5">
              <Avatar
                name={data.instructor}
                size="sm"
                accent={accent}
              />

              <span>
                <b className="text-foreground">
                  {data.instructor}
                </b>

                <br />

                {data.instructorRole}
              </span>
            </span>

            <span className="flex items-center gap-1">
              <Clock3 size={14} />
              {Math.round(data.durationMinutes / 60)} hours
            </span>

            <span className="flex items-center gap-1">
              <Star
                size={14}
                fill="currentColor"
                className="text-accent"
              />
              {data.rating.toFixed(1)} rating
            </span>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className="mt-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary"
          data-testid="status-course-action"
        >
          <Check size={16} />
          {notice}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                The path
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Lessons
              </h2>
            </div>

            <span className="mono text-xs text-muted-foreground">
              {completed} / {data.lessons.length} complete
            </span>
          </div>

          <div className="grid gap-3">
            {data.lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border border-card-border bg-card p-4 transition-colors',
                  lesson.completed &&
                    'bg-primary/[.035]',
                )}
                data-testid={`lesson-${lesson.id}`}
              >
                <button
                  onClick={() =>
                    handleLesson(
                      lesson.id,
                      isLessonCompleted(lesson),
                    )
                  }
                  disabled={update.isPending}
                  className={cn(
                    'focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isLessonCompleted(lesson)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-transparent hover:border-primary',
                  )}
                  data-testid={`button-complete-lesson-${lesson.id}`}
                >
                  <Check size={15} />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isLessonCompleted(lesson) &&
                        'text-muted-foreground line-through',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                    <span className="ml-2">
                      {lesson.title}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {lesson.type} · {lesson.durationMinutes} min
                  </p>
                </div>

                {index === completed &&
                  !isLessonCompleted(lesson) && (
                    <span className="hidden rounded-full bg-accent/20 px-2 py-1 text-[10px] font-bold text-foreground sm:block">
                      Up next
                    </span>
                  )}

                <Play
                  size={15}
                  className="text-muted-foreground"
                />
              </div>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-[1.25rem] border border-card-border bg-card p-6 lg:sticky lg:top-24">
          <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            Your progress
          </p>

          <div className="mt-5 flex items-end justify-between">
            <span
              className="display text-4xl font-bold"
              data-testid="text-course-progress"
            >
              {Math.round(progress)}%
            </span>

            <span className="text-xs text-muted-foreground">
              {completed} lessons
            </span>
          </div>

          <div className="mt-3">
            <ProgressBar
              value={progress}
              accent={accent}
            />
          </div>

          {data.enrolled ? (
            <button
              onClick={() =>
                document
                  .getElementById(
                    `lesson-${data.lessons[
                      Math.min(
                        completed,
                        data.lessons.length - 1,
                      )
                    ]?.id}`,
                  )
                  ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
              }
              className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
              data-testid="button-continue-course"
            >
              <Play size={15} fill="currentColor" />
              Continue course
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enroll.isPending}
              className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              data-testid="button-enroll-course"
            >
              {enroll.isPending ? (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Plus size={15} />
              )}

              {enroll.isPending
                ? 'Joining...'
                : 'Enroll in course'}
            </button>
          )}

          <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
            Learn at your pace. There is no perfect pace.
          </p>
        </aside>
      </div>
    </div>
  );
}

function MentorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expertise, setExpertise] = useState('');
  const [selected, setSelected] = useState<Mentor | null>(
    null,
  );
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [notice, setNotice] = useState('');

  const params = useMemo(
    () => ({
      query: search || undefined,
      expertise: expertise || undefined,
    }),
    [search, expertise],
  );

  const mentors = useListMentors(params, {
    query: {
      queryKey: getListMentorsQueryKey(params),
    },
  });

  const createSession = useCreateMentorSession();

  const list = mentors.data || [];

  const expertiseOptions = [
    ...new Set(
      list.flatMap((mentor) => mentor.expertise),
    ),
  ].slice(0, 8);

  const book = () => {
    if (!selected || !date || !topic.trim()) return;

    createSession.mutate(
      {
        data: {
          mentorId: selected.id,
          scheduledAt: new Date(date).toISOString(),
          topic: topic.trim(),
        },
      },
      {
        onSuccess: () => {
          setSelected(null);
          setTopic('');
          setDate('');
          setNotice(
            'Session booked. It is waiting for you in My sessions.',
          );

          queryClient.invalidateQueries({
            queryKey: getListMentorSessionsQueryKey(),
          });

          queryClient.invalidateQueries({
            queryKey: getGetDashboardQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div>
      <PageIntro
        eyebrow="Mentor room"
        title="Borrow a little perspective."
        description="Meet generous experts who can help you turn a foggy ambition into a useful next move."
        action={
          <Link
            href="/sessions"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold"
            data-testid="link-my-sessions"
          >
            My sessions
            <CalendarDays size={14} />
          </Link>
        }
      />

      {notice && (
        <div
          className="mb-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary"
          data-testid="status-mentor-action"
        >
          <Check size={16} />
          {notice}
        </div>
      )}

      <div className="mb-7 flex flex-col gap-3 rounded-[1.25rem] border border-card-border bg-card p-3 sm:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-muted/60 px-3">
          <Search size={17} className="text-muted-foreground" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search names, companies, or skills"
            className="focus-ring min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            data-testid="input-mentor-search"
          />
        </label>

        <select
          value={expertise}
          onChange={(event) =>
            setExpertise(event.target.value)
          }
          className="focus-ring rounded-xl border border-border/70 bg-transparent px-3 text-xs font-semibold outline-none"
          data-testid="select-mentor-expertise"
        >
          <option value="">All expertise</option>

          {expertiseOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {mentors.isLoading ? (
        <LoadingBlock label="Finding the right perspective" />
      ) : mentors.isError ? (
        <ErrorState onRetry={() => mentors.refetch()} />
      ) : list.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((mentor) => (
            <article
              key={mentor.id}
              className="card-lift rounded-[1.25rem] border border-card-border bg-card p-6"
              data-testid={`card-mentor-${mentor.id}`}
            >
              <div className="flex items-start justify-between">
                <Avatar
                  name={mentor.name}
                  size="lg"
                  accent={
                    mentor.accent ||
                    accents[
                      mentor.id % accents.length
                    ]
                  }
                />

                <span className="flex items-center gap-1 text-xs font-bold">
                  <Star
                    size={13}
                    fill="currentColor"
                    className="text-accent"
                  />

                  {mentor.rating.toFixed(1)}

                  <span className="font-normal text-muted-foreground">
                    ({mentor.reviewCount})
                  </span>
                </span>
              </div>

              <h2 className="display mt-5 text-xl font-bold">
                {mentor.name}
              </h2>

              <p className="text-xs font-semibold text-primary">
                {mentor.role} · {mentor.company}
              </p>

              <p className="mt-4 line-clamp-3 text-sm leading-5 text-muted-foreground">
                {mentor.bio}
              </p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {mentor.expertise
                  .slice(0, 3)
                  .map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>

                  <p className="font-bold">
                    ${mentor.sessionPrice}
                    <span className="text-xs font-normal text-muted-foreground">
                      {' '}
                      / session
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setSelected(mentor)}
                  className="focus-ring rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  data-testid={`button-book-mentor-${mentor.id}`}
                >
                  Book a session
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No mentors found."
          description="Try a different search or expertise."
        />
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          data-testid="dialog-book-session"
        >
          <div className="w-full max-w-lg rounded-t-[1.5rem] border border-border bg-card p-6 shadow-2xl sm:rounded-[1.5rem] sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="mono text-[10px] uppercase tracking-[.18em] text-primary">
                  Book a focused hour
                </p>

                <h2 className="display mt-2 text-2xl font-bold">
                  With {selected.name}
                </h2>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="focus-ring rounded-full p-2 text-muted-foreground hover:bg-muted"
                data-testid="button-close-booking"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-xs font-bold">
                What would you like to work through?

                <textarea
                  value={topic}
                  onChange={(event) =>
                    setTopic(event.target.value)
                  }
                  rows={3}
                  placeholder="e.g. I want a sharper portfolio story for product roles."
                  className="focus-ring resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                  data-testid="textarea-session-topic"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold">
                Choose a time

                <input
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  type="datetime-local"
                  className="focus-ring rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                  data-testid="input-session-date"
                />
              </label>
            </div>

            <button
              onClick={book}
              disabled={
                !topic.trim() ||
                !date ||
                createSession.isPending
              }
              className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              data-testid="button-confirm-booking"
            >
              {createSession.isPending ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CalendarDays size={16} />
              )}

              Confirm booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsPage() {
  const sessions = useListMentorSessions();

  return (
    <div>
      <PageIntro
        eyebrow="Your calendar"
        title="Make room for better questions."
        description="A record of the conversations you chose to invest in."
        action={
          <Link
            href="/mentors"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
            data-testid="link-book-another-session"
          >
            <Plus size={14} />
            Book a session
          </Link>
        }
      />

      {sessions.isLoading ? (
        <LoadingBlock label="Checking your calendar" />
      ) : sessions.isError ? (
        <ErrorState onRetry={() => sessions.refetch()} />
      ) : sessions.data?.length ? (
        <div className="grid gap-4">
          {sessions.data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Your calendar has room to grow."
          description="Book one thoughtful conversation and bring a real question."
          action={
            <Link
              href="/mentors"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              data-testid="link-find-first-mentor"
            >
              Find a mentor
            </Link>
          }
        />
      )}
    </div>
  );
}

function SessionRow({
  session,
}: {
  session: MentorSession;
}) {
  const upcoming =
    session.status === 'scheduled' &&
    new Date(session.scheduledAt).getTime() >=
      Date.now();

  return (
    <article
      className="card-lift flex flex-col gap-5 rounded-[1.25rem] border border-card-border bg-card p-5 sm:flex-row sm:items-center sm:p-6"
      data-testid={`session-${session.id}`}
    >
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-secondary text-center">
        <span className="mono text-[10px] uppercase text-primary">
          {new Date(
            session.scheduledAt,
          ).toLocaleDateString('en-US', {
            month: 'short',
          })}
        </span>

        <span className="display text-2xl font-bold leading-none">
          {new Date(
            session.scheduledAt,
          ).getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
              upcoming
                ? 'bg-accent/20 text-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {upcoming ? 'Upcoming' : session.status}
          </span>

          <span className="text-xs text-muted-foreground">
            {formatDate(session.scheduledAt, true)}
          </span>
        </div>

        <h2 className="display mt-2 text-xl font-bold">
          {session.topic}
        </h2>

        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar
            name={session.mentorName}
            size="sm"
            accent="#5e8f84"
          />

          Conversation with

          <span className="font-semibold text-foreground">
            {session.mentorName}
          </span>
        </p>
      </div>

      {upcoming && (
        <button
          onClick={() =>
            navigator.clipboard?.writeText(
              session.topic,
            )
          }
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold transition-colors hover:bg-muted"
          data-testid={`button-copy-topic-${session.id}`}
        >
          <MessageCircle size={14} />
          Copy topic
        </button>
      )}
    </article>
  );
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useGetProfile();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    name: '',
    bio: '',
    skills: '',
    weeklyGoalHours: 5,
    timezone: 'America/New_York',
  });

  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (profile.data) {
      setForm({
        name: profile.data.name,
        bio: profile.data.bio,
        skills: profile.data.skills.join(', '),
        weeklyGoalHours:
          profile.data.weeklyGoalHours,
        timezone: profile.data.timezone,
      });
    }
  }, [profile.data]);

  if (profile.isLoading) {
    return <LoadingBlock label="Opening your profile" />;
  }

  if (profile.isError || !profile.data) {
    return <ErrorState onRetry={() => profile.refetch()} />;
  }

  const save = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    update.mutate(
      {
        data: {
          name: form.name.trim(),
          bio: form.bio.trim(),
          skills: form.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
          weeklyGoalHours: Number(
            form.weeklyGoalHours,
          ),
          timezone: form.timezone,
        },
      },
      {
        onSuccess: () => {
          setNotice('Your profile is up to date.');

          queryClient.invalidateQueries({
            queryKey: getGetProfileQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div>
      <PageIntro
        eyebrow="Your profile"
        title="Design the way you want to grow."
        description="Your preferences help SkillBridge keep the next step personal."
      />

      <div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr]">
        <section className="relative overflow-hidden rounded-[1.25rem] bg-primary p-7 text-primary-foreground">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border-[25px] border-primary-foreground/10" />

          <div className="relative">
            <Avatar
              name={profile.data.name}
              size="lg"
              accent="#dbac53"
            />

            <h2
              className="display mt-6 text-3xl font-bold"
              data-testid="text-profile-name"
            >
              {profile.data.name}
            </h2>

            <p className="mt-1 text-sm text-primary-foreground/70">
              {profile.data.role}
            </p>

            <p className="mt-6 border-t border-primary-foreground/15 pt-5 text-sm leading-6 text-primary-foreground/75">
              {profile.data.bio ||
                'A short note about where you are headed.'}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {profile.data.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        <form
          onSubmit={save}
          className="rounded-[1.25rem] border border-card-border bg-card p-6 sm:p-8"
          data-testid="form-profile"
        >
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Studio settings
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Personal details
              </h2>
            </div>

            <Settings2
              size={19}
              className="text-primary"
            />
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold">
              Name

              <input
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                required
                className="focus-ring rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                data-testid="input-profile-name"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold">
              Email

              <span
                className="rounded-xl border border-input bg-muted/60 px-3 py-3 text-sm font-normal text-muted-foreground"
                data-testid="text-profile-email"
              >
                {profile.data.email}
              </span>
            </label>

            <label className="grid gap-2 text-xs font-bold">
              Your current focus

              <textarea
                value={form.bio}
                onChange={(event) =>
                  setForm({
                    ...form,
                    bio: event.target.value,
                  })
                }
                rows={4}
                placeholder="What are you working toward?"
                className="focus-ring resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                data-testid="textarea-profile-bio"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold">
              Skills you are building

              <span className="text-[11px] font-normal text-muted-foreground">
                Separate skills with commas
              </span>

              <input
                value={form.skills}
                onChange={(event) =>
                  setForm({
                    ...form,
                    skills: event.target.value,
                  })
                }
                className="focus-ring rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                data-testid="input-profile-skills"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold">
                Weekly learning goal

                <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={form.weeklyGoalHours}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        weeklyGoalHours: Number(
                          event.target.value,
                        ),
                      })
                    }
                    className="focus-ring w-16 bg-transparent py-1 text-sm outline-none"
                    data-testid="input-profile-goal"
                  />

                  <span className="text-sm font-normal text-muted-foreground">
                    hours
                  </span>
                </span>
              </label>

              <label className="grid gap-2 text-xs font-bold">
                Timezone

                <select
                  value={form.timezone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      timezone: event.target.value,
                    })
                  }
                  className="focus-ring rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none"
                  data-testid="select-profile-timezone"
                >
                  <option value="America/New_York">
                    Eastern Time
                  </option>
                  <option value="America/Chicago">
                    Central Time
                  </option>
                  <option value="America/Denver">
                    Mountain Time
                  </option>
                  <option value="America/Los_Angeles">
                    Pacific Time
                  </option>
                  <option value="Europe/London">
                    London
                  </option>
                </select>
              </label>
            </div>
          </div>

          {notice && (
            <p
              className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary"
              data-testid="status-profile-saved"
            >
              <Check size={15} />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={update.isPending}
            className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            data-testid="button-save-profile"
          >
            {update.isPending ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
            ) : (
              <Edit3 size={15} />
            )}

            {update.isPending
              ? 'Saving...'
              : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   SKILL ASSESSMENT
   ========================================= */

function SkillAssessmentPage() {
  const questions = [
    {
      skill: 'Java',
      question: 'Which keyword is used to create a subclass in Java?',
      options: ['this', 'extends', 'implements', 'super'],
      answer: 'extends',
    },
    {
      skill: 'Python',
      question: 'Which symbol is used to start a comment in Python?',
      options: ['//', '#', '/*', '--'],
      answer: '#',
    },
    {
      skill: 'C / C++',
      question: 'Which data type is used to store a single character in C?',
      options: ['string', 'char', 'character', 'text'],
      answer: 'char',
    },
    {
      skill: 'JavaScript',
      question: 'Which keyword declares a block-scoped variable in JavaScript?',
      options: ['var', 'let', 'define', 'dim'],
      answer: 'let',
    },
    {
      skill: 'SQL',
      question: 'Which SQL command is used to retrieve data from a table?',
      options: ['INSERT', 'SELECT', 'UPDATE', 'DELETE'],
      answer: 'SELECT',
    },
    {
      skill: 'DBMS',
      question: 'Which key uniquely identifies a record in a table?',
      options: ['Foreign key', 'Primary key', 'Candidate key only', 'Index'],
      answer: 'Primary key',
    },
    {
      skill: 'Data Structures',
      question: 'Which data structure follows LIFO?',
      options: ['Queue', 'Stack', 'Array', 'Linked list'],
      answer: 'Stack',
    },
    {
      skill: 'Algorithms',
      question: 'Which search algorithm requires a sorted array?',
      options: ['Linear search', 'Binary search', 'Sequential search', 'Jump-free search'],
      answer: 'Binary search',
    },
    {
      skill: 'Operating Systems',
      question: 'Which component is responsible for managing processes?',
      options: ['Compiler', 'Operating system', 'Browser', 'Database'],
      answer: 'Operating system',
    },
    {
      skill: 'Computer Networks',
      question: 'Which protocol is commonly used to access websites?',
      options: ['HTTP', 'FTP', 'SMTP', 'SSH'],
      answer: 'HTTP',
    },
    {
      skill: 'Aptitude',
      question: 'What is 25% of 200?',
      options: ['25', '40', '50', '75'],
      answer: '50',
    },
    {
      skill: 'Communication',
      question: 'Choose the grammatically correct sentence.',
      options: [
        'She go to college every day.',
        'She going to college every day.',
        'She goes to college every day.',
        'She gone to college every day.',
      ],
      answer: 'She goes to college every day.',
    },
    {
      skill: 'Java',
      question: 'Which concept allows the same method name with different parameters?',
      options: [
        'Method overloading',
        'Method overriding',
        'Inheritance',
        'Encapsulation',
      ],
      answer: 'Method overloading',
    },
    {
      skill: 'Python',
      question: 'Which function is used to get the length of a list?',
      options: ['size()', 'length()', 'len()', 'count()'],
      answer: 'len()',
    },
    {
      skill: 'C / C++',
      question: 'Which operator is used to get the address of a variable in C?',
      options: ['*', '&', '#', '@'],
      answer: '&',
    },
    {
      skill: 'JavaScript',
      question: 'What is the result of typeof 10?',
      options: ['integer', 'number', 'float', 'numeric'],
      answer: 'number',
    },
    {
      skill: 'SQL',
      question: 'Which clause is used to filter rows in SQL?',
      options: ['ORDER BY', 'GROUP BY', 'WHERE', 'SELECT'],
      answer: 'WHERE',
    },
    {
      skill: 'DBMS',
      question: 'What does SQL stand for?',
      options: [
        'Structured Query Language',
        'Simple Query Language',
        'System Query Logic',
        'Structured Question Language',
      ],
      answer: 'Structured Query Language',
    },
    {
      skill: 'Data Structures',
      question: 'Which data structure follows FIFO?',
      options: ['Stack', 'Queue', 'Tree', 'Graph'],
      answer: 'Queue',
    },
    {
      skill: 'Algorithms',
      question: 'What is the time complexity of linear search in the worst case?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      answer: 'O(n)',
    },
    {
      skill: 'Operating Systems',
      question: 'Which memory is closest to the CPU?',
      options: ['Hard disk', 'RAM', 'Cache', 'Pen drive'],
      answer: 'Cache',
    },
    {
      skill: 'Computer Networks',
      question: 'Which device connects different networks?',
      options: ['Switch', 'Router', 'Keyboard', 'Monitor'],
      answer: 'Router',
    },
    {
      skill: 'Aptitude',
      question: 'If 5 pens cost ₹50, what is the cost of 1 pen?',
      options: ['₹5', '₹10', '₹15', '₹20'],
      answer: '₹10',
    },
    {
      skill: 'Communication',
      question: 'Choose the best professional sentence.',
      options: [
        'Send me the file now.',
        'Give file.',
        'Could you please send me the file?',
        'You send file.',
      ],
      answer: 'Could you please send me the file?',
    },
  ];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const question = questions[currentQuestion];

  const selectAnswer = (answer: string) => {
    setAnswers((current) => ({
      ...current,
      [currentQuestion]: answer,
    }));
  };

  const score = questions.reduce(
    (total, item, index) =>
      total + (answers[index] === item.answer ? 1 : 0),
    0,
  );

  const readinessScore = Math.round(
    (score / questions.length) * 100,
  );

  const skillResults = questions.reduce(
    (result, item, index) => {
      if (!result[item.skill]) {
        result[item.skill] = {
          total: 0,
          correct: 0,
        };
      }

      result[item.skill].total += 1;

      if (answers[index] === item.answer) {
        result[item.skill].correct += 1;
      }

      return result;
    },
    {} as Record<string, { total: number; correct: number }>,
  );

  const getLevel = (percentage: number) => {
    if (percentage >= 80) return 'Strong';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Needs improvement';
    return 'Beginner';
  };

  const weakSkills = Object.entries(skillResults)
    .filter(
      ([, result]) =>
        (result.correct / result.total) * 100 < 60,
    )
    .map(([skill]) => skill);

  const submitAssessment = () => {
    const result = {
      score,
      total: questions.length,
      readinessScore,
      skillResults,
      completedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      'skillbridge-assessment-result',
      JSON.stringify(result),
    );

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <PageIntro
          eyebrow="Assessment result"
          title="Your placement readiness"
          description="Your score is based on your answers to the SkillBridge assessment."
        />

        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-[1.25rem] bg-primary p-8 text-primary-foreground">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/70">
              Overall score
            </p>

            <p className="display mt-4 text-7xl font-bold">
              {readinessScore}%
            </p>

            <p className="mt-3 text-sm text-primary-foreground/75">
              {score} correct out of {questions.length} questions
            </p>

            <div className="mt-7 border-t border-primary-foreground/15 pt-6">
              <p className="text-sm font-semibold">
                Skills needing attention
              </p>

              {weakSkills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {weakSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-primary-foreground/70">
                  No major weak skills found.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentQuestion(0);
                setAnswers({});
                setSubmitted(false);
              }}
              className="focus-ring mt-7 rounded-full bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
            >
              Retake assessment
            </button>
          </section>

          <section className="rounded-[1.25rem] border border-card-border bg-card p-7">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-primary">
              Skill-wise performance
            </p>

            <h2 className="display mt-2 text-3xl font-bold">
              Your skill gaps
            </h2>

            <div className="mt-7 grid gap-4">
              {Object.entries(skillResults).map(
                ([skill, result]) => {
                  const percentage = Math.round(
                    (result.correct / result.total) * 100,
                  );

                  return (
                    <div
                      key={skill}
                      className="rounded-xl border border-border/70 bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {skill}
                        </span>

                        <span className="text-sm font-bold">
                          {percentage}%
                        </span>
                      </div>

                      <div className="mt-3">
                        <ProgressBar value={percentage} />
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {getLevel(percentage)}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageIntro
        eyebrow="Skill assessment"
        title="Test your placement skills."
        description="Answer the questions and SkillBridge will calculate your placement readiness and identify your skill gaps."
      />

      <div className="mx-auto max-w-4xl">
        <div className="rounded-[1.25rem] border border-card-border bg-card p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-primary">
                Question {currentQuestion + 1} of {questions.length}
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                {question.skill}
              </h2>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              {Math.round(
                ((currentQuestion + 1) / questions.length) * 100,
              )}%
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${
                  ((currentQuestion + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-bold leading-relaxed">
              {question.question}
            </h3>

            <div className="mt-7 grid gap-3">
              {question.options.map((option, index) => {
                const selected =
                  answers[currentQuestion] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectAnswer(option)}
                    className={cn(
                      'focus-ring flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border',
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>

                    <span className="font-semibold">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-9 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentQuestion === 0}
              onClick={() =>
                setCurrentQuestion(
                  (current) => current - 1,
                )
              }
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {currentQuestion < questions.length - 1 ? (
              <button
                type="button"
                disabled={!answers[currentQuestion]}
                onClick={() =>
                  setCurrentQuestion(
                    (current) => current + 1,
                  )
                }
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!answers[currentQuestion]}
                onClick={submitAssessment}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit assessment
                <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlacementRoadmapPage() {
  const [result, setResult] = useState<{
    score: number;
    total: number;
    readinessScore: number;
    skillResults: Record<string, { total: number; correct: number }>;
    completedAt: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        'skillbridge-assessment-result',
      );

      if (stored) {
        setResult(JSON.parse(stored));
      }
    } catch {
      setResult(null);
    }
  }, []);

  const roadmapItems = [
    {
      skill: 'Python',
      course: 'Python fundamentals and problem solving',
      actions: ['Variables and data types', 'Loops and functions', 'Practice 10 programs'],
    },
    {
      skill: 'C / C++',
      course: 'C / C++ programming fundamentals',
      actions: ['Pointers and arrays', 'Functions and strings', 'Practice basic programs'],
    },
    {
      skill: 'JavaScript',
      course: 'JavaScript for placement preparation',
      actions: ['Conditions and loops', 'Functions and arrays', 'Practice coding problems'],
    },
    {
      skill: 'SQL',
      course: 'SQL and database preparation',
      actions: ['SELECT and WHERE', 'JOIN and GROUP BY', 'Practice 20 queries'],
    },
    {
      skill: 'Algorithms',
      course: 'Data Structures and Algorithms',
      actions: ['Searching and sorting', 'Big-O complexity', 'Practice coding problems'],
    },
    {
      skill: 'Computer Networks',
      course: 'Computer Networks fundamentals',
      actions: ['OSI and TCP/IP', 'HTTP and networking devices', 'Practice interview questions'],
    },
    {
      skill: 'Communication',
      course: 'Professional communication and interview skills',
      actions: ['Professional sentences', 'Self introduction', 'Mock HR interview'],
    },
    {
      skill: 'DBMS',
      course: 'DBMS and SQL interview preparation',
      actions: ['Keys and normalization', 'Transactions', 'Practice interview questions'],
    },
    {
      skill: 'Data Structures',
      course: 'Data Structures and Algorithms',
      actions: ['Stack and queue', 'Linked lists and trees', 'Practice coding problems'],
    },
    {
      skill: 'Operating Systems',
      course: 'Operating Systems fundamentals',
      actions: ['Processes and threads', 'Memory management', 'Practice interview questions'],
    },
    {
      skill: 'Aptitude',
      course: 'Placement aptitude practice',
      actions: ['Percentages and ratios', 'Number problems', 'Timed practice sets'],
    },
    {
      skill: 'Java',
      course: 'Java and OOP interview preparation',
      actions: ['OOP concepts', 'Collections and exceptions', 'Practice output questions'],
    },
  ];

  if (!result) {
    return (
      <div>
        <PageIntro
          eyebrow="Placement roadmap"
          title="Build your path to placement readiness."
          description="Complete the Skill Assessment first. SkillBridge will use your results to create a personalized learning roadmap."
        />

        <section className="rounded-[1.25rem] border border-card-border bg-card p-8 text-center">
          <Target size={34} className="mx-auto text-primary" />

          <h2 className="display mt-4 text-2xl font-bold">
            Assessment required
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Take the 24-question assessment to identify your weaker areas and generate your roadmap.
          </p>

          <Link
            href="/assessment"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Take assessment
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    );
  }

  const rankedSkills = Object.entries(result.skillResults)
    .map(([skill, item]) => ({
      skill,
      percentage: Math.round((item.correct / item.total) * 100),
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const roadmap = rankedSkills
    .filter((item) => item.percentage < 80)
    .map((item) => {
      const base = roadmapItems.find((roadmapItem) => roadmapItem.skill === item.skill);

      return {
        ...item,
        course: base?.course || `${item.skill} improvement plan`,
        actions: base?.actions || [
          `Review ${item.skill} fundamentals`,
          `Practice ${item.skill} questions`,
          `Complete a ${item.skill} learning path`,
        ],
      };
    });

  return (
    <div>
      <PageIntro
        eyebrow="Placement roadmap"
        title="Your personalized next steps."
        description="The roadmap is ordered from your lowest assessment areas to your stronger areas, so you can focus your practice where your current test performance is lower."
      />

      <div className="grid gap-7 lg:grid-cols-[.75fr_1.25fr]">
        <aside className="h-fit rounded-[1.25rem] bg-primary p-8 text-primary-foreground lg:sticky lg:top-24">
          <p className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/70">
            Placement readiness
          </p>

          <p className="display mt-3 text-6xl font-bold">
            {result.readinessScore}%
          </p>

          <p className="mt-3 text-sm text-primary-foreground/75">
            {result.score} correct out of {result.total} questions
          </p>

          <div className="mt-7 border-t border-primary-foreground/15 pt-6">
            <p className="text-sm font-semibold">
              Focus areas
            </p>

            {rankedSkills.slice(0, 5).map((item) => (
              <div
                key={item.skill}
                className="mt-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span>{item.skill}</span>
                  <span>{item.percentage}%</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-foreground/10">
                  <div
                    className="h-full rounded-full bg-primary-foreground"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/assessment"
            className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
          >
            Retake assessment
            <ArrowRight size={16} />
          </Link>
        </aside>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Recommended sequence
              </p>

              <h2 className="display mt-2 text-2xl font-bold">
                Your learning roadmap
              </h2>
            </div>

            <Link
              href="/courses"
              className="focus-ring text-xs font-bold text-primary hover:underline"
            >
              Browse courses <ArrowRight size={13} className="ml-1 inline" />
            </Link>
          </div>

          {roadmap.length ? (
            <div className="grid gap-4">
              {roadmap.map((item, index) => (
                <article
                  key={item.skill}
                  className="rounded-[1.25rem] border border-card-border bg-card p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold text-primary">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="display text-xl font-bold">
                          Improve {item.skill}
                        </h3>

                        <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold">
                          Current score: {item.percentage}%
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        Recommended learning path: <span className="font-semibold text-foreground">{item.course}</span>
                      </p>

                      <div className="mt-5 grid gap-2">
                        {item.actions.map((action) => (
                          <div
                            key={action}
                            className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm"
                          >
                            <Check size={15} className="text-primary" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="rounded-[1.25rem] border border-card-border bg-card p-8 text-center">
              <Check size={32} className="mx-auto text-primary" />

              <h3 className="display mt-4 text-2xl font-bold">
                No priority gaps found
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Your current assessment performance is strong across all measured areas. Continue practising and retake the assessment later.
              </p>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

function Router() {
  return (
    <AppShell>
      <ErrorBoundary resetKey={useLocation()[0]}>
        <Switch>
          <Route
            path="/"
            component={DashboardPage}
          />

          <Route
            path="/courses"
            component={CoursesPage}
          />

          <Route
            path="/courses/:id"
            component={CourseDetailPage}
          />

          <Route
            path="/mentors"
            component={MentorsPage}
          />

          <Route
            path="/sessions"
            component={SessionsPage}
          />

          <Route
            path="/profile"
            component={ProfilePage}
          />

          <Route
            path="/assessment"
            component={SkillAssessmentPage}
          />

          <Route
            path="/roadmap"
            component={PlacementRoadmapPage}
          />

          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, '')}
        >
          <Router />
        </WouterRouter>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;