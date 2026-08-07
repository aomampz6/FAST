# fast-migrade — TODO

Backend rewrite ของ FAST เดิม (ดูโค้ดเก่าใน [`../archive/`](../archive/) เพื่ออ้างอิงพฤติกรรม, git history เต็มอยู่ที่ branch `legacy-fast`)

## กฎตายตัว

- ห้าม hardcode username/password/secret ในโค้ดเด็ดขาด — ทุกอย่างมาจาก DB (`User` model) หรือ env เท่านั้น, hash ด้วย bcrypt ก่อนเก็บเสมอ
- ทุก feature ใหม่สร้างเป็นโฟลเดอร์ `src/features/<name>/` ตามโครง `auth/` ที่ทำไว้แล้ว (`*.model.js`, `*.validation.js`, `*.service.js`, `*.controller.js`, `*.hooks.js`, `*.router.js`) — ไม่โยนรวมไฟล์เดียวแบบ `routes/api.js` เดิม
- ทุก endpoint ที่เขียน/แก้/ลบข้อมูลต้องผ่าน `requireRole('admin')`, GET เปิดให้ทุก role ที่ login แล้ว

## ✅ เสร็จแล้ว (scaffold รอบแรก)

- [x] Project structure: `src/config`, `src/middleware`, `src/shared`, `src/features/`
- [x] `config/env.js` — fail-fast ถ้าไม่มี `MONGODB_URI`/`JWT_SECRET`
- [x] `middleware/auth.js` — `verifyToken` + `requireRole`
- [x] `middleware/errorHandler.js`, `middleware/rateLimiter.js` (login rate limit)
- [x] `features/auth/` ครบ (model/validation/service/controller/hooks/router)
- [x] `scripts/seed-admin.js` — bootstrap admin จาก env ครั้งเดียว
- [x] `helmet`, input validation ด้วย `zod`

## 🔜 ต้องทำต่อ

### 1. Design ก่อนเขียน (ใช้ skill "System Architecture and Failure Design")

ตัดสินใจก่อนเริ่ม endpoint พวกนี้ เพราะของเดิมมีปัญหาสถาปัตยกรรมชัดเจน:

- [ ] **ONU image storage** — ของเดิมมี 2 กลไกปนกัน (S3 จริง vs base64 inline ใน HTML) เลือกทางเดียว
- [ ] **Guide content storage** — ของเดิมเขียนทับไฟล์ filesystem ตรงๆ ไม่มี versioning/backup ตัดสินใจว่าย้ายเข้า DB หรือคง filesystem + เพิ่ม backup-before-write
- [ ] **Phonebook** — ของเดิมไม่มี backend เลย (localStorage per-browser, ข้อมูลไม่ sync) ตัดสินใจว่าต้องมี API จริงไหม
- [ ] **Feedback (troubleshoot)** — ของเดิมไม่มี backend เลย (localStorage) เหมือนกัน

### 2. Backend endpoints (เรียงตามลำดับ)

- [ ] `features/scoms/` — CRUD ฐานความรู้แก้ปัญหา (`Group/Symptom/CheckPoint/Steps/NormalValue/Equipment`)
- [ ] `features/parameters/` — CRUD ค่ามาตรฐานอ้างอิง
- [ ] `features/onu-configs/` — CRUD + image upload (ตามผลตัดสินใจข้อ 1)
- [ ] `features/guides/` — CRUD คู่มือ interactive (ตามผลตัดสินใจข้อ 1)
- [ ] `features/phonebook/` — API ใหม่ทั้งหมด (ของเดิมไม่มี)
- [ ] `features/feedback/` — API ใหม่ทั้งหมด (ของเดิมไม่มี)

### 3. Cross-cutting

- [ ] Structured logging ให้ครบทุก feature (ต่อยอดจาก `shared/logger.js`)
- [ ] Audit log สำหรับ action เขียน/แก้/ลบของ admin ทุก feature (ต่อยอดจาก `auth.hooks.js` pattern)
- [ ] Centralized fetch wrapper ฝั่ง frontend (แก้ปัญหา auth guard ไม่สอดคล้องกันของเดิม — ของเก่าไม่มีการจัดการ 401 แบบรวมศูนย์เลย)

### 4. Frontend

ยังไม่เริ่ม รอ backend เสร็จเป็นสัดส่วนก่อน — เมื่อเริ่มให้แบ่งเป็น `page`/`hook`/`service` ต่อ feature เดียวกับฝั่ง backend (map 1:1)

### 5. Deployment

- [ ] ย้าย Coolify build context จาก root เดิมเป็น `fast-migrade/`
- [ ] เขียน `Dockerfile`, `docker-compose.yml` ใหม่สำหรับ `fast-migrade/` (อ้างอิง pattern security จาก `archive/docker-compose.yml` ที่แก้ไปแล้วรอบก่อน — required env ทุกตัว ไม่มี default ที่เดาได้)
