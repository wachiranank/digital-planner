"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { moveTask, scheduleTask } from "./actions";
import { DRAG_TYPE } from "./task-row";
import { GoogleButton } from "../google-button";

export type AgendaItem = {
  key: string;
  taskId?: string; // set for our own tasks (they can be dragged to another time)
  start: string;
  end: string;
  allDay: boolean;
  label: string;
  kind: "event" | "task" | "done";
};

const HOUR = 56; // px per hour
const minOfDay = (iso: string) => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
    .format(new Date(iso))
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
};
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Lay overlapping blocks side by side: each item gets a lane and the lane count of its cluster. */
function lanes<T extends { s: number; e: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e);
  const out: (T & { lane: number; of: number })[] = [];
  let cluster: (T & { lane: number; of: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.of = n));
    out.push(...cluster);
    cluster = [];
  };
  for (const it of sorted) {
    if (it.s >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.e > it.s).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...it, lane, of: 1 });
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  if (cluster.length) flush();
  return out;
}

/**
 * Laptop: today as an hour grid (Google events + time-blocked tasks).
 * Drop a task from the list or the Inbox onto a time to book it (it goes to Google Calendar too);
 * drag a block to move it.
 */
export function DayTimeline({ items, today, calendar }: { items: AgendaItem[]; today: string; calendar: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [ghost, setGhost] = useState<number | null>(null); // minute of the hovered drop slot
  const [ghostLen, setGhostLen] = useState(60);
  const [pending, start] = useTransition();
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const timed = items.filter((i) => !i.allDay);
  const allDay = items.filter((i) => i.allDay);
  const nowMin = minOfDay(new Date(now).toISOString());
  const startH = Math.min(7, ...timed.map((i) => Math.floor(minOfDay(i.start) / 60)), Math.floor(nowMin / 60));
  const endH = Math.min(24, Math.max(21, ...timed.map((i) => Math.ceil(Math.max(minOfDay(i.end), minOfDay(i.start) + 15) / 60))));
  const blocks = useMemo(
    () => lanes(timed.map((i) => ({ ...i, s: minOfDay(i.start), e: Math.max(minOfDay(i.end), minOfDay(i.start) + 15) }))),
    [timed],
  );

  // scroll so "now" (or 8:00) is near the top once
  useEffect(() => {
    const el = grid.current?.parentElement;
    if (el) el.scrollTop = Math.max(0, ((Math.max(nowMin, 8 * 60) - startH * 60) / 60) * HOUR - 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotAt = (clientY: number) => {
    const r = grid.current!.getBoundingClientRect();
    const min = startH * 60 + Math.round((((clientY - r.top) / HOUR) * 60) / 15) * 15;
    return Math.max(startH * 60, Math.min(endH * 60 - 15, min));
  };
  const read = (e: React.DragEvent) => {
    try {
      return JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as { id: string; minutes: number };
    } catch {
      return null;
    }
  };

  return (
    <div className={`flex h-full flex-col ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between px-5 pb-3 pt-6">
        <h2 className="text-[17px] font-semibold">ตารางวันนี้</h2>
        <span className="text-xs text-stone-500">{calendar ? "Google Calendar" : ""}</span>
      </div>
      {!calendar && (
        <div className="mx-5 mb-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
          <p>เชื่อม Google Calendar เพื่อลากงานมาจองเวลา และเห็นนัดอื่นๆ ของวันนี้</p>
          <div className="mt-2">
            <GoogleButton label="เชื่อม Calendar" variant="subtle" />
          </div>
        </div>
      )}
      {allDay.length > 0 && (
        <div className="mx-5 mb-2 flex flex-wrap gap-1.5">
          {allDay.map((a) => (
            <span key={a.key} className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-800">
              {a.label}
            </span>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <div
          ref={grid}
          className="relative"
          style={{ height: (endH - startH) * HOUR }}
          onDragOver={(e) => {
            if (!calendar || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setGhost(slotAt(e.clientY));
          }}
          onDragLeave={(e) => {
            if (!grid.current?.contains(e.relatedTarget as Node)) setGhost(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const d = read(e);
            const at = slotAt(e.clientY);
            setGhost(null);
            if (!d) return;
            const fd = new FormData();
            fd.set("id", d.id);
            fd.set("time", hm(at));
            fd.set("minutes", String(d.minutes || 60));
            fd.set("day", today);
            start(() => scheduleTask(fd));
          }}
        >
          {Array.from({ length: endH - startH }, (_, i) => (
            <div key={i} className="absolute inset-x-0 border-t border-stone-100" style={{ top: i * HOUR }}>
              <span className="absolute -top-2.5 left-0 w-10 bg-white pr-1 text-right text-[11px] text-stone-500">{hm((startH + i) * 60)}</span>
            </div>
          ))}

          {blocks.map((b) => {
            const top = ((b.s - startH * 60) / 60) * HOUR;
            const h = Math.max(22, ((b.e - b.s) / 60) * HOUR - 2);
            const left = `calc(48px + (100% - 52px) * ${b.lane / b.of})`;
            const width = `calc((100% - 52px) / ${b.of} - 2px)`;
            const cls =
              b.kind === "event"
                ? "bg-stone-100 text-stone-700"
                : b.kind === "done"
                  ? "bg-stone-50 text-stone-400 line-through"
                  : "border-l-4 border-brand-600 bg-brand-50 text-stone-900";
            return (
              <div
                key={b.key}
                draggable={!!b.taskId && b.kind === "task" && calendar}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: b.taskId, minutes: b.e - b.s }));
                  setGhostLen(b.e - b.s);
                }}
                className={`absolute overflow-hidden rounded-lg px-2 py-1 text-xs leading-tight ${cls} ${b.taskId && b.kind === "task" ? "cursor-grab" : ""}`}
                style={{ top, height: h, left, width }}
                title={`${hm(b.s)}–${hm(b.e)} ${b.label}`}
              >
                <span className="block truncate font-medium">{b.label}</span>
                {h > 34 && (
                  <span className="opacity-70">
                    {hm(b.s)}–{hm(b.e)}
                  </span>
                )}
              </div>
            );
          })}

          {ghost !== null && (
            <div
              className="pointer-events-none absolute right-1 rounded-lg border-2 border-dashed border-brand-400 bg-brand-50/60 px-2 py-1 text-xs font-semibold text-brand-700"
              style={{ top: ((ghost - startH * 60) / 60) * HOUR, height: Math.max(22, (ghostLen / 60) * HOUR - 2), left: 48 }}
            >
              {hm(ghost)}
            </div>
          )}

          {nowMin >= startH * 60 && nowMin <= endH * 60 && (
            <div className="pointer-events-none absolute left-11 right-0 z-10" style={{ top: ((nowMin - startH * 60) / 60) * HOUR }}>
              <div className="h-0.5 bg-red-600" />
              <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
            </div>
          )}
        </div>
        {calendar && <p className="mt-3 px-2 text-xs text-stone-500">ลากงานจากรายการหรือ Inbox มาวางเพื่อจองเวลา · ลากบล็อกเพื่อย้ายเวลา</p>}
      </div>
    </div>
  );
}

/** Laptop: drop a task here (e.g. from the Inbox) to make it today's. */
export function DropToDay({ day, children, className = "" }: { day: string; children: React.ReactNode; className?: string }) {
  const [over, setOver] = useState(false);
  const [, start] = useTransition();
  return (
    <div
      className={`${className} rounded-2xl transition-shadow ${over ? "ring-2 ring-brand-300 ring-offset-4 ring-offset-paper" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const d = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as { id: string };
          start(() => moveTask(d.id, day));
        } catch {}
      }}
    >
      {children}
    </div>
  );
}
