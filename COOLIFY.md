# Deploy FAST บน Coolify

โปรเจกต์นี้ใช้ Docker Compose สอง services:

- `app`: Node.js/Express รับ traffic ที่ port 10300
- `mongodb`: MongoDB ภายใน private network พร้อม persistent volume

## ขั้นตอนติดตั้ง

1. Push repository นี้ขึ้น Git provider ที่ Coolify เข้าถึงได้
2. ใน Coolify เลือก Project และ Environment ที่ต้องการ
3. เลือก **New Resource** แล้วเชื่อม Git repository
4. เลือก build pack เป็น **Docker Compose**
5. ระบุไฟล์ Compose เป็น `/docker-compose.yml`
6. ที่ service `app` กำหนด Domain ให้ชี้ไป container port `10300`
7. ตรวจ Environment Variables ก่อน deploy:
   - `SERVICE_USER_MONGO`, `SERVICE_PASSWORD_MONGO`, `SERVICE_HEX_64_JWT`
     และ `SERVICE_PASSWORD_ADMIN` ให้ Coolify สร้างค่าแบบสุ่ม
   - `ADMIN_USER` เปลี่ยนได้ โดยค่าเริ่มต้นคือ `admin`
8. กด Deploy แล้วรอให้ `mongodb` และ `app` มีสถานะ healthy

ไม่ต้อง publish port ของ `mongodb` และไม่ควรเพิ่ม `ports:` ให้ service นี้
ข้อมูล MongoDB จะอยู่ใน volume `mongodb_data` และคงอยู่หลัง redeploy

ข้อมูล SCOM และ ONU เริ่มต้นจะถูกเพิ่มเฉพาะเมื่อ collection นั้นว่างเท่านั้น
การ restart หรือ redeploy จะไม่ลบข้อมูลที่แก้ไขผ่านระบบ

## ตรวจหลัง deploy

- เปิด `https://<your-domain>/api/health` ต้องได้ HTTP 200 และ
  `{"status":"ok","database":"connected"}`
- เปิดหน้าเว็บและ login Admin ด้วย `ADMIN_USER` และ
  `SERVICE_PASSWORD_ADMIN` จากหน้า Environment Variables ของ Coolify

## รันด้วย Docker Compose ในเครื่อง

คัดลอก `.env.example` เป็น `.env` แล้วเปลี่ยน secret ทุกค่า จากนั้นรัน:

```bash
docker compose up --build
```

เปิด `http://localhost:10300` โดยเพิ่ม `ports: ["10300:10300"]` ให้ service
`app` เฉพาะกรณีทดสอบในเครื่อง เพราะ Compose สำหรับ Coolify ตั้งใจให้ traffic
ผ่าน reverse proxy และไม่ได้ publish host port
