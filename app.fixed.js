let fastData = [];

// Authentication Check
const token = localStorage.getItem('fast_user_token');
if (!token) {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/scoms', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fastData = await res.json();
        } else {
            console.error('Failed to fetch data from API');
        }
    } catch (err) {
        console.error('API connection error', err);
    }

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
                                <tr>
                                    <td data-label="กลุ่มอาการเสีย">connect ไม่ได้</td>
                                    <td data-label="รายละเอียดการแก้ไข">UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">205</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 22 ชั่วโมง 41 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">ไฟ PON ไม่ติด / ไม่มีสัญญาณ</td>
                                    <td data-label="???????????????">XN0112 ยกเลิกสัญญา</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">3</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">8 วัน 0 ชั่วโมง 48 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">ความเร็วไม่ตรงตามที่ขอ / Speed ตก</td>
                                    <td data-label="???????????????">XN0104 รอนัด</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 21 ชั่วโมง 52 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">Disconnect บ่อย</td>
                                    <td data-label="???????????????">UNC014 ปรับเปลี่ยน NAT IP</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">3</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 9 ชั่วโมง 51 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">ไฟ Pon กระพริบ</td>
                                    <td data-label="???????????????">UN0609 คลี่จัดระเบียบสายที่ตู้ OFCCC เนื่องจากสายโค้งงอ</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">2 วัน 2 ชั่วโมง 5 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">เปิดหน้า WEB ไม่ได้</td>
                                    <td data-label="???????????????">UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">13</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">5 วัน 13 ชั่วโมง 41 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">รับ-ส่ง Mail ไม่ได้</td>
                                    <td data-label="???????????????">UN0580 เปลี่ยน Wireless Router/AP ที่เสีย</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 3 ชั่วโมง 34 นาที</td>
                                </tr>
                                <tr>
                                    <td data-label="?????????????">อื่นๆ</td>
                                    <td data-label="???????????????">UN0606 เปลี่ยนตู้ OFCCC ที่เสียหายทั้งตู้</td>
                                    <td data-label="จำนวนงาน" style="text-align: center;">1</td>
                                    <td data-label="ค่าเฉลี่ยเวลา">3 วัน 1 ชั่วโมง 2 นาที</td>
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
            if (item.Group) {
                if (!groups[item.Group]) {
                    groups[item.Group] = [];
                }
                groups[item.Group].push(item);
            }
        });

        let html = `
            <div class="mb-4">
                <button onclick="window.app.navigate('dashboard')" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 20px; box-shadow: var(--shadow-sm); transition: var(--transition);">
                    <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i> กลับหน้าหลัก
                </button>
            </div>
            <div class="manual-container">
        `;
        
        for (const [groupName, items] of Object.entries(groups)) {
            html += `
                <button class="manual-group-btn" onclick="window.showTroubleshootGroup('${groupName}')" style="width: 100%; padding: 20px; margin-bottom: 16px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); border-left: 4px solid var(--brand-primary); text-align: left; font-size: 18px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); box-shadow: var(--shadow-sm); transition: var(--transition);">
                    <span>${groupName}</span>
                    <i data-lucide="chevron-right"></i>
                </button>
            `;
        }

        html += `</div>`;
        document.getElementById('ts-container').innerHTML = html;
        lucide.createIcons();
    };

    window.renderSymptomDetail = (indexStr, groupName) => {
        if (!indexStr) {
            document.getElementById('symptom-detail-container').innerHTML = '';
            return;
        }
        
        const items = fastData.filter(item => item.Group === groupName);
        const item = items[parseInt(indexStr)];
        if (!item) return;

        let html = `
            <div class="symptom-item" style="margin-top: 20px; background: var(--bg-surface); padding: 20px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-light);">
                <h4 style="color: var(--brand-dark); font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-light); padding-bottom: 12px;">
                    <i data-lucide="alert-circle" style="color: var(--danger); width: 24px; height: 24px;"></i>
                    อาการ: ${item.Symptom || '-'}
                </h4>
        `;

        // Map generated images to relevant steps
        let symptomImage = '';
        const searchStr = (item.Steps || '') + ' ' + (item.CheckPoint || '') + ' ' + (item.Symptom || '');
        if (searchStr.includes('Power Meter') || searchStr.includes('dBm')) {
            symptomImage = 'assets/optical_power_check.jpg';
        } else if (searchStr.toLowerCase().includes('wi-fi') || searchStr.toLowerCase().includes('channel')) {
            symptomImage = 'assets/wifi_channel_check.jpg';
        } else if (groupName.includes('สถานะไฟ') || searchStr.includes('ไฟ PON') || searchStr.includes('ไฟ LOS')) {
            symptomImage = 'assets/router_led_status.jpg';
        }

        if (symptomImage) {
            html += `
                <div style="margin-bottom: 20px; text-align: center;">
                    <img src="${symptomImage}" alt="Illustration" style="max-width: 100%; height: auto; max-height: 280px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
                </div>
            `;
        }
        
        html += `
                <div class="grid" style="grid-template-columns: 1fr; gap: 16px;">
        `;

        if (item.CheckPoint) {
            html += `
                    <div>
                        <strong style="color: var(--text-secondary); display: block; margin-bottom: 8px;">จุดที่ต้องเช็คจุดแรก:</strong>
                        <p style="white-space: pre-line; line-height: 1.6; font-size: 15px; background: var(--bg-main); padding: 12px; border-radius: 8px;">${item.CheckPoint.replace(/"/g, '')}</p>
                    </div>
            `;
        }

        if (item.Steps) {
            html += `
                    <div>
                        <strong style="color: var(--text-secondary); display: block; margin-bottom: 8px;">ขั้นตอนการตรวจแก้:</strong>
                        <div style="background: rgba(34, 139, 230, 0.08); padding: 16px; border-radius: 8px; border-left: 4px solid var(--info);">
                            <p style="white-space: pre-line; line-height: 1.6; font-size: 15px;">${item.Steps.replace(/"/g, '')}</p>
                        </div>
                    </div>
            `;
        }
        
        if (item.NormalValue || item.Equipment) {
            html += `<div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">`;
            if (item.NormalValue) {
                html += `<span class="badge warning" style="font-size: 14px; padding: 8px 16px;"><i data-lucide="activity" style="width: 16px; height: 16px; margin-right: 6px; display: inline-block; vertical-align: text-bottom;"></i> ค่าปกติ: ${item.NormalValue}</span>`;
            }
            if (item.Equipment) {
                html += `<span class="badge" style="background: rgba(64, 192, 87, 0.15); color: var(--success); font-size: 14px; padding: 8px 16px;"><i data-lucide="tool" style="width: 16px; height: 16px; margin-right: 6px; display: inline-block; vertical-align: text-bottom;"></i> อุปกรณ์: ${item.Equipment}</span>`;
            }
            html += `</div>`;
        }

        html += `
                </div>
            </div>
        `;

        document.getElementById('symptom-detail-container').innerHTML = html;
        lucide.createIcons();
    };

    window.showTroubleshootGroup = (groupName) => {
        if (typeof fastData === 'undefined') return;
        
        const items = fastData.filter(item => item.Group === groupName);
        let html = `
            <div class="mb-4">
                <button onclick="window.initTroubleshootFlow()" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 20px; box-shadow: var(--shadow-sm); transition: var(--transition);">
                    <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i> กลับหมวดหมู่
                </button>
            </div>
            <div class="card mb-4" style="border-left: 4px solid var(--brand-primary); padding: 20px;">
                <h3 style="color: var(--text-primary); font-size: 20px; margin: 0; margin-bottom: 16px;">${groupName}</h3>
                
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">เลือกอาการเสีย:</label>
                <select id="symptom-select" onchange="window.renderSymptomDetail(this.value, '${groupName}')" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 16px; appearance: auto;">
                    <option value="" disabled selected>-- กรุณาเลือกอาการเสีย --</option>
        `;

        items.forEach((item, index) => {
            html += `<option value="${index}">${item.Symptom || 'ไม่ระบุอาการ'}</option>`;
        });

        html += `
                </select>
            </div>
            <div id="symptom-detail-container"></div>
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
