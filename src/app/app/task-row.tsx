"use client";

import { useState, useTransition } from "react";
import { deleteTask, scheduleTask, setChecklist, setRepeat, toggleDone, togglePriority, unscheduleTask, updateTaskDetails } from "./actions";
import { RULES, TAGS, isTag, type CheckItem } from "@/lib/tags";

export type Task = {
  id: string;
  title: string;
  day: string;
  is_priority: boolean;
  done: boolean;
  start_at: string | null;
  end_at: string | null;
  gcal_event_id: string | null;
  notes?: string | null;
  tag?: string | null;
  checklist?: CheckItem[];
  recur_id?: string | null;
  rule?: string | null;
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
  const [details, setDetails] = useState(false);
  const scheduled = task.start_at && task.end_at;
  const items = task.checklist ?? [];
  const doneItems = items.filter((i) => i.d).length;
  const tag = isTag(task.tag) ? TAGS[task.tag] : null;

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
        <button
          onClick={() => setDetails((d) => !d)}
          className={`flex-1 text-left ${task.done ? "text-stone-400 line-through" : ""}`}
          aria-expanded={details}
          title="ดูรายละเอียด"
        >
          {tag && <span className={`mr-1.5 rounded px-1.5 py-0.5 text-xs ${tag.chip}`}>{tag.label}</span>}
          {task.title}
          {task.recur_id && <span className="ml-1.5 text-xs text-stone-400" title="งานทำซ้ำ">🔁</span>}
          {items.length > 0 && (
            <span className="ml-1.5 text-xs text-stone-400">
              ☑ {doneItems}/{items.length}
            </span>
          )}
          {task.notes && <span className="ml-1.5 text-xs text-stone-400">📝</span>}
          {scheduled && (
            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs text-emerald-700">
              {fmt(task.start_at!)}–{fmt(task.end_at!)}
            </span>
          )}
        </button>
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

      {details && <TaskDetails task={task} onSaved={() => setDetails(false)} />}
    </li>
  );
}

function TaskDetails({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [pending, start] = useTransition();
  const [items, setItems] = useState<CheckItem[]>(task.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const saveItems = (next: CheckItem[]) => {
    setItems(next);
    start(() => setChecklist(task.id, next));
  };

  return (
    <div className={`mt-3 space-y-3 rounded-lg bg-stone-50 p-3 pl-8 text-sm ${pending ? "opacity-60" : ""}`}>
      <form
        action={(fd) => {
          start(async () => {
            await updateTaskDetails(fd);
            onSaved();
          });
        }}
        className="space-y-2"
      >
        <input type="hidden" name="id" value={task.id} />
        <input
          name="title"
          defaultValue={task.title}
          maxLength={500}
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 font-medium"
          aria-label="ชื่องาน"
        />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="หมวด">
          <label className="cursor-pointer">
            <input type="radio" name="tag" value="" defaultChecked={!task.tag} className="peer sr-only" />
            <span className="rounded-full px-2.5 py-1 text-xs ring-1 ring-stone-300 peer-checked:bg-stone-800 peer-checked:text-white">
              ไม่มีหมวด
            </span>
          </label>
          {Object.entries(TAGS).map(([k, t]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="tag" value={k} defaultChecked={task.tag === k} className="peer sr-only" />
              <span className={`rounded-full px-2.5 py-1 text-xs ${t.chip} opacity-60 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-stone-800`}>
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <textarea
          name="notes"
          defaultValue={task.notes ?? ""}
          rows={3}
          maxLength={5000}
          placeholder="โน้ต / รายละเอียด / ลิงก์"
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5"
        />
        <button className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white">บันทึก</button>
      </form>

      <div>
        <p className="text-xs font-semibold text-stone-500">เช็กลิสต์</p>
        <ul className="mt-1 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={it.d}
                onChange={(e) => saveItems(items.map((x, j) => (j === i ? { ...x, d: e.target.checked } : x)))}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className={`flex-1 ${it.d ? "text-stone-400 line-through" : ""}`}>{it.t}</span>
              <button onClick={() => saveItems(items.filter((_, j) => j !== i))} className="text-stone-300 hover:text-red-500" aria-label="ลบ">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItem.trim()) return;
            saveItems([...items, { t: newItem.trim(), d: false }]);
            setNewItem("");
          }}
          className="mt-1"
        >
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="+ เพิ่มรายการย่อย"
            maxLength={200}
            className="w-full rounded-md border border-transparent bg-white px-2 py-1 focus:border-stone-300"
          />
        </form>
      </div>

      <label className="flex items-center gap-2">
        <span className="text-xs font-semibold text-stone-500">ทำซ้ำ</span>
        <select
          defaultValue={task.recur_id ? (task.rule ?? "none") : "none"}
          onChange={(e) => start(() => setRepeat(task.id, e.target.value))}
          className="rounded-md border border-stone-300 bg-white px-2 py-1"
        >
          <option value="none">ไม่ทำซ้ำ</option>
          {Object.entries(RULES).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
