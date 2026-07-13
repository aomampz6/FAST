let fastData = [];

// Authentication Check
const token = localStorage.getItem('fast_user_token');
if (!token) {
    window.location.href = '/';
}

const API_URL = 'http://localhost:3000/api';

// Fetch data from API
async function loadDataFromAPI() {
    try {
        const token = localStorage.getItem('fast_user_token') || localStorage.getItem('fast_admin_token');
        const res = await fetch(`${API_URL}/scoms`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
            fastData = await res.json();
        } else {
            console.warn('API returned non-ok status, falling back to data.js if available');
            if (typeof window.fastDataFallback !== 'undefined') fastData = window.fastDataFallback;
        }
    } catch (e) {
        console.warn('Failed to fetch from API, falling back to data.js if available', e);
        if (typeof window.fastDataFallback !== 'undefined') fastData = window.fastDataFallback;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Basic auth check
    const token = localStorage.getItem('fast_user_token');
    const adminToken = localStorage.getItem('fast_admin_token');
    
    if (!token && !adminToken) {
        window.location.href = '/';
        return;
    }
    
    await loadDataFromAPI();

    // Initialize Lucide icons
    lucide.createIcons();

    // Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');

    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Desktop Sidebar Collapse Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            document.querySelector('.main-content').classList.toggle('collapsed');
            
            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.setAttribute('data-lucide', 'chevron-right');
            } else {
                icon.setAttribute('data-lucide', 'chevron-left');
            }
            lucide.createIcons();
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // User Profile Dropdown Logic (Removed in favor of dedicated view)
    const profileBtn = document.getElementById('user-profile-btn');
    if (profileBtn) {
        const parseJwt = (t) => {
            try { return JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))); }
            catch(e) { return null; }
        };
        const t = localStorage.getItem('fast_user_token');
        if (t) {
            const payload = parseJwt(t);
            if (payload) {
                const fullName = payload.fullName || (payload.id === 'admin' ? 'ผู้ดูแลระบบ' : payload.id);
                const spanEl = profileBtn.querySelector('span');
                if (spanEl) spanEl.innerText = fullName;
            }
        }
    }

    // Theme Management
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    };

    const toggleTheme = () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    };

    const updateThemeIcon = (theme) => {
        const iconName = theme === 'light' ? 'moon' : 'sun';
        themeToggleBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons();
    };

    themeToggleBtn.addEventListener('click', toggleTheme);
    initTheme();

    // View Data
    const views = {
        'user-profile': {
            title: 'ข้อมูลส่วนตัว',
            render: () => {
                const t = localStorage.getItem('fast_user_token');
                let fullName = 'ผู้ดูแลระบบ';
                let empId = 'ADM-001';
                let email = 'admin@fast.net';
                let timeStr = '0 นาที';
                
                if (t) {
                    const parseJwt = (t) => {
                        try { return JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))); }
                        catch(e) { return null; }
                    };
                    const payload = parseJwt(t);
                    if (payload) {
                        fullName = payload.fullName || (payload.id === 'admin' ? 'ผู้ดูแลระบบ' : payload.id);
                        empId = payload.empId || (payload.id === 'admin' ? 'ADM-001' : payload.id);
                        email = payload.email || (payload.id === 'admin' ? 'admin@fast.net' : 'user@nt.com');
                        
                        if (payload.iat) {
                            const diffMs = Date.now() - (payload.iat * 1000);
                            const diffMins = Math.floor(diffMs / 60000);
                            const hours = Math.floor(diffMins / 60);
                            const mins = diffMins % 60;
                            timeStr = '';
                            if (hours > 0) timeStr += hours + ' ชั่วโมง ';
                            timeStr += mins + ' นาที';
                        }
                    }
                }
                
                return `
                    <div class="mb-4">
                        <button onclick="window.app.navigate('dashboard')" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 20px; box-shadow: var(--shadow-sm); transition: var(--transition);">
                            <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i> กลับหน้าหลัก
                        </button>
                    </div>
                    <div class="card" style="max-width: 600px; margin: 0 auto; padding: 32px;">
                        <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 32px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--nt-yellow), #FFA000); display: flex; align-items: center; justify-content: center; color: var(--nt-dark);">
                                <i data-lucide="user" style="width: 40px; height: 40px;"></i>
                            </div>
                            <div>
                                <h2 style="margin-bottom: 8px; font-size: 24px; color: var(--nt-yellow);">${fullName}</h2>
                                <p style="color: var(--text-secondary); font-size: 16px;">รหัสพนักงาน: ${empId}</p>
                            </div>
                        </div>
                        
                        <div style="display: grid; gap: 20px; margin-bottom: 32px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                                <div style="color: var(--text-secondary); font-weight: 600;">E-Mail</div>
                                <div style="font-weight: 500;">${email}</div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                                <div style="color: var(--text-secondary); font-weight: 600;">Status</div>
                                <div style="font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #4CAF50; box-shadow: 0 0 8px #4CAF50;"></div>
                                    Online
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                                <div style="color: var(--text-secondary); font-weight: 600;">ระยะเวลาที่ Online</div>
                                <div style="font-weight: 500; color: var(--nt-yellow);">${timeStr}</div>
                            </div>
                        </div>
                        

                    </div>
                `;
            },
            afterRender: () => lucide.createIcons()
        },
        'phonebook': {
            title: 'ข้อมูล สมุดโทรศัพท์',
            render: () => `
                <style>
                    .phone-contact-row {
                        background: var(--bg-main); 
                        padding: 16px; 
                        border-radius: var(--radius-md); 
                        border: 1px solid var(--border-light); 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        gap: 12px;
                    }
                    .phone-btn {
                        display: flex; 
                        align-items: center; 
                        gap: 8px; 
                        background: rgba(255,255,255,0.05); 
                        padding: 8px 16px; 
                        border-radius: 20px; 
                        border: 1px solid var(--border-color);
                    }
                    @media (max-width: 600px) {
                        .phone-contact-row {
                            flex-direction: column;
                            align-items: flex-start;
                            text-align: left;
                            padding: 16px 12px;
                        }
                        .phone-btn {
                            width: 100%;
                            box-sizing: border-box;
                            justify-content: center;
                            margin-top: 12px;
                            padding: 12px;
                        }
                    }
                </style>

                <div style="text-align: left; margin-bottom: 24px;">
                    <button onclick="window.app.navigate('dashboard')" style="background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 15px; transition: 0.2s; display: inline-flex; align-items: center; gap: 8px;">
                        <i data-lucide="arrow-left" style="width: 18px; height: 18px;"></i> กลับหน้าหลัก
                    </button>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 200, 0, 0.1); display: flex; align-items: center; justify-content: center; color: var(--nt-yellow);">
                            <i data-lucide="building-2" style="width: 24px; height: 24px;"></i>
                        </div>
                        <h3 style="font-size: 20px; margin: 0; color: var(--text-primary); line-height: 1.4;">ส่วนงานที่เกี่ยวข้อง<br>บลนน.</h3>
                    </div>
                    
                    <div style="display: grid; gap: 16px;">
                        <div class="phone-contact-row">
                            <div>
                                <h4 style="font-size: 16px; margin: 0 0 4px 0; color: var(--text-primary);">รับงานติดตั้ง / ตรวจแก้ Broadband (FTTx , IP-Phone)</h4>
                                <span style="font-size: 14px; color: var(--text-secondary);">ขบลนน.</span>
                            </div>
                            <div class="phone-btn">
                                <i data-lucide="phone" style="width: 16px; height: 16px; color: var(--nt-yellow);"></i>
                                <span style="font-size: 16px; font-weight: 600; color: var(--nt-yellow); letter-spacing: 0.5px;">023720811</span>
                            </div>
                        </div>
                        
                        <div class="phone-contact-row">
                            <div>
                                <h4 style="font-size: 16px; margin: 0 0 4px 0; color: var(--text-primary);">รับงานชุมสาย / Sip Trunk / PRI</h4>
                                <span style="font-size: 14px; color: var(--text-secondary);">ชบลนน.</span>
                            </div>
                            <div class="phone-btn">
                                <i data-lucide="phone" style="width: 16px; height: 16px; color: var(--nt-yellow);"></i>
                                <span style="font-size: 16px; font-weight: 600; color: var(--nt-yellow); letter-spacing: 0.5px;">023720812</span>
                            </div>
                        </div>
                        
                        <div class="phone-contact-row">
                            <div>
                                <h4 style="font-size: 16px; margin: 0 0 4px 0; color: var(--text-primary);">รับงานติดตั้ง / ตรวจแก้ลูกค้า LLI</h4>
                                <span style="font-size: 14px; color: var(--text-secondary);">ญบลนน.</span>
                            </div>
                            <div class="phone-btn">
                                <i data-lucide="phone" style="width: 16px; height: 16px; color: var(--nt-yellow);"></i>
                                <span style="font-size: 16px; font-weight: 600; color: var(--nt-yellow); letter-spacing: 0.5px;">023720813</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(76, 175, 80, 0.1); display: flex; align-items: center; justify-content: center; color: #4CAF50;">
                            <i data-lucide="server" style="width: 24px; height: 24px;"></i>
                        </div>
                        <h3 style="font-size: 20px; margin: 0; color: var(--text-primary);">ส่วนงาน Bras, Radius</h3>
                    </div>
                    
                    <div class="phone-contact-row">
                        <div>
                            <h4 style="font-size: 16px; margin: 0 0 4px 0; color: var(--text-primary);">งาน switch game mail และ user ออเทน</h4>
                        </div>
                        <div class="phone-btn">
                            <i data-lucide="phone" style="width: 16px; height: 16px; color: #4CAF50;"></i>
                            <span style="font-size: 16px; font-weight: 600; color: #4CAF50; letter-spacing: 0.5px;">025755190 <span style="font-size: 13px; font-weight: normal; margin-left: 4px; opacity: 0.8;">กด 2</span></span>
                        </div>
                    </div>
                </div>
            `
        },
        'dashboard': {
            title: 'หน้าหลัก',
            render: () => `
                <div class="card hero-banner">
                    <div class="hero-icon-wrapper">
                        <i data-lucide="book-open" class="hero-icon"></i>
                    </div>
                    <h4 class="hero-subtitle">Field Assistant System For Technician (FAST)</h4>
                    <h3 class="hero-title">คู่มือการตรวจสอบและแก้ไขปัญหา</h3>
                    <p class="hero-desc">เลือกระบบคู่มือที่คุณต้องการใช้งานด้านล่าง</p>
                </div>

                <!-- Parameters Table -->
                <div class="card" style="margin-top: 24px; margin-bottom: 24px;">
                    <h3 class="mb-2" style="font-size: 18px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <i data-lucide="activity" style="color: var(--nt-yellow);"></i>
                        ข้อมูลพารามิเตอร์อ้างอิง
                    </h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ประเภทอุปกรณ์ (Type)</th>
                                    <th>พารามิเตอร์ (Parameter)</th>
                                    <th>เกณฑ์มาตรฐาน (Standard)</th>
                                    <th>คำแนะนำของระบบ (Recommendation)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td data-label="ประเภทอุปกรณ์">Fiber Optic (FTTx)</td>
                                    <td data-label="พารามิเตอร์"><strong style="color: var(--danger);">Rx Power</strong></td>
                                    <td data-label="เกณฑ์มาตรฐาน"><span class="badge danger" style="font-weight: 600; width: fit-content; display: inline-block;">-15 ถึง -25 dBm</span></td>
                                    <td data-label="คำแนะนำของระบบ">หากค่าเกิน -25 dBm ระบบแนะนำให้เช็กสายพับ</td>
                                </tr>
                                <tr>
                                    <td data-label="ประเภทอุปกรณ์">Fiber Optic (FTTx)</td>
                                    <td data-label="พารามิเตอร์"><strong style="color: var(--warning);">Tx Power</strong></td>
                                    <td data-label="เกณฑ์มาตรฐาน"><span class="badge warning" style="font-weight: 600; width: fit-content; display: inline-block;">0.5 ถึง 5.0 dBm</span></td>
                                    <td data-label="คำแนะนำของระบบ">ให้ตรวจสอบคุณภาพสาย Fiber หากค่าที่ส่งออกมีความผิดปกติ</td>
                                </tr>
                                <tr>
                                    <td data-label="ประเภทอุปกรณ์">Router</td>
                                    <td data-label="พารามิเตอร์"><strong style="color: var(--info);">Client Devices</strong></td>
                                    <td data-label="เกณฑ์มาตรฐาน"><span style="font-weight: 600; font-size: 14px; background: var(--bg-main); padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid var(--border-light); color: var(--text-primary);">เกิน 15-20 เครื่อง</span></td>
                                    <td data-label="คำแนะนำของระบบ">แนะนำให้เปลี่ยนเราเตอร์ที่มีสเปกสูงขึ้น</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h3 class="mb-4" style="font-size: 18px;">เมนูลัด (Quick Actions)</h3>
                    <div class="quick-actions grid" style="margin-top: 16px;">
                        <button class="quick-action-btn" onclick="app.navigate('troubleshoot')">
                            <i data-lucide="search" style="width: 32px; height: 32px; color: var(--brand-primary);"></i>
                            ตรวจสอบอาการเสีย
                        </button>
                        <button class="quick-action-btn" onclick="app.navigate('onu-setup')">
                            <i data-lucide="settings" style="width: 32px; height: 32px; color: var(--nt-gray);"></i>
                            ตั้งค่า ONU รุ่นต่างๆ
                        </button>
                    </div>
                </div>

                <div class="card" style="margin-top: 24px;">
                    <h3 class="mb-2" style="font-size: 18px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="bar-chart-2" style="color: var(--info);"></i>
                        ข้อมูลอ้างอิง: สถิติระยะเวลาเฉลี่ยที่ใช้ในการแก้ไขเหตุเสีย
                    </h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">
                        <i data-lucide="calendar" style="width: 14px; height: 14px; vertical-align: middle;"></i> ข้อมูลของ วันที่ 1 มกราคม 2568 - 31 ธันวาคม 2568
                    </p>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>กลุ่มอาการเสีย</th>
                                    <th>รายละเอียดการแก้ไข</th>
                                    <th style="text-align: center;">จำนวนงาน</th>
                                    <th>ค่าเฉลี่ยเวลา</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>ไฟ PON ไม่ติด / ไม่มีสัญญาณ</td>
                                    <td data-label="รายละเอียดการแก้ไข">XN0112 ยกเลิกสัญญา</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">3</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">8 วัน 0 ชั่วโมง 48 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>เปิดหน้า WEB ไม่ได้</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">13</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">5 วัน 13 ชั่วโมง 41 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>connect ไม่ได้</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">205</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 22 ชั่วโมง 41 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>ความเร็วไม่ตรงตามที่ขอ / Speed ตก</td>
                                    <td data-label="รายละเอียดการแก้ไข">XN0104 รอนัด</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 21 ชั่วโมง 52 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>Disconnect บ่อย</td>
                                    <td data-label="รายละเอียดการแก้ไข">UNC014 ปรับเปลี่ยน NAT IP</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">3</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 9 ชั่วโมง 51 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>รับ-ส่ง Mail ไม่ได้</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0580 เปลี่ยน Wireless Router/AP ที่เสีย</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 3 ชั่วโมง 34 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>อื่นๆ</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0606 เปลี่ยนตู้ OFCCC ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 1 ชั่วโมง 2 นาที</td>
                                </tr>
                                <tr class="accordion-row" onclick="this.classList.toggle('expanded')">
                                    <td data-label="กลุ่มอาการเสีย"><span class="accordion-toggle"></span>ไฟ Pon กระพริบ</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0609 คลี่จัดระเบียบสายที่ตู้ OFCCC เนื่องจากสายโค้งงอ</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">2 วัน 2 ชั่วโมง 5 นาที</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 16px; text-align: center; font-size: 13px; color: var(--text-secondary); line-height: 1.6; font-weight: 600;">
                        ***หมายเหตุ ระยะเวลาของข้อมูลที่นำมาใช้คำนวณ คือ ตั้งแต่วันที่ 1 มกราคม 2568 - 31 ธันวาคม 2568
                    </div>
                </div>
            `
        },
        'troubleshoot': {
            title: 'ตรวจสอบและแก้ไขงานเสีย',
            render: () => `
                <div class="flow-container" id="ts-container">
                    <!-- Dynamic flow content will be injected here -->
                </div>
            `,
            afterRender: () => window.initTroubleshootFlow()
        },
        'onu-setup': {
            title: 'การตั้งค่าอุปกรณ์ FTTx (ONU)',
            render: () => `
                <div class="mb-4">
                    <button onclick="window.app.navigate('dashboard')" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 20px; box-shadow: var(--shadow-sm); transition: var(--transition);">
                        <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i> กลับหน้าหลัก
                    </button>
                </div>
                <div class="card mb-6">
                    <h3 class="mb-4">เลือกยี่ห้ออุปกรณ์ (Brand)</h3>
                    <div class="options-grid" id="brand-select">
                        <button class="option-btn brand-card" onclick="showOnuConfig('Huawei')">
                            <div class="brand-icon-wrapper"><i data-lucide="monitor"></i></div>
                            <span>Huawei</span>
                        </button>
                        <button class="option-btn brand-card" onclick="showOnuConfig('ZTE')">
                            <div class="brand-icon-wrapper"><i data-lucide="monitor"></i></div>
                            <span>ZTE</span>
                        </button>
                        <button class="option-btn brand-card" onclick="showOnuConfig('Forth')">
                            <div class="brand-icon-wrapper"><i data-lucide="monitor"></i></div>
                            <span>Forth</span>
                        </button>
                        <button class="option-btn brand-card" onclick="showOnuConfig('Fiberhome')">
                            <div class="brand-icon-wrapper"><i data-lucide="monitor"></i></div>
                            <span>Fiberhome</span>
                        </button>
                    </div>
                </div>
                <div id="onu-config-result"></div>
            `
        }
    };

    // Troubleshoot Flow Logic
    window.initTroubleshootFlow = () => {
        if (typeof fastData === 'undefined') {
            document.getElementById('ts-container').innerHTML = `<div class="card"><p style="color: var(--danger);">Error: ไม่พบข้อมูล (data.js) กรุณาตรวจสอบ</p></div>`;
            return;
        }

        // Group data by 'Group'
        const groups = {};
        fastData.forEach(item => {
            if (item.Group === 'กลุ่มประเภทเหตุเสีย') return;
            if (item.Group) {
                if (!groups[item.Group]) {
                    groups[item.Group] = [];
                }
                groups[item.Group].push(item);
            }
        });

        let html = `
            <div class="mb-4" style="display: flex; gap: 12px; align-items: center;">
                <button onclick="window.app.navigate('dashboard')" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 20px; box-shadow: var(--shadow-sm); transition: var(--transition); white-space: nowrap;">
                    <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i> กลับหน้าหลัก
                </button>
                <div style="position: relative; flex-grow: 1;">
                    <i data-lucide="search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); width: 20px; height: 20px;"></i>
                    <input type="text" id="ts-search-input" placeholder="ค้นหาอาการเสีย..." style="width: 100%; padding: 12px 16px 12px 44px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary); font-size: 16px; box-shadow: var(--shadow-sm); outline: none; transition: var(--transition);" onkeyup="
                        let val = this.value.toLowerCase();
                        if (val.includes('หลุดบ่อย')) {
                            val = 'disconnect';
                        }
                        document.querySelectorAll('.manual-group-btn').forEach(btn => {
                            if (btn.innerText.toLowerCase().includes(val)) {
                                btn.style.display = 'flex';
                            } else {
                                btn.style.display = 'none';
                            }
                        });
                    ">
                </div>
            </div>
            </div>
            <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; margin-top: 8px; color: var(--text-primary); font-size: 16px;">
                <i data-lucide="layout-grid" style="color: #3b82f6; width: 20px; height: 20px;"></i> หมวดหมู่อาการเสีย
            </h3>
            <div class="manual-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        `;
        
        for (const [groupName, items] of Object.entries(groups)) {
            let iconName = 'alert-circle';
            let iconColor = '#94a3b8';
            let bgColor = 'rgba(148, 163, 184, 0.1)';
            
            const nameLower = groupName.toLowerCase();
            if (nameLower.includes('disconnect')) { iconName = 'network'; iconColor = '#ef4444'; bgColor = 'rgba(239, 68, 68, 0.1)'; }
            else if (nameLower.includes('connect')) { iconName = 'wifi-off'; iconColor = '#f97316'; bgColor = 'rgba(249, 115, 22, 0.1)'; }
            else if (nameLower.includes('speed')) { iconName = 'gauge'; iconColor = '#8b5cf6'; bgColor = 'rgba(139, 92, 246, 0.1)'; }
            else if (nameLower.includes('กระพริบ')) { iconName = 'lightbulb'; iconColor = '#eab308'; bgColor = 'rgba(234, 179, 8, 0.1)'; }
            else if (nameLower.includes('web')) { iconName = 'globe'; iconColor = '#3b82f6'; bgColor = 'rgba(59, 130, 246, 0.1)'; }
            else if (nameLower.includes('mail')) { iconName = 'mail'; iconColor = '#0ea5e9'; bgColor = 'rgba(14, 165, 233, 0.1)'; }
            else if (nameLower.includes('ip-phone') || nameLower.includes('โทร')) { iconName = 'phone-call'; iconColor = '#22c55e'; bgColor = 'rgba(34, 197, 94, 0.1)'; }
            else if (nameLower.includes('ไม่ติด')) { iconName = 'power'; iconColor = '#475569'; bgColor = 'rgba(71, 85, 105, 0.1)'; }
            else { iconName = 'wrench'; iconColor = '#14b8a6'; bgColor = 'rgba(20, 184, 166, 0.1)'; }

            let displayName = groupName;
            if (displayName.includes('ไฟ PON ไม่ติด')) {
                displayName = 'ไฟ PON ไม่ติด'; 
            }

            html += `
                <button class="manual-group-btn" onclick="window.showTroubleshootGroup('${groupName}')" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: 0.2s;">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; color: ${iconColor};">
                        <i data-lucide="${iconName}" style="width: 28px; height: 28px;"></i>
                    </div>
                    <span style="font-size: 14px; font-weight: 500; color: var(--text-primary); text-align: center;">${displayName}</span>
                </button>
            `;
        }

        html += `</div>`;
        document.getElementById('ts-container').innerHTML = html;
        lucide.createIcons();
    };

    window.renderSymptomDetail = (indexStr, groupName) => {
        if (!indexStr) return;
        
        const items = fastData.filter(item => item.Group === groupName);
        const item = items[parseInt(indexStr)];
        if (!item) return;

        let symptomImage = '';
        const searchStr = (item.Steps || '') + ' ' + (item.CheckPoint || '') + ' ' + (item.Symptom || '');
        if (searchStr.includes('Power Meter') || searchStr.includes('dBm')) {
            symptomImage = 'assets/optical_power_check.jpg';
        } else if (searchStr.toLowerCase().includes('wi-fi') || searchStr.toLowerCase().includes('channel')) {
            symptomImage = 'assets/wifi_channel_check.jpg';
        } else if (groupName.includes('สถานะไฟ') || searchStr.includes('ไฟ PON') || searchStr.includes('ไฟ LOS')) {
            symptomImage = 'assets/router_led_status.jpg';
        }

        let titleColor = '#1f2937';
        if (searchStr.includes('LOS') || searchStr.includes('ไม่ติด')) titleColor = '#ef4444';
        else if (searchStr.includes('กระพริบ')) titleColor = '#eab308';

        let html = `
            <div class="sheet-content active">
                <h2 style="font-size: 20px; font-weight: 700; color: ${titleColor}; margin-bottom: 4px;">${item.Symptom || '-'}</h2>
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">${item.Scoms || ''}</p>
        `;

        if (symptomImage) {
            html += `
                <img src="${symptomImage}" alt="Illustration" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            `;
        }
        
        html += `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <h4 style="font-weight: 700; color: var(--text-primary); font-size: 14px; margin-bottom: 12px;">ขั้นตอนตรวจสอบ (แตะเพื่อขีดฆ่า)</h4>
        `;

        let stepNum = 1;
        if (item.CheckPoint) {
            html += `
                <div class="step-item" onclick="window.toggleStep(this)" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm);">
                    <div class="step-number" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #d1d5db; color: #6b7280; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700; position: relative;">
                        <span class="number-text">${stepNum++}</span><i data-lucide="check" class="check-icon" style="position: absolute; width: 14px; height: 14px; color: white;"></i>
                    </div>
                    <div class="step-text" style="font-size: 14px; color: var(--text-primary); padding-top: 2px;">
                        <strong style="color: var(--text-secondary); display: block; margin-bottom: 4px;">จุดที่ต้องเช็คจุดแรก:</strong>
                        ${item.CheckPoint.replace(/"/g, '')}
                    </div>
                </div>
            `;
        }

        if (item.Steps) {
            const stepLines = item.Steps.replace(/"/g, '').split(/\n/).filter(line => line.trim().length > 0);
            stepLines.forEach(line => {
                html += `
                    <div class="step-item" onclick="window.toggleStep(this)" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm);">
                        <div class="step-number" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #d1d5db; color: #6b7280; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700; position: relative;">
                            <span class="number-text">${stepNum++}</span><i data-lucide="check" class="check-icon" style="position: absolute; width: 14px; height: 14px; color: white;"></i>
                        </div>
                        <div class="step-text" style="font-size: 14px; color: var(--text-primary); padding-top: 2px;">
                            ${line}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
            </div>
        </div>
        `;

        document.getElementById('sheet-content-container').innerHTML = html;
        lucide.createIcons();
        window.openSheet();
    };

    window.openSheet = () => {
        const overlay = document.getElementById('sheetOverlay');
        const sheet = document.getElementById('bottomSheet');
        if (overlay && sheet) {
            overlay.classList.add('active');
            sheet.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (navigator.vibrate) navigator.vibrate(50);
        }
    };

    window.closeSheet = () => {
        const overlay = document.getElementById('sheetOverlay');
        const sheet = document.getElementById('bottomSheet');
        if (overlay && sheet) {
            overlay.classList.remove('active');
            sheet.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    window.toggleStep = (element) => {
        element.classList.toggle('completed');
        if (navigator.vibrate) navigator.vibrate(20);
    };

    window.showTroubleshootGroup = (groupName) => {
        if (typeof fastData === 'undefined') return;
        
        const items = fastData.filter(item => item.Group === groupName);
        let html = `
            <div style="background: var(--brand-primary); color: white; padding: 24px; border-radius: 0 0 24px 24px; margin: -20px -20px 24px -20px; display: flex; align-items: center; gap: 16px;">
                <button onclick="window.initTroubleshootFlow()" style="background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; transition: 0.2s;">
                    <i data-lucide="arrow-left"></i>
                </button>
                <div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">${groupName.replace(' / ไม่มีสัญญาณ', '')}</h2>
                    <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">เลือกอาการที่พบหน้างาน</p>
                </div>
            </div>
            
            <div id="symptom-list" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
        `;

        items.forEach((item, index) => {
            const sym = item.Symptom || 'ไม่ระบุอาการ';
            const lowerSym = sym.toLowerCase();
            
            // Default Card styling (Dark Theme)
            let headerIcon = 'router';
            let headerColor = '#94a3b8'; // gray
            let ledsHtml = '';
            let subtitle = item.Scoms || ''; // Use Scoms as subtitle if possible
            
            if (groupName.includes('ไฟ') || lowerSym.includes('ไฟ') || subtitle.includes('ไฟ')) {
                // Determine LED states based on symptom text
                let pwr = { class: 'led-green', text: 'PWR', textBg: 'transparent', textColor: '#94a3b8' };
                let mid = { class: 'led-green', text: 'PON', textBg: 'transparent', textColor: '#94a3b8' };
                let int = { class: 'led-off', text: 'INT', textBg: 'transparent', textColor: '#475569' };
                
                const searchText = (lowerSym + ' ' + groupName.toLowerCase() + ' ' + subtitle.toLowerCase());
                
                if (searchText.includes('adsl') || searchText.includes('dsl')) {
                    mid.text = 'ADSL';
                }

                if (searchText.includes('los')) {
                    headerIcon = 'alert-triangle';
                    headerColor = '#ef4444'; // red
                    mid = { class: 'led-red-blink', text: 'LOS', textBg: '#450a0a', textColor: '#fca5a5' };
                    subtitle = subtitle || 'สายเคเบิลมีปัญหา / สัญญาณขาด';
                } else if (searchText.includes('pon กระพริบ') || searchText.includes('pon ติดกระพริบ') || searchText.includes('adsl กระพริบ') || searchText.includes('dsl กระพริบ')) {
                    headerIcon = 'satellite-dish';
                    headerColor = '#eab308'; // yellow
                    mid.class = 'led-yellow-blink';
                    mid.textBg = '#422006'; // dark yellow bg
                    mid.textColor = '#fde047'; // light yellow text
                    subtitle = subtitle || 'กำลังตรวจสอบสัญญาณ';
                } else if (searchText.includes('pon ไม่ติด') || searchText.includes('dsl ไม่ติด') || searchText.includes('adsl ไม่ติด') || searchText.includes('ไม่มีสัญญาณ')) {
                    headerIcon = 'alert-circle';
                    headerColor = '#ef4444';
                    mid.class = 'led-off';
                    mid.textBg = '#450a0a';
                    mid.textColor = '#fca5a5';
                    subtitle = subtitle || 'ไม่มีสัญญาณ / สายขาด';
                } else if (searchText.includes('internet ไม่ติด') || searchText.includes('เข้าใช้งาน internet ไม่ได้') || searchText.includes('เข้าเว็บไม่ได้')) {
                    headerIcon = 'wifi';
                    headerColor = '#94a3b8';
                    int.class = 'led-off';
                    int.textBg = '#450a0a'; // dark red bg
                    int.textColor = '#fca5a5'; // light red text
                    subtitle = subtitle || 'แต่ไฟ PON ติดค้างสีเขียว';
                }
                
                ledsHtml = `
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-around; align-items: center;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <div class="led ${pwr.class}"></div>
                            <span style="font-size: 11px; font-weight: 700; color: ${pwr.textColor}; background: ${pwr.textBg}; padding: 2px 6px; border-radius: 4px;">${pwr.text}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <div class="led ${mid.class}"></div>
                            <span style="font-size: 11px; font-weight: 700; color: ${mid.textColor}; background: ${mid.textBg}; padding: 2px 6px; border-radius: 4px;">${mid.text}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <div class="led ${int.class}"></div>
                            <span style="font-size: 11px; font-weight: 700; color: ${int.textColor}; background: ${int.textBg}; padding: 2px 6px; border-radius: 4px;">${int.text}</span>
                        </div>
                    </div>
                `;
            }
            
            html += `
                <div class="symptom-card" onclick="window.renderSymptomDetail('${index}', '${groupName}');" style="background: #1a1f36; border-radius: 16px; padding: 20px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden; transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; color: ${headerColor}; font-size: 12px; font-weight: 700; letter-spacing: 1px;">
                            <i data-lucide="${headerIcon}" style="width: 16px; height: 16px;"></i> ROUTER STATUS
                        </div>
                        <i data-lucide="chevron-right" style="color: #475569; width: 20px; height: 20px;"></i>
                    </div>
                    
                    ${ledsHtml}
                    
                    <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 4px 0; font-weight: 700; ${lowerSym.includes('los') ? 'color: #fca5a5;' : (lowerSym.includes('pon กระพริบ') ? 'color: #fde047;' : '')}">${sym}</h3>
                    <p style="color: #94a3b8; margin: 0; font-size: 13px;">${subtitle}</p>
                </div>
            `;
        });

        html += `
            </div>
            <div id="symptom-detail-container" style="display: none;"></div>
        `;

        document.getElementById('ts-container').innerHTML = html;
        lucide.createIcons();
    };
        
    // Expose global methods
    window.app = {
        navigate: (viewId) => {
            // Update Active Nav
            navItems.forEach(item => {
                if(item.getAttribute('data-view') === viewId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Handle mobile menu button visibility
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                if (viewId !== 'dashboard') {
                    mobileMenuBtn.style.setProperty('display', 'none', 'important');
                } else {
                    mobileMenuBtn.style.display = '';
                }
            }

            // Render View
            const view = views[viewId];
            pageTitle.textContent = view.title;
            contentArea.innerHTML = view.render();
            
            if(view.afterRender) {
                view.afterRender();
            }

            lucide.createIcons();
        }
    };

    window.showOnuConfigDetails = (mode) => {
        const detailsDiv = document.getElementById('config-details-view');
        
        let title = '';
        let imageSrc = '';
        let instructions = '';

        if (mode === 'route') {
            title = 'ตัวอย่างการตั้งค่า Route Mode';
            imageSrc = 'assets/route_config.jpg';
            instructions = '1. เข้าสู่หน้าตั้งค่าผ่าน 192.168.1.1<br>2. ไปที่เมนู WAN > Internet<br>3. กรอก Username และ Password ของลูกค้า<br>4. ระบุ VLAN ID ตามใบงาน';
        } else {
            // Fallback for others just to show the concept
            title = `ตัวอย่างการตั้งค่า ${mode}`;
            imageSrc = 'assets/route_config.jpg'; // Using the same image as a placeholder for others
            instructions = `ทำตามคู่มือ SCOMs สำหรับการตั้งค่า ${mode}`;
        }

        detailsDiv.innerHTML = `
            <div class="card" style="margin-top: 24px; animation: slideIn 0.3s ease; border-top: 4px solid var(--brand-primary);">
                <h4 class="mb-4 flex-between">
                    <span><i data-lucide="image" style="margin-right: 8px; vertical-align: middle;"></i> ${title}</span>
                    <button class="icon-btn" onclick="document.getElementById('config-details-view').innerHTML=''"><i data-lucide="x"></i></button>
                </h4>
                <div style="background: var(--bg-main); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                    <p style="color: var(--text-secondary); line-height: 1.6;">${instructions}</p>
                </div>
                <img src="${imageSrc}" alt="${title}" style="width: 100%; max-width: 800px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); display: block; margin: 0 auto;">
            </div>
        `;
        lucide.createIcons();
        detailsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.showOnuConfig = (brand) => {
        const resultDiv = document.getElementById('onu-config-result');
        resultDiv.innerHTML = `
            <div class="card" style="animation: fadeIn 0.3s ease;">
                <h3 class="mb-4 flex-between">
                    <span>ตั้งค่า ${brand} ONU</span>
                    <span class="badge warning" style="font-size: 14px;">โหมดการใช้งาน</span>
                </h3>
                
                <div class="grid mb-4">
                    <div class="resolution-box" style="margin-top: 0; background: rgba(34, 139, 230, 0.1); border-color: var(--info);">
                        <h4 style="color: var(--info);"><i data-lucide="globe"></i> Internet</h4>
                        <p class="mb-4">เลือกโหมดที่ต้องการติดตั้ง:</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button class="btn-primary" style="background: var(--info); color: white;" onclick="showOnuConfigDetails('route')">Route Mode</button>
                            <button class="btn-secondary" onclick="showOnuConfigDetails('Bridge Mode')">Bridge Mode</button>
                        </div>
                    </div>
                    
                    <div class="resolution-box" style="margin-top: 0; background: rgba(250, 82, 82, 0.1); border-color: var(--danger);">
                        <h4 style="color: var(--danger);"><i data-lucide="phone"></i> IP-Phone</h4>
                        <p class="mb-4">รายละเอียดการตั้งค่า:</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button class="btn-secondary" style="border-color: var(--danger); color: var(--danger);" onclick="showOnuConfigDetails('ATA')">ATA</button>
                            <button class="btn-secondary" style="border-color: var(--danger); color: var(--danger);" onclick="showOnuConfigDetails('Build-in')">Build-in</button>
                        </div>
                    </div>
                </div>
                <p style="color: var(--text-tertiary); font-size: 14px; text-align: center;">* คลิกที่ปุ่มด้านบนเพื่อดูตัวอย่างรูปภาพรายละเอียดการตั้งค่า</p>
            </div>
            <div id="config-details-view"></div>
        `;
        lucide.createIcons();
    };

    // Event Listeners for Nav
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            app.navigate(viewId);
            
            // Close sidebar on mobile after clicking
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Initialize Default View
    app.navigate('dashboard');
});
