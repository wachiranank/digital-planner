"use client";

import { useState, useTransition } from "react";
import { toggleDone, togglePriority } from "./actions";
import { findTag, ringClass, tagStyle, type TagDef } from "@/lib/tags";
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

/** Drag payload used by the Today timeline / Inbox / list drop zones (laptop). */
export const DRAG_TYPE = "application/x-planner-task";
export const dragData = (t: { id: string; start_at: string | null; end_at: string | null }) =>
  JSON.stringify({
    id: t.id,
    minutes: t.start_at && t.end_at ? Math.round((Date.parse(t.end_at) - Date.parse(t.start_at)) / 60e3) : 60,
  });

export const CheckCircle = ({ done, ring, onToggle }: { done: boolean; ring: string; onToggle: (v: boolean) => void }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={done}
    aria-label={done ? "ยังไม่เสร็จ" : "ทำเสร็จแล้ว"}
    onClick={() => onToggle(!done)}
    className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
  >
    <span
      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors ${
        done ? "border-brand-600 bg-brand-600" : `${ring} hover:bg-white`
      }`}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  </button>
);

const Ico = {
  cal: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17" />
    </svg>
  ),
  repeat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4" />
    </svg>
  ),
  list: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  star: (on: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  ),
};

/** A task line. Tap to edit; on a laptop it can be dragged onto the timeline to book a time. */
export function TaskRow({
  task,
  calendar,
  tags,
  showDay = false,
}: {
  task: Task;
  calendar: boolean;
  tags: TagDef[];
  showDay?: boolean;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const items = task.checklist ?? [];
  const doneItems = items.filter((i) => i.d).length;
  const tag = findTag(tags, task.tag);
  const style = tagStyle(tag);
  const firstNote = task.notes?.split("\n").find((l) => l.trim());

  return (
    <li
      draggable={!task.done}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, dragData(task));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group flex items-start gap-3 border-b border-stone-200/70 py-3 transition-colors last:border-0 lg:-mx-3 lg:rounded-xl lg:border-0 lg:px-3 lg:hover:bg-white lg:hover:shadow-sm ${
        pending ? "opacity-50" : ""
      } ${!task.done ? "lg:cursor-grab" : ""}`}
    >
      <span className="pt-0.5">
        <CheckCircle done={task.done} ring={ringClass(tag, task.is_priority)} onToggle={(v) => start(() => toggleDone(task.id, v))} />
      </span>
      <button onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left" title="แก้ไขงาน">
        <span className={`block text-[17px] leading-snug lg:text-[15px] ${task.done ? "text-stone-400 line-through" : "text-stone-900"}`}>
          {task.title}
        </span>
        {firstNote && !task.done && <span className="mt-0.5 block truncate text-[13px] text-stone-500">{firstNote}</span>}
        {(tag || task.start_at || task.recur_id || items.length > 0 || showDay) && !task.done && (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            {task.start_at && task.end_at && (
              <span className="flex items-center gap-1 text-indigo-600">
                {Ico.cal}
                {fmt(task.start_at)}–{fmt(task.end_at)}
              </span>
            )}
            {showDay && task.day && <span className="text-amber-700">ค้างจาก {shortDay(task.day)}</span>}
            {task.recur_id && <span className="flex items-center gap-1 text-stone-500">{Ico.repeat}ทำซ้ำ</span>}
            {items.length > 0 && (
              <span className="flex items-center gap-1 text-stone-500">
                {Ico.list}
                {doneItems}/{items.length}
              </span>
            )}
            {tag && style && <span className={`rounded-md px-2 py-px text-xs ${style.chip}`}>{tag.label}</span>}
          </span>
        )}
      </button>
      {!task.done && (
        <button
          onClick={() => start(() => togglePriority(task.id, !task.is_priority))}
          className={`-m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            task.is_priority ? "text-amber-500" : "text-stone-300 hover:text-amber-400 lg:opacity-0 lg:group-hover:opacity-100"
          }`}
          aria-label={task.is_priority ? "เอาออกจากงานสำคัญ" : "ตั้งเป็นงานสำคัญ"}
        >
          {Ico.star(task.is_priority)}
        </button>
      )}
      {open && <TaskModal task={task} tags={tags} calendar={calendar} onClose={() => setOpen(false)} />}
    </li>
  );
}
