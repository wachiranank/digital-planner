import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OPERATOR_EN, OPERATOR_TH, SUPPORT_EMAIL, UPDATED_EN, UPDATED_TH } from "../legal";

export const metadata: Metadata = { title: "เงื่อนไขการใช้งาน / Terms of Service — Digital Planner" };

export default function Terms() {
  return (
    <LegalPage title="เงื่อนไขการใช้งาน">
      <p className="text-sm text-stone-500">มีผลตั้งแต่ {UPDATED_TH} · English version below</p>
      <p>
        Digital Planner ให้บริการโดย <b>{OPERATOR_TH}</b> การใช้งานแอปถือว่าคุณยอมรับเงื่อนไขนี้และ{" "}
        <Link href="/privacy" className="underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
      <h2>บริการ</h2>
      <ul>
        <li>Digital Planner เป็น planner ภาษาไทยบนเว็บ ใช้วางแผนงานรายวัน รายสัปดาห์ และรายเดือน และซิงก์กับ Google Calendar ได้ (ไม่บังคับ)</li>
        <li>ทดลองใช้ฟรี 14 วัน โดยไม่ต้องใส่บัตร</li>
      </ul>
      <h2>License และการชำระเงิน</h2>
      <ul>
        <li>License แบบจ่ายครั้งเดียว ใช้ได้ 1 คน เปิดใช้งานได้สูงสุด 3 อุปกรณ์ ห้ามแจกจ่ายหรือขายต่อ license key</li>
        <li>ขอคืนเงินได้ภายใน 7 วันหลังซื้อ หากใช้งานไม่ได้ license จะถูกยกเลิกเมื่อคืนเงิน การคืนเงินพร้อมเพย์อาจใช้เวลาหลายวันทำการ</li>
      </ul>
      <h2>การใช้งานที่เหมาะสม</h2>
      <ul>
        <li>ห้ามใช้แอปเพื่อกิจกรรมที่ผิดกฎหมาย หรือพยายามเข้าถึงข้อมูลของผู้ใช้อื่น</li>
        <li>คุณเป็นเจ้าของข้อมูลที่คุณสร้างในแอป</li>
      </ul>
      <h2>ข้อจำกัดความรับผิด</h2>
      <p>
        เราพยายามให้บริการทำงานต่อเนื่องและสำรองข้อมูลสม่ำเสมอ แต่ไม่รับประกันว่าบริการจะไม่หยุดชะงัก ความรับผิดของเราจำกัดไม่เกินจำนวนเงินที่คุณชำระค่า
        license
      </p>
      <h2>กฎหมายที่ใช้บังคับ</h2>
      <p>
        เงื่อนไขนี้อยู่ภายใต้กฎหมายไทย ติดต่อเราได้ที่{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
      </p>

      <hr className="my-10 border-stone-200" />

      <section lang="en" className="space-y-4">
        <h2 className="!mt-0 text-2xl">Terms of Service (English)</h2>
        <p className="text-sm text-stone-500">Effective {UPDATED_EN}</p>
        <p>
          Digital Planner is provided by <b>{OPERATOR_EN}</b>. By using the app you agree to these terms and the{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
        <ul>
          <li>Digital Planner is a Thai web planner for daily, weekly and monthly planning, with optional Google Calendar sync.</li>
          <li>Free 14-day trial, no card required. Paid licenses are one-time, for one person, on up to 3 devices; keys may not be shared or resold.</li>
          <li>Refunds within 7 days of purchase if the app does not work for you; the license is revoked on refund.</li>
          <li>Do not use the app for unlawful activity or try to access other users&apos; data. You own the content you create.</li>
          <li>
            We aim for continuous service and regular backups but do not guarantee uninterrupted availability. Our liability is limited to the
            amount you paid for the license.
          </li>
          <li>
            These terms are governed by the laws of Thailand. Contact:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </section>
    </LegalPage>
  );
}
