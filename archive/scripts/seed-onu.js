const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const OnuConfig = require('../models/OnuConfig');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = [
    {
        Brand: 'Huawei',
        Mode: 'Router Mode (PPPoE)',
        Details: `1. เสียบสาย LAN จากช่อง LAN1 ของ ONU เข้ากับคอมพิวเตอร์
2. เปิด Browser พิมพ์ IP Address 192.168.1.1 หรือ 192.168.100.1
3. กรอก Username: admin / root / telecomadmin, Password: admin / admintelecom
4. หลังจากล็อกอินด้วยสิทธิ์ Admin แล้ว ไปที่เมนู WAN > WAN Configuration
5. คลิก New เพื่อสร้างโปรไฟล์ใหม่ ตั้งค่าตามโหมดที่ต้องการ
- Encapsulation Mode: PPPoE
- Protocol Type: IPv4 (หรือ IPv4/IPv6)
- WAN Mode: Route WAN
- Service Type: INTERNET
- VLAN ID: ใส่เลข VLAN ของ NT (เลข 10 = internet / เลข 20 = Ipphone)
- ใส่ Account Internet User Name / Password
- กด Apply`
    },
    {
        Brand: 'Huawei',
        Mode: 'Bridge Mode',
        Details: `- WAN Mode: Bridge WAN
- Service Type: INTERNET
- VLAN ID: ใส่เลข VLAN ของ NT
- Binding Options: ติ๊กเลือกพอร์ต LAN ที่ต้องการให้ปล่อยสัญญาณ Bridge (เช่น LAN1)
- กด Apply`
    },
    {
        Brand: 'ZTE',
        Mode: 'Router Mode (PPPoE)',
        Details: `1. เชื่อมต่อ: เสียบสาย LAN เข้ากับคอมพิวเตอร์ หรือเกาะ Wi-Fi เดิมของเครื่อง
2. เปิด Browser: พิมพ์ IP Address 192.168.1.1
3. กรอก Username: admin, Password: admin, superadmin, หรือ password
4. ไปที่ Network > WAN > WAN Connection
- Connection Name : เลือก Create New Connection
- Type : เลือก Route
- Service List : เลือก Internet
- Link Mode (หรือ IP Protocol) : IPv4
- VLAN : ติ๊กถูกที่ VLAN On (หรือ Enable VLAN)
- VLAN ID: ใส่เลข VLAN ของ node นั้นๆ 
- PPP ให้ใส่ username / password
- กด Create หรือ Modify`
    },
    {
        Brand: 'ZTE',
        Mode: 'Bridge Mode',
        Details: `- Connection Name : เลือก Create New Connection
- Type : เลือก Bridge Connection
- Service List : เลือก Internet
- VLAN : ติ๊กถูกที่ VLAN On
- กด Create หรือ Modify
อย่าลืมไปที่เมนู Port Binding เพื่อติ๊กเลือกช่อง LAN`
    },
    {
        Brand: 'Forth',
        Mode: 'Router Mode (PPPoE)',
        Details: `1. เชื่อมต่อ: เสียบสาย LAN เข้าคอมพิวเตอร์ หรือเกาะ Wi-Fi
2. เปิด Browser: พิมพ์ IP Address 192.168.1.1
3. กรอก Username: admin / admin / admin, Password: tot / 1234 / admin
4. ไปที่เมนูแท็บด้านบน Interface Setup > เลือกเมนูย่อย Internet
- ISP: เลือก PPPoE/PPPoA
- IP Version: เลือก IPv4
- VLAN ID: เลือก Activated (เปิดใช้งาน VLAN) ใส่เลข VLAN ID ให้ถูกต้อง
- Username: ใส่ User PPPoE
- Password: ใส่รหัสผ่าน PPPoE
- Bridge Interface: ติ๊กเลือก Deactivated
- Default Route: เลือก Yes
- กดปุ่ม SAVE`
    },
    {
        Brand: 'Forth',
        Mode: 'Bridge Mode',
        Details: `- ISP: เลือก Bridge Mode
- VLAN ID: เลือก Activated
- Bridge Interface: ติ๊กเลือก Activated
- กดปุ่ม SAVE ด้านล่างสุด`
    },
    {
        Brand: 'Fiberhome',
        Mode: 'Router Mode (PPPoE)',
        Details: `การเข้าสู่ระบบ: พิมพ์ IP Address > ล็อกอินด้วยบัญชี Admin
ไปที่เมนู Network > Broadband Settings
เลือก Connection Mode เป็น Route > เลือก PPPoE
ใส่ VLAN ID, Username และ Password > กด Save`
    },
    {
        Brand: 'Fiberhome',
        Mode: 'Bridge Mode',
        Details: `ไปที่เมนู Network > Broadband Settings
เลือก Connection Mode เป็น Bridge > ใส่ VLAN ID > ทำการผูกพอร์ตที่ Port Binding`
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB for seeding ONU Configs...');
        await OnuConfig.deleteMany({});
        await OnuConfig.insertMany(seedData);
        console.log('ONU Configs seeded successfully!');
        process.exit();
    })
    .catch(err => {
        console.error('Error seeding data:', err);
        process.exit(1);
    });
