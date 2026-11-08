"use client";

import { useState } from "react";
import type { TagDef } from "@/lib/tags";
import type { Task } from "../task-details";
import { TaskModal } from "../task-modal";

/** A task line inside a month cell: opens the edit popup instead of selecting the day. */
export function MonthChip({ task, dot, tags, calendar }: { task: Task; dot: string; tags: TagDef[]; calendar: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`relative z-10 flex w-full items-center gap-1 truncate rounded px-0.5 text-left text-[11px] leading-4 hover:bg-white ${
          task.done ? "text-stone-400 line-through" : ""
        }`}
        title={task.title}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{task.title}</span>
      </button>
      {open && <TaskModal task={task} tags={tags} calendar={calendar} onClose={() => setOpen(false)} />}
    </>
  );
}
