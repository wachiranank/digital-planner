import type { Metadata } from "next";
import { LegalPage, OPERATOR_EN, OPERATOR_TH, SUPPORT_EMAIL, UPDATED_EN, UPDATED_TH } from "../legal";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว / Privacy Policy — Digital Planner" };

const Mail = () => (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
    {SUPPORT_EMAIL}
  </a>
);

export default function Privacy() {
  return (
    <LegalPage title="นโยบายความเป็นส่วนตัว">
      <p className="text-sm text-stone-500">มีผลตั้งแต่ {UPDATED_TH} · English version below</p>
      <p>
        Digital Planner (app.claudecoach.online) ให้บริการโดย <b>{OPERATOR_TH}</b> (&quot;เรา&quot;) ผู้ควบคุมข้อมูลส่วนบุคคลตาม
        พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 นโยบายนี้อธิบายว่าเราเก็บ ใช้ จัดเก็บ และเปิดเผยข้อมูลของคุณอย่างไร ติดต่อเราได้ที่ <Mail />
      </p>

      <h2>1. ข้อมูลที่เราเก็บ</h2>
      <ul>
        <li>
          <b>ข้อมูลบัญชีจาก Google Sign-In:</b> ชื่อ อีเมล และรูปโปรไฟล์ เพื่อสร้างบัญชีและให้คุณเข้าสู่ระบบ
        </li>
        <li>
          <b>ข้อมูลที่คุณสร้างในแอป:</b> งาน โน้ต เช็คลิสต์ หมวดหมู่ งานทำซ้ำ นิสัย บันทึกปิดวัน และการทบทวนรายสัปดาห์
        </li>
        <li>
          <b>ข้อมูล Google Calendar (เมื่อคุณเชื่อมต่อ):</b> ดูหัวข้อ 2
        </li>
        <li>
          <b>การแจ้งเตือน:</b> ข้อมูล push subscription ของเบราว์เซอร์ และ LINE user ID หากคุณเชื่อมบัญชี LINE
        </li>
        <li>
          <b>การซื้อ license:</b> อีเมลและประวัติคำสั่งซื้อ ข้อมูลบัตรหรือบัญชีธนาคารประมวลผลโดย Stripe ทั้งหมด เราไม่เห็นและไม่เก็บ
        </li>
        <li>
          <b>token สำหรับ Siri Shortcuts:</b> เก็บเฉพาะค่า hash ของ token ที่คุณสร้าง
        </li>
      </ul>

      <h2>2. ข้อมูลจาก Google และการใช้งาน</h2>
      <p>
        เมื่อคุณเชื่อม Google Calendar แอปจะขอสิทธิ์ <code>https://www.googleapis.com/auth/calendar.events</code> เพื่อทำสิ่งต่อไปนี้เท่านั้น
      </p>
      <ul>
        <li>อ่าน event ในปฏิทินของคุณ เพื่อแสดงในหน้าวันนี้ สัปดาห์ และเดือน ให้คุณวางแผนรอบนัดที่มีอยู่</li>
        <li>สร้าง แก้ไข และลบ event สำหรับงานที่คุณตั้งเวลาในแอป และติดตามเมื่อคุณย้ายหรือลบ event นั้นใน Google Calendar</li>
      </ul>
      <p>
        เราเก็บเฉพาะ refresh token (ไว้ที่เซิร์ฟเวอร์ ไม่ส่งไปยังเบราว์เซอร์) และรหัส event กับเวลาของงานที่แอปสร้าง
        event อื่นๆ ในปฏิทินของคุณจะดึงมาแสดงตอนเปิดหน้าเท่านั้น ไม่ได้บันทึกเก็บไว้
      </p>
      <p>
        <b>
          การใช้และการส่งต่อข้อมูลที่ได้รับจาก Google APIs เป็นไปตาม{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline">
            Google API Services User Data Policy
          </a>{" "}
          รวมถึงข้อกำหนด Limited Use
        </b>{" "}
        กล่าวคือ เราใช้ข้อมูลจาก Google เพื่อให้บริการฟีเจอร์ที่คุณเห็นในแอปเท่านั้น ไม่ขาย ไม่ใช้เพื่อโฆษณา ไม่ส่งต่อให้บุคคลอื่น
        (ยกเว้นที่จำเป็นต่อการให้บริการ ตามกฎหมาย หรือเพื่อความปลอดภัย) ไม่ให้คนอ่าน (ยกเว้นได้รับความยินยอมจากคุณ หรือเพื่อความปลอดภัยและตามกฎหมาย)
        และไม่ใช้เพื่อพัฒนาหรือฝึกโมเดล AI/ML
      </p>

      <h2>3. วัตถุประสงค์ในการใช้ข้อมูล</h2>
      <ul>
        <li>ให้บริการ planner: แสดง บันทึก และซิงก์งานของคุณ</li>
        <li>ส่งการแจ้งเตือนที่คุณเปิดไว้ (บนเครื่อง และทาง LINE)</li>
        <li>ตรวจสอบ license ส่งอีเมล license และดูแลคำสั่งซื้อหรือการคืนเงิน</li>
        <li>รักษาความปลอดภัยและแก้ปัญหาการใช้งาน</li>
      </ul>
      <p>เราไม่ขายข้อมูลส่วนบุคคล และไม่ใช้ข้อมูลของคุณเพื่อโฆษณา</p>

      <h2>4. ผู้ให้บริการที่เกี่ยวข้อง</h2>
      <ul>
        <li>Google: เข้าสู่ระบบ และ Google Calendar</li>
        <li>Stripe: รับชำระเงิน</li>
        <li>Resend: ส่งอีเมล license และใบเสร็จ</li>
        <li>LINE: ส่งข้อความแจ้งเตือน (เมื่อคุณเชื่อมบัญชี)</li>
        <li>Hostinger: เซิร์ฟเวอร์ที่เราดูแลเองสำหรับแอปและฐานข้อมูล</li>
      </ul>

      <h2>5. การเก็บรักษาและความปลอดภัย</h2>
      <p>
        ข้อมูลส่งผ่าน HTTPS และเก็บในฐานข้อมูลที่จำกัดสิทธิ์ให้เจ้าของบัญชีเข้าถึงข้อมูลของตัวเองเท่านั้น เราเก็บข้อมูลตราบเท่าที่บัญชียังใช้งานอยู่
        และเก็บข้อมูลคำสั่งซื้อตามที่กฎหมายบัญชีกำหนด
      </p>

      <h2>6. การยกเลิกสิทธิ์และการลบข้อมูล</h2>
      <ul>
        <li>
          ยกเลิกสิทธิ์ของแอปต่อบัญชี Google ได้ทุกเมื่อที่{" "}
          <a href="https://myaccount.google.com/permissions" className="underline">
            myaccount.google.com/permissions
          </a>{" "}
          หลังจากนั้นแอปจะเข้าถึงปฏิทินของคุณไม่ได้อีก
        </li>
        <li>
          ขอลบบัญชีและข้อมูลทั้งหมด (รวมถึง refresh token ของ Google) ได้ที่ <Mail /> เราจะลบภายใน 30 วัน ยกเว้นข้อมูลคำสั่งซื้อที่กฎหมายกำหนดให้เก็บ
        </li>
        <li>คุณมีสิทธิ์ขอดู ขอสำเนา แก้ไข คัดค้าน หรือถอนความยินยอม ตาม PDPA โดยติดต่อที่อีเมลด้านบน</li>
      </ul>

      <h2>7. การเปลี่ยนแปลงนโยบาย</h2>
      <p>หากมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในแอปหรือทางอีเมลก่อนมีผล</p>

      <hr className="my-10 border-stone-200" />

      <section lang="en" className="space-y-4">
        <h2 className="!mt-0 text-2xl">Privacy Policy (English)</h2>
        <p className="text-sm text-stone-500">Effective {UPDATED_EN}</p>
        <p>
          Digital Planner (app.claudecoach.online) is provided by <b>{OPERATOR_EN}</b> (&quot;we&quot;), the data controller under
          Thailand&apos;s Personal Data Protection Act B.E. 2562. Contact: <Mail />
        </p>

        <h3>Data we collect</h3>
        <ul>
          <li>Google Sign-In account data: name, email address and profile picture, to create your account and sign you in.</li>
          <li>Content you create: tasks, notes, checklists, categories, repeating tasks, habits, daily notes and weekly reviews.</li>
          <li>Google Calendar data, if you connect it (see below).</li>
          <li>Notification data: your browser&apos;s push subscription, and your LINE user ID if you link LINE.</li>
          <li>Purchases: email and order history. Card and bank details are processed by Stripe; we never see or store them.</li>
          <li>Siri Shortcuts tokens: only a hash of each token you create.</li>
        </ul>

        <h3>How we use Google user data</h3>
        <p>
          When you connect Google Calendar, the app requests <code>https://www.googleapis.com/auth/calendar.events</code> only to:
        </p>
        <ul>
          <li>read events in your calendars so they appear on the Today, Week and Month views and you can plan around them;</li>
          <li>create, update and delete the events for tasks you give a time in the app, and follow changes you make to those events in Google Calendar.</li>
        </ul>
        <p>
          We store only the OAuth refresh token (server-side, never sent to the browser) and the event IDs and times of tasks the app created.
          Your other calendar events are fetched when you open a page and are not stored.
        </p>
        <p>
          <b>
            Digital Planner&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </b>{" "}
          We use Google user data only to provide the user-facing features described above. We do not sell it, use it for advertising,
          transfer it to others (except as necessary to provide the service, to comply with law, or for security), allow humans to read it
          (except with your consent, for security purposes, or to comply with law), or use it to develop, improve or train AI/ML models.
        </p>

        <h3>Service providers</h3>
        <p>
          Google (sign-in and Calendar), Stripe (payments), Resend (license and receipt emails), LINE (notifications you turn on), and Hostinger
          (the server we operate for the app and database).
        </p>

        <h3>Security and retention</h3>
        <p>
          Data is sent over HTTPS and stored in a database where row-level security limits each user to their own records. We keep your data
          while your account is active, and order records as required by accounting law.
        </p>

        <h3>Revoking access and deleting your data</h3>
        <ul>
          <li>
            You can revoke the app&apos;s access to your Google Account at any time at{" "}
            <a href="https://myaccount.google.com/permissions" className="underline">
              myaccount.google.com/permissions
            </a>
            .
          </li>
          <li>
            To delete your account and all of its data, including the stored Google refresh token, email <Mail />. We delete it within 30
            days, except order records we must keep by law.
          </li>
          <li>You may also request access to, a copy of, correction of, or objection to processing of your data, or withdraw consent.</li>
        </ul>

        <h3>Changes</h3>
        <p>We will announce material changes in the app or by email before they take effect.</p>
      </section>
    </LegalPage>
  );
}
