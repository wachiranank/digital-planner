"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteTask, moveTask, scheduleTask, toggleDone, togglePriority, unscheduleTask } from "./actions";
import { TaskDetails, type Task } from "./task-row";
import { findTag, tagStyle, type TagDef } from "@/lib/tags";

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(
    new Date(iso),
  );
const durationMin = (t: Task) =>
  t.start_at && t.end_at ? Math.round((Date.parse(t.end_at) - Date.parse(t.start_at)) / 60e3) : 60;

/** Popup card for editing one task (used by the week and month views). */
export function TaskModal({
  task,
  tags,
  calendar,
  onClose,
}: {
  task: Task;
  tags: TagDef[];
  calendar: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  const tag = findTag(tags, task.tag);
  const scheduled = !!(task.start_at && task.end_at);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={task.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl ${pending ? "opacity-70" : ""}`}
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-100 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
            className="h-5 w-5 accent-emerald-600"
            aria-label="ทำเสร็จแล้ว"
          />
          <p className={`min-w-0 flex-1 truncate font-semibold ${task.done ? "text-stone-400 line-through" : ""}`}>
            {tag && <span className={`mr-1.5 rounded px-1.5 py-0.5 text-xs font-normal ${tagStyle(tag)!.chip}`}>{tag.label}</span>}
            {task.title}
          </p>
          <button
            onClick={() => start(() => togglePriority(task.id, !task.is_priority))}
            className={`text-xl ${task.is_priority ? "text-amber-500" : "text-stone-300 hover:text-amber-400"}`}
            aria-label={task.is_priority ? "เอาออกจากงานสำคัญ" : "ตั้งเป็นงานสำคัญ"}
          >
            {task.is_priority ? "★" : "☆"}
          </button>
          <button onClick={onClose} className="text-xl text-stone-400 hover:text-stone-700" aria-label="ปิด">
            ✕
          </button>
        </div>

        {/* when */}
        <div className="space-y-2 px-4 pt-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs font-semibold text-stone-500">วันที่</span>
            <input
              type="date"
              defaultValue={task.day}
              onChange={(e) => e.target.value && start(() => moveTask(task.id, e.target.value))}
              className="rounded-md border border-stone-300 px-2 py-1"
            />
          </label>
          {calendar && (
            <form
              action={(fd) => start(() => scheduleTask(fd))}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="w-14 shrink-0 text-xs font-semibold text-stone-500">เวลา</span>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="day" value={task.day} />
              <input
                type="time"
                name="time"
                required
                step={300}
                defaultValue={scheduled ? hhmm(task.start_at!) : "09:00"}
                className="rounded-md border border-stone-300 px-2 py-1"
              />
              <select name="minutes" defaultValue={String(durationMin(task))} className="rounded-md border border-stone-300 px-2 py-1">
                {[15, 30, 45, 60, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} นาที` : `${m / 60} ชม.`}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white">
                {scheduled ? "ย้ายเวลา" : "ลงปฏิทิน"}
              </button>
              {scheduled && (
                <button type="button" onClick={() => start(() => unscheduleTask(task.id))} className="text-stone-500 underline">
                  เอาเวลาออก
                </button>
              )}
            </form>
          )}
        </div>

        {/* details: title, category, notes, checklist, repeat */}
        <div className="-mt-1 px-1 pb-1 [&>div]:bg-transparent [&>div]:pl-3">
          <TaskDetails task={task} tags={tags} onSaved={onClose} />
        </div>

        <div className="flex justify-end border-t border-stone-100 px-4 py-3">
          <button
            onClick={() =>
              start(async () => {
                await deleteTask(task.id);
                onClose();
              })
            }
            className="text-sm text-red-600 hover:underline"
          >
            ลบงานนี้
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
