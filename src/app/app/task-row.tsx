"use client";

import { useTransition } from "react";
import { deleteTask, toggleDone, togglePriority } from "./actions";

export type Task = { id: string; title: string; day: string; is_priority: boolean; done: boolean };

export function TaskRow({ task }: { task: Task }) {
  const [pending, start] = useTransition();
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => start(() => toggleDone(task.id, e.target.checked))}
        className="h-5 w-5 accent-emerald-600"
        aria-label="ทำเสร็จแล้ว"
      />
      <span className={`flex-1 ${task.done ? "text-stone-400 line-through" : ""}`}>{task.title}</span>
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
    </li>
  );
}
