// Thai quick-add parser: "ประชุมลูกค้า พรุ่งนี้ บ่าย 2 1 ชม." →
// { title: "ประชุมลูกค้า", day: tomorrow, time: "14:00", minutes: 60 }
// Pure function (no server deps) so it can be unit-tested and reused by the app and LINE.

export type Parsed = { title: string; day: string | null; time: string | null; minutes: number | null };

const WEEKDAYS: [RegExp, number][] = [
  [/จันทร์/, 0],
  [/อังคาร/, 1],
  [/พุธ/, 2],
  [/พฤหัส(?:บดี)?/, 3],
  [/ศุกร์/, 4],
  [/เสาร์/, 5],
  [/อาทิตย์/, 6],
];

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekdayIdx = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
const pad = (n: number) => String(n).padStart(2, "0");
const thaiDigits = (s: string) => s.replace(/[๐-๙]/g, (d) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d)));

export function parseQuick(input: string, today: string): Parsed {
  let s = ` ${thaiDigits(input).replace(/\s+/g, " ").trim()} `;
  let day: string | null = null;
  let time: string | null = null;
  let minutes: number | null = null;
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    const m = s.match(re);
    if (m && fn(m) !== false) s = s.replace(m[0], " ");
  };

  // ---- duration: "1 ชม.", "1.5 ชั่วโมง", "30 นาที", "1 ชม. 30 นาที"
  take(/(?:^|\s)(?:นาน\s*)?(\d+(?:\.\d+)?)\s*(?:ชม\.?|ชั่วโมง)(?:\s*(\d+)\s*นาที)?(?=\s|$)/, (m) => {
    minutes = Math.round(parseFloat(m[1]) * 60) + (m[2] ? Number(m[2]) : 0);
  });
  if (minutes === null)
    take(/(?:^|\s)(?:นาน\s*)?(\d+)\s*นาที(?=\s|$)/, (m) => {
      minutes = Number(m[1]);
    });

  // ---- time
  const setTime = (h: number, m = 0) => {
    if (h < 0 || h > 23 || m < 0 || m > 59) return false;
    time = `${pad(h)}:${pad(m)}`;
  };
  take(/(?:^|\s)(?:เวลา\s*)?(\d{1,2})[:.](\d{2})\s*(?:น\.?)?(?=\s|$)/, (m) => setTime(Number(m[1]), Number(m[2])));
  if (!time) take(/(?:^|\s)(?:ตอน)?เที่ยง(?:วัน|ตรง)?(?=\s|$)/, () => setTime(12));
  if (!time) take(/(?:^|\s)บ่ายโมง(ครึ่ง)?(?=\s|$)/, (m) => setTime(13, m[1] ? 30 : 0));
  if (!time)
    take(/(?:^|\s)บ่าย\s*(\d{1,2})\s*(?:โมง)?(ครึ่ง)?(?=\s|$)/, (m) => {
      const h = Number(m[1]);
      return setTime(h <= 6 ? 12 + h : h, m[2] ? 30 : 0);
    });
  if (!time) take(/(?:^|\s)(\d{1,2})\s*ทุ่ม(ครึ่ง)?(?=\s|$)/, (m) => setTime(18 + Number(m[1]), m[2] ? 30 : 0));
  if (!time) take(/(?:^|\s)ตี\s*(\d{1,2})(ครึ่ง)?(?=\s|$)/, (m) => setTime(Number(m[1]), m[2] ? 30 : 0));
  if (!time)
    take(/(?:^|\s)(\d{1,2})\s*โมง(เช้า|เย็น)?(ครึ่ง)?(?=\s|$)/, (m) => {
      let h = Number(m[1]);
      if (m[2] === "เย็น" && h <= 7) h += 12;
      else if (!m[2] && h >= 1 && h <= 6) h += 12; // "4 โมง" = 16:00
      return setTime(h, m[3] ? 30 : 0);
    });

  // ---- day
  take(/(?:^|\s)วันนี้(?=\s|$)/, () => {
    day = today;
  });
  if (!day)
    take(/(?:^|\s)พรุ่งนี้(?=\s|$)/, () => {
      day = addDays(today, 1);
    });
  if (!day)
    take(/(?:^|\s)มะรืน(?:นี้)?(?=\s|$)/, () => {
      day = addDays(today, 2);
    });
  if (!day)
    take(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/, (m) => {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
      let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      if (y < 100) y += y > 50 ? 2500 - 543 : 2000; // "69" = 2569 BE, "26" = 2026
      if (y > 2400) y -= 543; // Buddhist era
      let iso = `${y}-${pad(mo)}-${pad(d)}`;
      if (!m[3] && iso < today) iso = `${y + 1}-${pad(mo)}-${pad(d)}`;
      day = iso;
    });
  if (!day) {
    for (const [re, idx] of WEEKDAYS) {
      const full = new RegExp(`(?:^|\\s)(?:วัน)?${re.source}(\\s*หน้า)?(?=\\s|$)`);
      take(full, (m) => {
        const offset = (idx - weekdayIdx(today) + 7) % 7;
        day = addDays(today, offset + (m[1] ? 7 : 0));
      });
      if (day) break;
    }
  }

  const title = s.replace(/\s+/g, " ").trim();
  return { title: title || input.trim(), day, time, minutes };
}
