/** Case-insensitive + trim uniqueness for class_types.name (OI-12 / A2). */

export function normalizeClassTypeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function classTypeNameKey(name: string): string {
  return normalizeClassTypeName(name).toLowerCase();
}

export function classTypeNamesCollide(a: string, b: string): boolean {
  return classTypeNameKey(a) === classTypeNameKey(b);
}

/** Admin picker label: name + duration + short id so duplicate-looking rows stay distinguishable. */
export function formatClassTypeOptionLabel(ct: {
  id: string;
  name: string;
  duration?: number | null;
}): string {
  const shortId = ct.id.slice(0, 8);
  const duration =
    typeof ct.duration === "number" && ct.duration > 0 ? `${ct.duration}min` : null;
  return [ct.name, duration, `#${shortId}`].filter(Boolean).join(" · ");
}
