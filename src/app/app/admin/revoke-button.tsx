"use client";

export function RevokeButton({ email }: { email: string }) {
  return (
    <button
      onClick={(e) => {
        if (!confirm(`ยกเลิก key ของ ${email}? เพื่อนจะใช้แอปต่อไม่ได้`)) e.preventDefault();
      }}
      className="rounded-lg px-2 py-1 text-xs text-red-600 ring-1 ring-red-200 hover:bg-red-50"
    >
      ยกเลิก
    </button>
  );
}
