"use client";

import { useState, useTransition } from "react";
import { deleteTask, scheduleTask, toggleDone, togglePriority, unscheduleTask } from "./actions";

export type Task = {
  id: string;
  title: string;
  day: string;
  is_priority: boolean;
  done: boolean;
  start_at: string | null;
  end_at: string | null;
  gcal_event_id: string | null;
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(
    new Date(iso),
  );

/** next half hour in Bangkok, e.g. "14:30" */
function nextSlot() {
  const now = new Date(Date.now() + 7 * 3600_000);
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  const n = Math.min(Math.ceil((m + 1) / 30) * 30, 23 * 60 + 30);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

export function TaskRow({ task, calendar }: { task: Task; calendar: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const scheduled = task.start_at && task.end_at;

  return (
    <li className={`px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
          className="h-5 w-5 accent-emerald-600"
          aria-label="ทำเสร็จแล้ว"
        />
        <span className={`flex-1 ${task.done ? "text-stone-400 line-through" : ""}`}>
          {task.title}
          {scheduled && (
            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs text-emerald-700">
              {fmt(task.start_at!)}–{fmt(task.end_at!)}
            </span>
          )}
        </span>
        {calendar && !task.done && (
          <button
            onClick={() => setOpen((o) => !o)}
            className={`text-lg ${scheduled ? "text-emerald-600" : "text-stone-300 hover:text-emerald-600"}`}
            aria-label="ลงเวลาใน Google Calendar"
            title="ลงเวลาใน Google Calendar"
          >
            ⏰
          </button>
        )}
        {!task.done && (
          <button
            onClick={() => start(() => togglePriority(task.id, !task.is_priority))}
            className={`text-xl ${task.is_priority ? "text-amber-500" : "text-stone-300 hover:text-amber-400"}`}
            aria-label={task.is_priority ? "เอาออกจากงานสำคัญ" : "ตั้งเป็นงานสำคัญ"}
          >
            {task.is_priority ? "★" : "☆"}
          </button>
        )}
        <button
          onClick={() => start(() => deleteTask(task.id))}
          className="text-stone-300 hover:text-red-500"
          aria-label="ลบ"
        >
          ✕
        </button>
      </div>

      {open && (
        <form
          action={(fd) => {
            setOpen(false);
            start(() => scheduleTask(fd));
          }}
          className="mt-2 flex flex-wrap items-center gap-2 pl-8 text-sm"
        >
          <input type="hidden" name="id" value={task.id} />
          <span className="text-stone-500">วันนี้ เวลา</span>
          <input
            type="time"
            name="time"
            required
            step={300}
            defaultValue={scheduled ? fmt(task.start_at!) : nextSlot()}
            className="rounded-lg border border-stone-300 px-2 py-1"
          />
          <select name="minutes" defaultValue="60" className="rounded-lg border border-stone-300 px-2 py-1">
            <option value="15">15 นาที</option>
            <option value="30">30 นาที</option>
            <option value="60">1 ชม.</option>
            <option value="90">1.5 ชม.</option>
            <option value="120">2 ชม.</option>
            <option value="180">3 ชม.</option>
          </select>
          <button className="rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white">ลงปฏิทิน</button>
          {scheduled && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                start(() => unscheduleTask(task.id));
              }}
              className="text-stone-500 underline"
            >
              เอาออกจากปฏิทิน
            </button>
          )}
        </form>
      )}
    </li>
  );
}
