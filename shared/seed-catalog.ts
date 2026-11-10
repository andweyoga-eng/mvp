/** Demo catalogue inserted on first boot — safe to purge for QA. */
export const SEED_CLASS_TYPE_NAMES = [
  "Hatha Yoga",
  "Hyyocross",
  "Meditation",
  "Sound Therapy",
] as const;

export const SEED_INSTRUCTOR_NAMES = [
  "Sarah Johnson",
  "Michael Chen",
  "David Kumar",
  "Lisa Thompson",
] as const;

/** Integration-test fixtures (erasure-lifecycle.integration.test.ts, etc.). */
export const QA_FIXTURE_CLASS_TYPE_PREFIX = "Erasure Fixture ";

export const QA_FIXTURE_INSTRUCTOR_PREFIXES = [
  "Instructor erase-",
  "Instructor withdraw-",
] as const;

export const QA_FIXTURE_INSTRUCTOR_EXACT = [
  "Instructor control",
  "Instructor admin-delete",
  "Instructor executor",
] as const;

/** Member accounts created by integration tests. */
export const QA_FIXTURE_USER_EMAIL_PREFIXES = ["erasure-", "consent-"] as const;

export const QA_FIXTURE_USER_EMAIL_DOMAIN = "@example.com";

/** Payment QR rows from payment-qr.test.ts integration runs. */
export const QA_FIXTURE_QR_NAME_PREFIX = "Test QR";

/** Ephemeral rows from `npm run qa:smoke-a01-e01` — always deleted in script finally + db:purge-seed. */
export const QA_SMOKE_CLASS_TYPE_PREFIX = "Smoke QA ";
export const QA_SMOKE_INSTRUCTOR_PREFIX = "Smoke QA Instructor ";

/** Ephemeral rows from Cursor agent / manual agent QA — purge via db:purge-seed. */
export const QA_AGENT_CLASS_TYPE_PREFIX = "Agent QA ";
export const QA_AGENT_INSTRUCTOR_PREFIX = "Agent QA Instructor ";
export const QA_AGENT_COUPON_CODE_PREFIX = "AGENTQA";

export function isSeedClassTypeName(name: string): boolean {
  return (SEED_CLASS_TYPE_NAMES as readonly string[]).includes(name);
}

export function isSeedInstructorName(name: string): boolean {
  return (SEED_INSTRUCTOR_NAMES as readonly string[]).includes(name);
}

export function isQaFixtureClassTypeName(name: string): boolean {
  return (
    isSeedClassTypeName(name) ||
    name.startsWith(QA_FIXTURE_CLASS_TYPE_PREFIX) ||
    name.startsWith(QA_SMOKE_CLASS_TYPE_PREFIX) ||
    name.startsWith(QA_AGENT_CLASS_TYPE_PREFIX)
  );
}

export function isQaFixtureInstructorName(name: string): boolean {
  if (isSeedInstructorName(name)) return true;
  if ((QA_FIXTURE_INSTRUCTOR_EXACT as readonly string[]).includes(name)) return true;
  if (name.startsWith(QA_SMOKE_INSTRUCTOR_PREFIX)) return true;
  if (name.startsWith(QA_AGENT_INSTRUCTOR_PREFIX)) return true;
  return QA_FIXTURE_INSTRUCTOR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** True when a session type or instructor must not appear in the member-facing catalog. */
export function isExcludedFromPublicCatalog(parts: {
  classTypeName?: string | null;
  instructorName?: string | null;
}): boolean {
  const { classTypeName, instructorName } = parts;
  if (classTypeName && isQaFixtureClassTypeName(classTypeName)) return true;
  if (instructorName && isQaFixtureInstructorName(instructorName)) return true;
  return false;
}

/** Member-facing session: both type and instructor must be production catalog rows. */
export function isPublicCatalogSession(
  classType: { name: string } | null | undefined,
  instructor: { name: string } | null | undefined,
): boolean {
  if (!classType || !instructor) return false;
  return !isExcludedFromPublicCatalog({
    classTypeName: classType.name,
    instructorName: instructor.name,
  });
}

export function isQaFixtureUserEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!lower.endsWith(QA_FIXTURE_USER_EMAIL_DOMAIN)) return false;
  const local = lower.slice(0, -QA_FIXTURE_USER_EMAIL_DOMAIN.length);
  return QA_FIXTURE_USER_EMAIL_PREFIXES.some((prefix) => local.startsWith(prefix));
}

export function isQaFixtureQrName(name: string): boolean {
  return name.startsWith(QA_FIXTURE_QR_NAME_PREFIX);
}
