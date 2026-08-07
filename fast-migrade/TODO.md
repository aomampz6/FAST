# fast-migrade — TODO

Backend rewrite ของ FAST เดิม (ดูโค้ดเก่าใน [`../archive/`](../archive/) เพื่ออ้างอิงพฤติกรรม, git history เต็มอยู่ที่ branch `legacy-fast`)

## กฎตายตัว

- ห้าม hardcode username/password/secret ในโค้ดเด็ดขาด — ทุกอย่างมาจาก DB (`User` model) หรือ env เท่านั้น, hash ด้วย bcrypt ก่อนเก็บเสมอ
- ทุก feature ใหม่สร้างเป็นโฟลเดอร์ `src/features/<name>/` ตามโครง `auth/` ที่ทำไว้แล้ว (`*.model.js`, `*.validation.js`, `*.service.js`, `*.controller.js`, `*.hooks.js`, `*.router.js`) — ไม่โยนรวมไฟล์เดียวแบบ `routes/api.js` เดิม
- ทุก endpoint ที่เขียน/แก้/ลบข้อมูลต้องผ่าน `requireRole('admin')`, GET เปิดให้ทุก role ที่ login แล้ว

## ✅ เสร็จแล้ว

- [x] Project structure: `src/config`, `src/middleware`, `src/shared`, `src/features/`
- [x] `config/env.js` — fail-fast ถ้าไม่มี `MONGODB_URI`/`JWT_SECRET`
- [x] `middleware/auth.js` — `verifyToken` + `requireRole`
- [x] `middleware/errorHandler.js`, `middleware/rateLimiter.js` (login rate limit)
- [x] `features/auth/` ครบ (model/validation/service/controller/hooks/router)
- [x] `scripts/seed-admin.js` — bootstrap admin จาก env ครั้งเดียว
- [x] `helmet`, input validation ด้วย `zod`
- [x] `features/scoms/` — CRUD ครบ, ทดสอบ RBAC แล้ว (admin เขียนได้, user โดน 403)
- [x] `features/parameters/` — CRUD ครบ
- [x] `features/onu-configs/` — CRUD + image upload/delete ผ่าน S3 เท่านั้น (ตัดกลไก base64-inline ของเดิมทิ้ง), `shared/s3.js` ย้ายจาก archive แล้ว, `GET /image` ยังคง public ตามของเดิม (เหตุผลเดิม: เป็นแค่ screenshot คู่มือ)
- [x] `features/guides/` — CRUD ไฟล์ HTML ใน `fast-migrade/guides/`, เพิ่ม backup-before-overwrite ไป `guides/.history/` ที่ของเดิมไม่มี, เปลี่ยน PUT ให้รับ JSON `{content}` แทน raw text/plain ของเดิม
- [x] `features/phonebook/` — API ใหม่ทั้งหมด (ของเดิมไม่มี) — ออกแบบเป็น 1 document ต่อ 1 group (ไม่ใช่ document เดียวเก็บทุกกลุ่ม) เพื่อลด write contention, contacts เป็น subdocument ในกลุ่ม
- [x] `features/feedback/` — API ใหม่ทั้งหมด (ของเดิมไม่มี) — `userId` ดึงจาก JWT เท่านั้น ไม่เชื่อค่าที่ client ส่งมา, `GET` (ดูทั้งหมด) จำกัด admin เท่านั้น
- [x] ทุก router mount ใน `src/app.js` แล้ว, ทดสอบ end-to-end ผ่าน curl ครบทุก feature (RBAC ถูกต้อง, rate limiter บน login ทำงานจริง)

## 🔜 ต้องทำต่อ

### 1. Cross-cutting

- [ ] Structured logging ให้ครบทุก feature (ต่อยอดจาก `shared/logger.js` — ตอนนี้มีแค่ `auth.hooks.js` ที่ log)
- [ ] Audit log สำหรับ action เขียน/แก้/ลบของ admin ทุก feature (ต่อยอดจาก `auth.hooks.js` pattern, ตอนนี้ `onuConfigs.hooks.js` มีแค่ S3 cleanup ยังไม่มี audit log)

### 2. Frontend (React + Vite) — `fast-migrade/frontend/` ✅ เสร็จแล้ว

- [x] Scaffold Vite + React, `shared/api/httpClient.js` (axios + auth header + 401 interceptor), `shared/auth/AuthContext.jsx`
- [x] `features/auth` — LoginPage (ฟอร์มเดียว ไม่มี tab, backend ตัดสิน role)
- [x] `features/scoms` — TroubleshootPage (เลือกกลุ่ม → อาการ → ขั้นตอนแก้ไข → ส่ง feedback)
- [x] `features/onu-configs` + `features/guides` — OnuSetupPage (เลือก Brand → Mode → รายละเอียด + guide iframe ถ้ามี)
- [x] `features/parameters` — ใช้ร่วมใน DashboardPage
- [x] `features/phonebook` — PhonebookPage (CRUD จริงผ่าน API แทน localStorage)
- [x] `features/feedback` — ส่ง feedback จริงไป backend แทน localStorage
- [x] `features/admin` — AdminPage รวม CRUD ทุก feature ด้านบนสำหรับ role admin (Guides tab เป็น list+edit เท่านั้น ไม่มี create/delete เพราะ backend ไม่รองรับสร้างไฟล์ guide ใหม่)
- [x] `App.jsx` — React Router + ProtectedRoute ตาม role

ทดสอบ end-to-end จริงผ่าน browser แล้ว: login (admin + user), RBAC บน `/admin` (user โดน redirect), dashboard/troubleshoot/onu-setup/phonebook flow ครบ, feedback บันทึกจริงถึง DB, logout เคลียร์ token ถูกต้อง แก้บั๊กเดียวที่เจอ: `main.jsx` ไม่ได้ห่อ `<App />` ด้วย `<BrowserRouter>` (แก้แล้ว)

### 3. Deployment — Container เดียว

- [x] `fast-migrade/Dockerfile` multi-stage: build frontend (`frontend/dist`) → copy เป็น `public/` ใน image runtime
- [x] `src/app.js` เพิ่ม `express.static('public')` + SPA fallback route (skip อัตโนมัติถ้า `public/` ไม่มี เช่นตอน dev backend อย่างเดียว)
- [x] `fast-migrade/docker-compose.yml` (required env ทุกตัวไม่มี default เดาได้ + S3 vars สำหรับ onu-configs)
- [ ] ย้าย Coolify build context จาก root เดิมเป็น `fast-migrade/` (ทำใน Coolify UI ตอน deploy จริง)
