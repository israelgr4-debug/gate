'use client';

import { useState } from 'react';
import type { AccessRule } from '@/lib/types';
import { DAY_NAMES } from '@/lib/types';
import { createRule, deleteRule, toggleRule } from '@/lib/actions/rules';

interface Props {
  vehicleId: string;
  rules: AccessRule[];
}

export function RulesEditor({ vehicleId, rules }: Props) {
  const [ruleType, setRuleType] = useState<AccessRule['rule_type']>('always');

  const createBound = createRule.bind(null, vehicleId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900/40">
        <h3 className="font-semibold mb-4">כלל הרשאה חדש</h3>
        <form action={createBound} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">סוג כלל</label>
            <select
              name="rule_type"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as AccessRule['rule_type'])}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            >
              <option value="always">תמיד</option>
              <option value="weekly">חלון שבועי (ימים + שעות)</option>
              <option value="date_range">טווח תאריכים</option>
              <option value="one_time">חד-פעמי</option>
            </select>
          </div>

          {ruleType === 'weekly' && (
            <div>
              <label className="block text-sm mb-2">ימי שבוע</label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800"
                  >
                    <input type="checkbox" name={`day_${i}`} className="w-4 h-4" />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {(ruleType === 'weekly' || ruleType === 'date_range' || ruleType === 'one_time') && (
            <div className="grid grid-cols-2 gap-3">
              <TimeField label="משעה" name="time_from" />
              <TimeField label="עד שעה" name="time_to" />
            </div>
          )}

          {(ruleType === 'date_range' || ruleType === 'one_time') && (
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label={ruleType === 'one_time' ? 'תאריך' : 'מתאריך'}
                name="valid_from"
                required={ruleType === 'one_time'}
              />
              {ruleType === 'date_range' && <DateField label="עד תאריך" name="valid_to" />}
            </div>
          )}

          <button
            type="submit"
            className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-medium"
          >
            הוסף כלל
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">כללים קיימים ({rules.length})</h3>
        {rules.length === 0 && (
          <p className="text-sm text-slate-500">
            אין כללים — הרכב לא יוכל לפתוח את השער עד שיוגדר כלל פעיל אחד לפחות.
          </p>
        )}
        {rules.map((r) => (
          <RuleRow key={r.id} rule={r} vehicleId={vehicleId} />
        ))}
      </div>
    </div>
  );
}

function RuleRow({ rule, vehicleId }: { rule: AccessRule; vehicleId: string }) {
  const toggle = toggleRule.bind(null, vehicleId, rule.id, !rule.active);
  const del = deleteRule.bind(null, vehicleId, rule.id);
  return (
    <div className="rounded-xl border border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="font-medium">{describeRule(rule)}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {rule.active ? <span className="text-emerald-400">פעיל</span> : <span>מושבת</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <form action={toggle}>
          <button className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
            {rule.active ? 'השבת' : 'הפעל'}
          </button>
        </form>
        <form action={del}>
          <button className="text-sm px-3 py-1.5 rounded-lg border border-rose-900 text-rose-300 hover:bg-rose-950/40">
            מחק
          </button>
        </form>
      </div>
    </div>
  );
}

function describeRule(r: AccessRule): string {
  const timeWin = r.time_from && r.time_to ? ` ${r.time_from.slice(0, 5)}–${r.time_to.slice(0, 5)}` : '';
  switch (r.rule_type) {
    case 'always':
      return 'תמיד';
    case 'weekly': {
      const days = r.days_of_week.map((d) => DAY_NAMES[d] ?? '?').join(', ');
      return `שבועי — ${days}${timeWin}`;
    }
    case 'date_range':
      return `טווח: ${r.valid_from ?? '∞'} – ${r.valid_to ?? '∞'}${timeWin}`;
    case 'one_time':
      return `חד-פעמי: ${r.valid_from ?? '?'}${timeWin}`;
  }
}

function TimeField({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type="time"
        name={name}
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
      />
    </div>
  );
}

function DateField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type="date"
        name={name}
        required={required}
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
      />
    </div>
  );
}
