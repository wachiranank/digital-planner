"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { addTask, moveTask } from "./actions";
import { DRAG_TYPE, dragData, type Task } from "./task-row";
import { findTag, tagStyle, type TagDef } from "@/lib/tags";
import { TaskModal } from "./task-modal";

function Card({ task, tags, calendar, today }: { task: Task; tags: TagDef[]; calendar: boolean; today: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const tag = findTag(tags, task.tag);
  const style = tagStyle(tag);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, dragData(task));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group cursor-grab rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:border-stone-300 ${pending ? "opacity-50" : ""}`}
    >
      <button onClick={() => setOpen(true)} className="block w-full text-left text-[15px] leading-snug text-stone-900">
        {task.title}
      </button>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {tag && style && <span className={`rounded-md px-2 py-px ${style.chip}`}>{tag.label}</span>}
        <button
          onClick={() => start(() => moveTask(task.id, today))}
          className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700 opacity-0 hover:bg-brand-100 focus:opacity-100 group-hover:opacity-100"
        >
          ทำวันนี้
        </button>
      </div>
      {open && <TaskModal task={task} tags={tags} calendar={calendar} onClose={() => setOpen(false)} />}
    </li>
  );
}

/** Laptop Today page, left column: the Inbox as cards to drag into today or onto the timeline. */
export function InboxColumn({ tasks, tags, calendar, today }: { tasks: Task[]; tags: TagDef[]; calendar: boolean; today: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  return (
    <div className="flex h-full flex-col gap-3 px-5 pb-6 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/app/inbox" className="text-[17px] font-semibold hover:underline">
          Inbox
        </Link>
        <span className="text-xs text-stone-500">{tasks.length} งาน</span>
      </div>
      <p className="-mt-1 text-xs text-stone-500">ลากไปไว้ในวันนี้ หรือลากลงตารางเพื่อจองเวลา</p>
      <form
        ref={form}
        action={(fd) =>
          start(async () => {
            await addTask(fd);
            form.current?.reset();
          })
        }
      >
        <input type="hidden" name="inbox" value="1" />
        <input
          name="title"
          required
          maxLength={500}
          aria-label="จดไว้ก่อน"
          placeholder="+ จดไว้ก่อน…"
          className="h-10 w-full rounded-xl border border-dashed border-stone-300 bg-transparent px-3 text-sm outline-none focus:border-brand-400 focus:bg-white"
        />
      </form>
      <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
        {tasks.length === 0 && <li className="py-8 text-center text-sm text-stone-400">Inbox ว่าง</li>}
        {tasks.map((t) => (
          <Card key={t.id} task={t} tags={tags} calendar={calendar} today={today} />
        ))}
      </ul>
    </div>
  );
}
