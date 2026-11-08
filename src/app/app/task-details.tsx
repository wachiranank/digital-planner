"use client";

import { useState, useTransition } from "react";
import { createTag, setChecklist, setRepeat, updateTaskDetails } from "./actions";
import { COLORS, RULES, type CheckItem, type ColorKey, type TagDef } from "@/lib/tags";

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

export function TaskDetails({ task, tags, onSaved }: { task: Task; tags: TagDef[]; onSaved: () => void }) {
  const [pending, start] = useTransition();
  const [selTag, setSelTag] = useState<string>(task.tag ?? "");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<ColorKey>("teal");
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
        <input type="hidden" name="tag" value={selTag} />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="หมวด">
          <button
            type="button"
            role="radio"
            aria-checked={!selTag}
            onClick={() => setSelTag("")}
            className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-stone-300 ${!selTag ? "bg-stone-800 text-white" : "bg-white"}`}
          >
            ไม่มีหมวด
          </button>
          {tags.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={selTag === t.key}
              onClick={() => setSelTag(t.key)}
              className={`rounded-full px-2.5 py-1 text-xs ${COLORS[t.color].chip} ${selTag === t.key ? "ring-2 ring-stone-800" : "opacity-60"}`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="rounded-full px-2.5 py-1 text-xs border border-dashed border-stone-400 text-stone-600"
          >
            + หมวดใหม่
          </button>
        </div>
        {adding && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-white p-2 ring-1 ring-stone-200">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              placeholder="ชื่อหมวด เช่น ลูกค้า A"
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1"
            />
            <div className="flex gap-1">
              {(Object.keys(COLORS) as ColorKey[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  title={COLORS[c].name}
                  aria-label={COLORS[c].name}
                  className={`h-5 w-5 rounded-full ${COLORS[c].dot} ${newColor === c ? "ring-2 ring-stone-800 ring-offset-1" : ""}`}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={!newName.trim() || pending}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("name", newName);
                  fd.set("color", newColor);
                  const { id } = await createTag(fd);
                  if (id) setSelTag(id);
                  setNewName("");
                  setAdding(false);
                })
              }
              className="rounded-md bg-stone-800 px-3 py-1 text-white disabled:opacity-40"
            >
              สร้าง
            </button>
          </div>
        )}
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
