"use client";

import { useTransition } from "react";
import { moveTask, toggleDone } from "../actions";
import { TAGS, isTag } from "@/lib/tags";

export type WeekTaskData = {
  id: string;
  title: string;
  day: string;
  is_priority: boolean;
  done: boolean;
  start_at: string | null;
  end_at: string | null;
  gcal_event_id: string | null;
  tag?: string | null;
  recur_id?: string | null;
};

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(
    new Date(iso),
  );
const short = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export function WeekTask({ task, days }: { task: WeekTaskData; days: string[] }) {
  const [pending, start] = useTransition();
  return (
    <li className={`group flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-stone-50 ${pending ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
        aria-label="ทำเสร็จแล้ว"
      />
      <span className={`flex-1 ${task.done ? "text-stone-400 line-through" : ""}`}>
        {isTag(task.tag) && (
          <span className={`mr-1 inline-block h-2 w-2 rounded-full align-middle ${TAGS[task.tag].dot}`} title={TAGS[task.tag].label} />
        )}
        {task.is_priority && !task.done && <span className="text-amber-500">★ </span>}
        {task.start_at && <span className="font-mono text-xs text-emerald-700">{hhmm(task.start_at)} </span>}
        {task.title}
        {task.recur_id && <span className="ml-1 text-xs text-stone-400">🔁</span>}
      </span>
      {!task.done && (
        // a "⇄" icon with the native day picker laid invisibly on top (works with touch on iPad/phone)
        <span className="relative shrink-0 text-stone-300 hover:text-stone-600" title="ย้ายไปวันอื่น">
          ⇄
          <select
            value={task.day}
            onChange={(e) => start(() => moveTask(task.id, e.target.value))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="ย้ายไปวันอื่น"
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {short(d)}
              </option>
            ))}
          </select>
        </span>
      )}
    </li>
  );
}
