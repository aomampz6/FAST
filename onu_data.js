const fastOnuData = [
    {
        "Brand": "Huawei",
        "Mode": "General",
        "Details": "1. เสียบสาย LAN จากช่อง LAN1 ของ ONU เข้ากับคอมพิวเตอร์\n2. เปิด Browser พิมพ์ IP Address ลงในช่อง URL (ปกติจะเป็น 192.168.1.1 หรือ 192.168.100.1)\n3. กรอก Username / Password\nUsername : admin / root / telecomadmin\nPassword : admin / admintelecom (หากเข้าไม่ได้ ให้ดูที่สติกเกอร์ใต้เครื่อง หรือสอบถามผู้ให้บริการ เพราะบาง Firmware อาจถูกเปลี่ยนรหัส)\n4. หลังจากล็อกอินด้วยสิทธิ์ Admin แล้ว ไปที่เมนู WAN > WAN Configuration\n5. คลิก New เพื่อสร้างโปรไฟล์ใหม่ ตั้งค่าตามโหมดที่ต้องการ"
    },
    {
        "Brand": "Huawei",
        "Mode": "Router Mode (PPPoE)",
        "Details": "- Encapsulation Mode: PPPoE\n- Protocol Type: IPv4 (หรือ IPv4/IPv6)\n- WAN Mode: Route WAN\n- Service Type: INTERNET\n- VLAN ID: ใส่เลข VLAN ของ NT (เลข 10 = internet / เลข 20 = Ipphone)\n- ใส่ Account Internet User Name / Password เช่น\nUsername xxxxjxxxx@fttxhome\nPassword  xxxxxxx\n- กด Apply"
    },
    {
        "Brand": "Huawei",
        "Mode": "Bridge Mode",
        "Details": "- WAN Mode: Bridge WAN\n- Service Type: INTERNET\n- VLAN ID: ใส่เลข VLAN ของ NT (เลข 10 = internet / เลข 20 = Ipphone)\n- Binding Options: ติ๊กเลือกพอร์ต LAN ที่ต้องการให้ปล่อยสัญญาณ Bridge (เช่น LAN1)\n- กด Apply\nการตั้งค่า Wi-Fi (WLAN Configuration)\n1. ไปที่เมนู WLAN > WLAN Basic Configuration"
    },
    {
        "Brand": "WPA PreSharedKey: ตั้งรหัสผ่าน Wi-Fi (อย่างน้อย 8 ตัวอักษร)",
        "Mode": "General",
        "Details": "5. กด Apply (ทำซ้ำในเมนู 5G Basic Configuration หากต้องการตั้งค่าคลื่น 5GHz แยก)"
    },
    {
        "Brand": "WPA PreSharedKey: ตั้งรหัสผ่าน Wi-Fi (อย่างน้อย 8 ตัวอักษร)",
        "Mode": "การตรวจสอบสถานะ",
        "Details": "ไปที่เมนู Status > WAN Information\nดูที่สถานะ Status: ถ้าขึ้นว่า Connected แสดงว่าตั้งค่าสำเร็จและออกเน็ตได้แล้ว"
    },
    {
        "Brand": "ZTE",
        "Mode": "General",
        "Details": "1. เชื่อมต่อ: เสียบสาย LAN เข้ากับคอมพิวเตอร์ หรือเกาะ Wi-Fi เดิมของเครื่อง\n2. เปิด Browser: พิมพ์ IP Address (ค่ามาตรฐานคือ 192.168.1.1)\n3. กรอก Username / Password:\nUsername : admin\n\"        Password : admin, superadmin, หรือ password\"\n4. เมื่อล็อกอินแล้ว ให้ไปที่ Network > WAN > WAN Connection"
    },
    {
        "Brand": "ZTE",
        "Mode": "Router Mode (PPPoE)",
        "Details": "\"- Connection Name : เลือก \"\"Create New Connection\"\"\"\n- Type : เลือก Route\n- Service List : เลือก Internet\n- Link Mode (หรือ IP Protocol) : IPv4\n- VLAN : ติ๊กถูกที่ VLAN On (หรือ Enable VLAN)\n- VLAN ID: ใส่เลข VLAN ของ node นั้นๆ ซึ่งแต่ละ node จะเลขไม่เหมือนกัน ตรวจสอบได้จากหน้า NTSP\n- PPP ให้ใส่ username / password\nUsername xxxxjxxxx@fttxhome\nPassword  xxxxxxx\n- กด Create หรือ Modify"
    },
    {
        "Brand": "ZTE",
        "Mode": "Bridge Mode",
        "Details": "\"- Connection Name : เลือก \"\"Create New Connection\"\"\"\n- Type : เลือก Bridge Connection\n- Service List : เลือก Internet\n- VLAN : ติ๊กถูกที่ VLAN On\n- กด Create หรือ Modify\nสำหรับ Bridge Mode อย่าลืมไปที่เมนู Port Binding (ในหน้า WAN) เพื่อติ๊กเลือกช่อง LAN (เช่น LAN1) ให้สัญญาณวิ่งออกไปด้วย\nการตั้งค่า Wi-Fi (WLAN Setup)\nไปที่เมนู Network > WLAN (หรือ Wi-Fi)\n- ตั้งชื่อ Wi-Fi: ไปที่ SSID Settings > เลือก SSID1\n- SSID Name: ตั้งชื่อที่ต้องการ > กด Submit\n- ตั้งรหัสผ่าน:ไปที่ Security Settings > เลือก SSID เดียวกับข้อ 1\n- Authentication Type: เลือก WPA/WPA2-PSK\n- WPA Passphrase: ตั้งรหัสผ่าน 8 ตัวขึ้นไป > กด Submit"
    },
    {
        "Brand": "ZTE",
        "Mode": "การตรวจสอบสถานะ",
        "Details": "ไปที่เมนู Status > Network Interface > WAN Connection\nดูที่สถานะ IPv4 Status: หากขึ้น Connected และได้รับเลข IP Address มาแล้ว แสดงว่าใช้งานได้ครับ\n\"ข้อสังเกต: หน้าตาเมนู (Interface) ของ ZTE จะมี 2 แบบหลักๆ คือ สีเขียว (รุ่นเก่า/Classic) และ สีขาว-ฟ้า (รุ่นใหม่) แต่หัวข้อเมนูหลักอย่าง Network, WAN, WLAN จะใช้ชื่อเหมือนกัน\""
    },
    {
        "Brand": "FORTH",
        "Mode": "General",
        "Details": "1. เชื่อมต่อ: เสียบสาย LAN เข้าคอมพิวเตอร์ หรือเกาะ Wi-Fi\n2. เปิด Browser: พิมพ์ IP Address 192.168.1.1\n3. กรอก Username / Password:\nUsername : admin / admin / admin\nPassword : tot / 1234 / admin\n(หากไม่ได้ ให้ดูสติกเกอร์ใต้เครื่อง)"
    },
    {
        "Brand": "FORTH",
        "Mode": "การตั้งค่าอินเทอร์เน็ต (WAN Setup)",
        "Details": "ไปที่เมนูแท็บด้านบน Interface Setup > เลือกเมนูย่อย Internet"
    },
    {
        "Brand": "FORTH",
        "Mode": "Router Mode (PPPoE)",
        "Details": "- ISP: เลือก PPPoE/PPPoA\n- IP Version: เลือก IPv4 (หรือ IPv4/IPv6)\n- VLAN ID: เลือก Activated (เปิดใช้งาน VLAN)\nใส่เลข VLAN ID ให้ถูกต้อง (ขึ้นอยู่กับพื้นที่ชุมสาย ต้องตรวจสอบกับเจ้าหน้าที่)\n- Username: ใส่ User PPPoE (เช่น xxxxjxxxx@tothome)\n- Password: ใส่รหัสผ่าน PPPoE\n- Bridge Interface: ติ๊กเลือก Deactivated (ปิด Bridge)\n- Default Route: เลือก Yes\n- กดปุ่ม SAVE ด้านล่างสุด"
    },
    {
        "Brand": "FORTH",
        "Mode": "Bridge Mode",
        "Details": "- ISP: เลือก Bridge Mode\n- VLAN ID: เลือก Activated\nใส่เลข VLAN ID ของพื้นที่นั้นๆ\n- Bridge Interface: ติ๊กเลือก Activated\n- กดปุ่ม SAVE ด้านล่างสุด\nการตั้งค่า Wi-Fi (Wireless Setup)\n- ไปที่เมนูแท็บด้านบน Interface Setup > เลือกเมนูย่อย Wireless\n- Access Point: เลือก Activated\n- SSID: ตั้งชื่อ Wi-Fi ที่ต้องการ (ภาษาอังกฤษ)\n- Authentication Type: เลือก WPA2-PSK (หรือ WPA-PSK/WPA2-PSK)\n- Encryption: เลือก AES\n- Pre-Shared Key: ตั้งรหัสผ่าน Wi-Fi (8 ตัวอักษรขึ้นไป)\n- กดปุ่ม SAVE ด้านล่างสุด"
    },
    {
        "Brand": "FORTH",
        "Mode": "การตรวจสอบสถานะ",
        "Details": "- ไปที่เมนูแท็บ Stat\n- ดูในส่วนของ WAN หรือ System Info\n- หากช่อง IP Address ขึ้นเป็นตัวเลข (ที่ไม่ใช่ 0.0.0.0) แสดงว่าเชื่อมต่อสำเร็จ\nเพิ่มเติมสำหรับ FORTH:\nVLAN ของ NT (TOT): เนื่องจาก FORTH มักใช้ในงานของ NT เป็นหลัก ค่า VLAN ที่พบบ่อยคือ 33 (สำหรับเน็ตบ้านทั่วไปในระบบเดิม) แต่ระบบใหม่ ๆ อาจเปลี่ยนไป ดังนั้นหากตั้งค่าแล้วไฟ Internet ไม่ติด ให้เช็กเรื่อง VLAN ID เป็นจุดแรก\nเมนู Advance: หากหาเมนูตั้งค่า VLAN ไม่เจอ ให้ลองมองหาปุ่มหรือเมนูที่ชื่อ Advanced Setup หรือ VLAN Tag แยกต่างหากในบาง Firmware รุ่นเก่า"
    },
    {
        "Brand": "Fiberhome",
        "Mode": "General",
        "Details": "การเข้าสู่ระบบ: พิมพ์ IP Address > ล็อกอินด้วยบัญชี Admin\nตั้งค่าโหมด Router (PPPoE):\nไปที่เมนู Network > Broadband Settings\nเลือก Connection Mode เป็น Route > เลือก PPPoE\n\"ใส่ VLAN ID, Username และ Password > กด Save\"\nตั้งค่าโหมด Bridge:\nไปที่เมนู Network > Broadband Settings\nเลือก Connection Mode เป็น Bridge > ใส่ VLAN ID > ทำการผูกพอร์ตที่ Port Binding"
    }
];
module.exports = fastOnuData;
