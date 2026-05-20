import type { ActivePlanFull } from '../../lib/api/contracts';

type Translate = (key: string) => string;

function translateGoal(goal: string, t: Translate): string {
  const key = `plan.goal.${goal}`;
  const label = t(key);
  return label === key ? goal : label;
}

function translateSplit(split: string, t: Translate): string {
  const key = `plan.split.${split}`;
  const label = t(key);
  return label === key ? split.replace(/_/g, ' ') : label;
}

/** Human-readable plan title from API metadata or legacy raw name. */
export function formatPlanTitle(
  plan: Pick<ActivePlanFull, 'name' | 'trainingGoal' | 'split'>,
  t: Translate,
): string {
  if (plan.trainingGoal && plan.split) {
    return `${translateGoal(plan.trainingGoal, t)} · ${translateSplit(plan.split, t)}`;
  }

  const parts = plan.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const goal = parts[0] ?? '';
    const split = parts.slice(1).join(' ');
    return `${translateGoal(goal, t)} · ${translateSplit(split, t)}`;
  }

  return plan.name;
}
