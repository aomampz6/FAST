# Deploy FAST บน Coolify

โปรเจกต์นี้ใช้ service `app` เพียงตัวเดียว:

- Node.js/Express รับ traffic ที่ port `10300`
- เชื่อม MongoDB ภายนอกด้วย SRV connection string
- ไม่มี MongoDB container หรือ database volume ภายใน Coolify stack

## เตรียม MongoDB

สร้าง database user และอนุญาต network access จาก IP ของ Coolify server
จากนั้นเตรียม connection string รูปแบบ:

```text
mongodb+srv://<username>:<url-encoded-password>@<cluster-host>/fast_db?retryWrites=true&w=majority&appName=FAST
```

หาก username หรือ password มีอักขระพิเศษ ต้อง URL-encode ก่อนนำมาใส่ใน URI

## ขั้นตอนติดตั้ง

1. Push repository นี้ขึ้น Git provider ที่ Coolify เข้าถึงได้
2. ใน Coolify เลือก Project และ Environment ที่ต้องการ
3. เลือก **New Resource** แล้วเชื่อม Git repository
4. เลือก build pack เป็น **Docker Compose**
5. ระบุไฟล์ Compose เป็น `/docker-compose.yml`
6. ที่ service `app` กำหนด Domain ให้ชี้ไป container port `10300`
7. กำหนด Environment Variables (ชื่อเดียวกับที่ใช้ใน `.env` ตอนรัน local — ไม่มีการ map ชื่อใหม่):
   - `MONGODB_URI`: SRV connection string แบบเต็ม เป็น secret และ runtime variable
   - `JWT_SECRET`: สุ่มค่า secret เอง เช่น hex 64 ตัวอักษร (`openssl rand -hex 32`)
   - `ADMIN_USER`: username admin ที่ต้องการ
   - `ADMIN_PASS`: password admin ที่ต้องการ
8. กด Deploy และรอให้ `app` มีสถานะ healthy

`ADMIN_USER`/`ADMIN_PASS` ใช้สร้าง admin คนแรกใน MongoDB ครั้งเดียวตอน deploy
ครั้งแรกเท่านั้น (ดู [scripts/seed-initial.js](scripts/seed-initial.js)) — ถ้ามี admin
อยู่ใน DB แล้ว การแก้ค่านี้ใน Coolify ภายหลังจะไม่มีผล ต้องเปลี่ยนรหัสผ่านผ่านหน้า
admin panel แทน

ข้อมูล SCOM และ ONU เริ่มต้นจะถูกเพิ่มเฉพาะเมื่อ collection นั้นว่างเท่านั้น
การ restart หรือ redeploy จะไม่ลบข้อมูลที่มีอยู่

## ตรวจหลัง deploy

- เปิด `https://<your-domain>/api/health` ต้องได้ HTTP 200 และ
  `{"status":"ok","database":"connected"}`
- เปิดหน้าเว็บและ login Admin ด้วย `ADMIN_USER` และ
  `ADMIN_PASS` จาก Environment Variables ของ Coolify

ถ้า health check ไม่ผ่าน ให้ตรวจว่า MongoDB อนุญาต IP ของ Coolify server,
database user มีสิทธิ์อ่าน/เขียน `fast_db` และ SRV DNS resolve ได้จาก server

## รันด้วย Docker Compose ในเครื่อง

คัดลอก `.env.example` เป็น `.env` แล้วใส่ SRV URI และเปลี่ยน secret ทุกค่า:

```bash
docker compose up --build
```

Compose publish host port `10300` ไว้แล้ว เปิด `http://localhost:10300` ได้ทันที
