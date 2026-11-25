export const CLASSIFICATION_LABELS = {
  unique: 'Unique solution',
  infinite_solutions: 'Infinitely many solutions',
  no_solution: 'No valid solution',
};

export const CLASSIFICATION_NOTES = {
  unique: 'Every unknown is pinned down by an independent equation.',
  infinite_solutions: 'Fewer independent equations than unknowns, so a family of solutions satisfies the model.',
  no_solution: 'At least one row reduces to 0 = a nonzero value, which no traffic assignment can satisfy.',
};

const CLASSIFICATION_TONES = {
  unique: 'border-ok/40 bg-ok/10 text-ok',
  infinite_solutions: 'border-warn/40 bg-warn/10 text-warn',
  no_solution: 'border-danger/40 bg-danger/10 text-danger',
};

export function classificationTone(classification) {
  return CLASSIFICATION_TONES[classification] ?? 'border-line bg-raised text-muted';
}

export const COMPLEXITY_LABELS = {
  introductory: 'Introductory',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function complexityLabel(complexity) {
  return COMPLEXITY_LABELS[complexity] ?? complexity ?? 'Unclassified';
}

const SEVERITY_TONES = {
  low: 'border-accent/40 bg-accent/10 text-accent',
  medium: 'border-warn/40 bg-warn/10 text-warn',
  high: 'border-danger/40 bg-danger/10 text-danger',
  critical: 'border-danger/50 bg-danger/15 text-danger',
};

export function severityTone(severity) {
  return SEVERITY_TONES[String(severity).toLowerCase()] ?? 'border-line bg-raised text-muted';
}

export function formatVector(values) {
  if (!Array.isArray(values)) return '';
  return `[ ${values.map((value) => Number(value).toFixed(value % 1 === 0 ? 0 : 2)).join(', ')} ]`;
}

/** "R2 · Core" -> { id: "R2", role: "Core" } without inventing data. */
export function splitNodeLabel(label, fallbackId) {
  const [head, ...rest] = String(label ?? '').split(' · ');
  return {
    id: head || fallbackId || '',
    role: rest.join(' · '),
  };
}

export function formatDateTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
