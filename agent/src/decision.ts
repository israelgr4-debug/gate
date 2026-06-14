import type { Vehicle, AccessRule } from './types.js';
import { localNow, localDateISO, localTimeHMS, timeInRange, dateInRange } from './lib/time.js';

export interface DecisionResult {
  granted: boolean;
  reason: string;
  matchedRuleId: string | null;
}

export function evaluate(
  vehicle: Vehicle,
  rules: AccessRule[],
  now: Date = new Date(),
): DecisionResult {
  if (!vehicle.active) {
    return { granted: false, reason: 'vehicle_inactive', matchedRuleId: null };
  }

  const active = rules.filter((r) => r.active);
  if (active.length === 0) {
    return { granted: false, reason: 'no_active_rules', matchedRuleId: null };
  }

  const parts = localNow(now);
  const today = localDateISO(parts);
  const nowTime = localTimeHMS(parts);
  const dow = parts.weekday;

  for (const r of active) {
    switch (r.rule_type) {
      case 'always':
        return { granted: true, reason: 'rule_always', matchedRuleId: r.id };

      case 'weekly': {
        if (!r.days_of_week.includes(dow)) continue;
        if (r.time_from && r.time_to && !timeInRange(nowTime, r.time_from, r.time_to)) continue;
        return { granted: true, reason: 'rule_weekly', matchedRuleId: r.id };
      }

      case 'date_range': {
        if (!dateInRange(today, r.valid_from, r.valid_to)) continue;
        if (r.time_from && r.time_to && !timeInRange(nowTime, r.time_from, r.time_to)) continue;
        return { granted: true, reason: 'rule_date_range', matchedRuleId: r.id };
      }

      case 'one_time': {
        if (r.valid_from !== today) continue;
        if (r.time_from && r.time_to && !timeInRange(nowTime, r.time_from, r.time_to)) continue;
        return { granted: true, reason: 'rule_one_time', matchedRuleId: r.id };
      }
    }
  }

  return { granted: false, reason: 'no_rule_matched', matchedRuleId: null };
}
