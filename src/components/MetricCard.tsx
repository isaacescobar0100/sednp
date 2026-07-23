import React from "react";
import { LucideIcon } from "lucide-react";
type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'night' | 'gold' | 'brick' | 'green';
};
const toneStyles = {
  night: 'bg-night/8 text-night',
  gold: 'bg-gold/15 text-[#9a6b20]',
  brick: 'bg-brick/10 text-brick',
  green: 'bg-emerald-600/10 text-emerald-700'
};
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'night'
}: MetricCardProps) {
  return <article className="rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-[0_6px_22px_rgba(15,27,61,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink/45">{label}</p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/55">{detail}</p>
    </article>;
}
