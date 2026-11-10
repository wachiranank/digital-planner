"use client";

import { useState, useTransition } from "react";
import { deleteTask, moveTask, moveToInbox, rolloverAll, toggleDone } from "./actions";
import { findTag, tagStyle, type TagDef } from "@/lib/tags";
import { TaskModal } from "./task-modal";
import type { Task } from "./task-details";

const todayBkk = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const plusDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const shortDay = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );

const chip =
  "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors disabled:opacity-40";

/**
 * A task that still needs a decision: left over from an earlier day ("carried")
 * or waiting in the Inbox ("inbox"). One tap plans it — no guilt, no red badges.
 */
export function PlanRow({
  task,
  tags,
  calendar,
  mode,
}: {
  task: Task;
  tags: TagDef[];
  calendar: boolean;
  mode: "carried" | "inbox";
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = todayBkk();
  const tag = findTag(tags, task.tag);
  const style = tagStyle(tag);
  const items = task.checklist ?? [];

  return (
    <li className={`px-4 py-3 transition-colors hover:bg-stone-50 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
          className="h-5 w-5 shrink-0 cursor-pointer accent-emerald-600"
          aria-label="ทำเสร็จแล้ว"
        />
        <button onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left" title="แก้ไขงาน">
          <span className="block truncate text-stone-800">{task.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
            {tag && style && <span className={`rounded px-1.5 py-0.5 ${style.chip}`}>{tag.label}</span>}
            {mode === "carried" && task.day && <span className="text-amber-700">จาก {shortDay(task.day)}</span>}
            {items.length > 0 && (
              <span>
                ☑ {items.filter((i) => i.d).length}/{items.length}
              </span>
            )}
            {task.notes && <span>📝</span>}
          </span>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
        <button
          disabled={pending}
          onClick={() => start(() => moveTask(task.id, today))}
          className={`${chip} bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100`}
        >
          ▶ ทำวันนี้
        </button>
        <button
          disabled={pending}
          onClick={() => start(() => moveTask(task.id, plusDays(today, 1)))}
          className={`${chip} bg-white text-stone-700 ring-stone-200 hover:bg-stone-100`}
        >
          พรุ่งนี้
        </button>
        {/* native date picker laid invisibly over the chip (works with touch) */}
        <span className={`${chip} relative bg-white text-stone-700 ring-stone-200 hover:bg-stone-100`}>
          📅 เลือกวัน
          <input
            type="date"
            min={today}
            onChange={(e) => e.target.value && start(() => moveTask(task.id, e.target.value))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="เลือกวัน"
          />
        </span>
        {mode === "carried" && (
          <button
            disabled={pending}
            onClick={() => start(() => moveToInbox(task.id))}
            className={`${chip} bg-white text-stone-700 ring-stone-200 hover:bg-stone-100`}
            title="ยังไม่แน่ใจว่าจะทำวันไหน — พักไว้ใน Inbox ก่อน"
          >
            📥 Inbox
          </button>
        )}
        {confirmDelete ? (
          <span className="flex items-center gap-1.5 text-xs">
            <button
              disabled={pending}
              onClick={() => start(() => deleteTask(task.id))}
              className={`${chip} bg-red-600 text-white ring-red-600`}
            >
              ยืนยันลบ
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-stone-500 underline">
              ยกเลิก
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-auto text-xs text-stone-400 hover:text-red-600"
            title="ไม่ต้องทำแล้ว"
          >
            ไม่ทำแล้ว
          </button>
        )}
      </div>

      {open && <TaskModal task={task} tags={tags} calendar={calendar} onClose={() => setOpen(false)} />}
    </li>
  );
}

/** Header buttons for the "left over" section: handle every leftover task at once. */
export function RolloverAllButtons() {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap gap-1.5 ${pending ? "opacity-50" : ""}`}>
      <button
        disabled={pending}
        onClick={() => start(() => rolloverAll("today"))}
        className={`${chip} bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700`}
      >
        ทำวันนี้ทั้งหมด
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => rolloverAll("inbox"))}
        className={`${chip} bg-white text-stone-700 ring-stone-200 hover:bg-stone-100`}
      >
        📥 พักไว้ใน Inbox ทั้งหมด
      </button>
    </div>
  );
}
