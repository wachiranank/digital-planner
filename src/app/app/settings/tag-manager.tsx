"use client";

import { useState, useTransition } from "react";
import { createTag, deleteTag, updateTag } from "../actions";
import { COLORS, type ColorKey, type TagDef } from "@/lib/tags";

function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(COLORS) as ColorKey[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={COLORS[c].name}
          aria-label={COLORS[c].name}
          aria-pressed={value === c}
          className={`h-6 w-6 rounded-full ${COLORS[c].dot} ${value === c ? "ring-2 ring-stone-800 ring-offset-2" : ""}`}
        />
      ))}
    </div>
  );
}

function CustomRow({ tag }: { tag: TagDef }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(tag.label);
  const [color, setColor] = useState<ColorKey>(tag.color);
  const dirty = name.trim() !== tag.label || color !== tag.color;
  return (
    <li className={`space-y-2 px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs ${COLORS[color].chip}`}>{name || "…"}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
          aria-label="ชื่อหมวด"
        />
        <button
          onClick={() => {
            if (confirm(`ลบหมวด "${tag.label}"? งานในหมวดนี้จะกลายเป็นไม่มีหมวด`)) start(() => deleteTag(tag.key));
          }}
          className="text-sm text-stone-400 hover:text-red-600"
        >
          ลบ
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <ColorPicker value={color} onChange={setColor} />
        {dirty && (
          <button
            onClick={() =>
              start(() => {
                const fd = new FormData();
                fd.set("id", tag.key);
                fd.set("name", name);
                fd.set("color", color);
                return updateTag(fd);
              })
            }
            className="rounded-md bg-brand-600 px-3 py-1 text-sm font-medium text-white"
          >
            บันทึก
          </button>
        )}
      </div>
    </li>
  );
}

export function TagManager({ tags }: { tags: TagDef[] }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorKey>("teal");
  const builtin = tags.filter((t) => !t.custom);
  const custom = tags.filter((t) => t.custom);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-stone-500">หมวดของฉัน</h3>
        <ul className="mt-2 divide-y divide-stone-100 rounded-xl bg-white ring-1 ring-stone-200">
          {custom.length === 0 && <li className="px-4 py-3 text-sm text-stone-400">ยังไม่มี — สร้างหมวดแรกด้านล่าง</li>}
          {custom.map((t) => (
            <CustomRow key={t.key} tag={t} />
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            start(async () => {
              const fd = new FormData();
              fd.set("name", name);
              fd.set("color", color);
              await createTag(fd);
              setName("");
            });
          }}
          className={`mt-3 space-y-3 rounded-xl bg-white p-4 ring-1 ring-stone-200 ${pending ? "opacity-50" : ""}`}
        >
          <p className="text-sm font-medium">สร้างหมวดใหม่</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="เช่น ลูกค้า A, ครอบครัว, ฟรีแลนซ์"
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">สร้าง</button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </form>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-stone-500">หมวดพื้นฐาน</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {builtin.map((t) => (
            <span key={t.key} className={`rounded px-2 py-1 text-xs ${COLORS[t.color].chip}`}>
              {t.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
