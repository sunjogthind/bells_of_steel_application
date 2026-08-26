export type SpotterDoc = {
  id: string;
  kind: 'exercise' | 'knowledge' | 'product';
  title: string;
  meta: any;
  tf: Record<string, number>;
  len: number;
};

export type SpotterIndex = {
  stats: { docs: number; exercises: number; knowledge: number; products: number; terms: number; avgLen: number };
  bm25: { k1: number; b: number; avgLen: number };
  idf: Record<string, number>;
  concepts: Record<string, string[]>;
  docs: SpotterDoc[];
  equipment: { id: string; label: string; aliases: string[] }[];
};

export type Goal = 'strength' | 'hypertrophy' | 'fatloss' | 'general';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export type Profile = {
  goal: Goal | null;
  experience: Experience | null;
  days: number | null;
  sessionMins: number | null;
  equipment: string[];
  constraints: string[];
};

export type Retrieved = { doc: SpotterDoc; score: number; why: string[] };

export type Slot = {
  pattern: string;
  exerciseId: string | null;
  name: string;
  sets: number;
  reps: string;
  rpe: string;
  note?: string;
  gap?: { pattern: string; needs: string[] };
};

export type Session = { day: number; label: string; warmup: string[]; slots: Slot[] };

export type Program = {
  split: string;
  rationale: string;
  sessions: Session[];
  gaps: { pattern: string; needs: string[]; product?: { title: string; url: string; priceCents: number } }[];
  progression: string;
};

export type Intent =
  | 'profile' | 'generate' | 'swap' | 'adjust_days' | 'equipment_change'
  | 'explain' | 'product' | 'injury' | 'app' | 'unknown';

export type Reply = {
  intent: Intent;
  text: string[];
  escalate: boolean;
  citations: { title: string; kind: string; note: string; url?: string }[];
  trace: string[];
  profile: Profile;
  program: Program | null;
  composedBy: 'deterministic' | 'claude';
};
