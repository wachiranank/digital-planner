"use client";

import { useState, useTransition } from "react";
import { toggleDone, togglePriority } from "./actions";
import { findTag, tagStyle, type TagDef } from "@/lib/tags";
import { TaskModal } from "./task-modal";

export type { Task } from "./task-details";
import type { Task } from "./task-details";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(
    new Date(iso),
  );
const shortDay = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );

/** A task line on the Today page. Tap it to open the edit popup. */
export function TaskRow({
  task,
  calendar,
  tags,
  showDay = false,
  index,
}: {
  task: Task;
  calendar: boolean;
  tags: TagDef[];
  showDay?: boolean;
  index?: number;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const items = task.checklist ?? [];
  const doneItems = items.filter((i) => i.d).length;
  const tag = findTag(tags, task.tag);
  const style = tagStyle(tag);

  return (
    <li className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 ${pending ? "opacity-50" : ""}`}>
      {index !== undefined && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
          {index}
        </span>
      )}
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
        className="h-5 w-5 shrink-0 cursor-pointer accent-emerald-600"
        aria-label="ทำเสร็จแล้ว"
      />
      <button onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left" title="แก้ไขงาน">
        <span className={`block truncate ${task.done ? "text-stone-400 line-through" : "text-stone-800"}`}>{task.title}</span>
        {(tag || task.start_at || task.recur_id || items.length > 0 || task.notes || showDay) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
            {tag && style && <span className={`rounded px-1.5 py-0.5 ${style.chip}`}>{tag.label}</span>}
            {task.start_at && task.end_at && (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700">
                {fmt(task.start_at)}–{fmt(task.end_at)}
              </span>
            )}
            {showDay && task.day && <span className="text-amber-700">จาก {shortDay(task.day)}</span>}
            {task.recur_id && <span title="งานทำซ้ำ">🔁</span>}
            {items.length > 0 && (
              <span>
                ☑ {doneItems}/{items.length}
              </span>
            )}
            {task.notes && <span>📝</span>}
          </span>
        )}
      </button>
      {!task.done && (
        <button
          onClick={() => start(() => togglePriority(task.id, !task.is_priority))}
          className={`shrink-0 text-xl ${task.is_priority ? "text-amber-500" : "text-stone-300 hover:text-amber-400"}`}
          aria-label={task.is_priority ? "เอาออกจากงานสำคัญ" : "ตั้งเป็นงานสำคัญ"}
        >
          {task.is_priority ? "★" : "☆"}
        </button>
      )}
      {open && <TaskModal task={task} tags={tags} calendar={calendar} onClose={() => setOpen(false)} />}
    </li>
  );
}

