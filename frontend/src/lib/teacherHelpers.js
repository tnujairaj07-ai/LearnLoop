/**
 * Deduplicate teacher class assignments by class_id while preserving all assigned subject labels.
 */
export function groupTeacherClasses(assignedClasses = []) {
  const map = new Map();
  assignedClasses.forEach((c) => {
    if (!c?.class_id) return;
    if (!map.has(c.class_id)) {
      map.set(c.class_id, {
        ...c,
        subjects: c.subject_name ? [c.subject_name] : [],
      });
    } else if (c.subject_name) {
      const existing = map.get(c.class_id);
      if (!existing.subjects.includes(c.subject_name)) {
        existing.subjects.push(c.subject_name);
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Prefer the primary populated subject (with existing chapters) before empty catalog subjects.
 */
export function pickDefaultSubject(subjects = []) {
  return (
    subjects.find((s) => Number(s.topics_count || 0) > 0 && s.code === "MATH-9-DEMO") ||
    subjects.find((s) => Number(s.topics_count || 0) > 0) ||
    subjects[0] ||
    null
  );
}
