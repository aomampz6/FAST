let fastData = [];
let parameterData = [];
let onuConfigData = [];

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

// Fetch reference parameters (managed in Admin > ข้อมูลพารามิเตอร์อ้างอิง) from API
async function loadParametersFromAPI() {
    try {
        const token = localStorage.getItem('fast_user_token') || localStorage.getItem('fast_admin_token');
        const res = await fetch(`${API_URL}/parameters`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
            parameterData = await res.json();
        }
    } catch (e) {
        console.warn('Failed to fetch parameters from API', e);
    }
}

// Fetch ONU setup configs (managed in Admin > ข้อมูลการตั้งค่า onu) from API. Records
// marked Hidden by an admin are filtered out here so they never reach the user view.
async function loadOnuConfigsFromAPI() {
    try {
        const token = localStorage.getItem('fast_user_token') || localStorage.getItem('fast_admin_token');
        const res = await fetch(`${API_URL}/onu-configs`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
            const all = await res.json();
            onuConfigData = all.filter(c => !c.Hidden);
        }
    } catch (e) {
        console.warn('Failed to fetch ONU configs from API', e);
    }
}

// First-time-use feedback gate: after a first-time user views a troubleshoot step
// detail or an ONU setup config, they must submit feedback once before continuing.
function getCurrentUserId() {
    const t = localStorage.getItem('fast_user_token') || localStorage.getItem('fast_admin_token');
    if (!t) return 'anonymous';
    try {
        const payload = JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
        return payload.id || 'anonymous';
    } catch (e) {
        return 'anonymous';
    }
}

function needsFirstFeedback() {
    return localStorage.getItem(`fast_first_feedback_done_${getCurrentUserId()}`) !== '1';
}

function markFirstFeedbackDone() {
    localStorage.setItem(`fast_first_feedback_done_${getCurrentUserId()}`, '1');
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
    await loadParametersFromAPI();
    await loadOnuConfigsFromAPI();

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
    // Builds the "ข้อมูลพารามิเตอร์อ้างอิง" table rows from parameterData (managed in
    // Admin > ข้อมูลพารามิเตอร์อ้างอิง). Level controls the standard-value badge/text color.
    function buildParameterRowsHtml() {
        if (!parameterData || parameterData.length === 0) {
            return `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 24px;">ยังไม่มีข้อมูลพารามิเตอร์อ้างอิงในระบบ</td></tr>`;
        }

        const levelColorVar = { danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)', none: 'var(--text-primary)' };
        const levelBadgeClass = { danger: 'badge danger', warning: 'badge warning', info: 'badge info', none: '' };

        return parameterData.map(p => {
            const level = p.Level || 'none';
            const textColor = levelColorVar[level] || levelColorVar.none;
            const badgeClass = levelBadgeClass[level] || '';
            const badgeStyle = level === 'none'
                ? 'font-weight: 600; font-size: 14px; background: var(--bg-main); padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid var(--border-light); color: var(--text-primary);'
                : 'font-weight: 600; width: fit-content; display: inline-block;';

            return `
                <tr>
                    <td data-label="ประเภทอุปกรณ์">${p.Type}</td>
                    <td data-label="พารามิเตอร์"><strong style="color: ${textColor};">${p.Parameter}</strong></td>
                    <td data-label="เกณฑ์มาตรฐาน"><span class="${badgeClass}" style="${badgeStyle}">${p.Standard}</span></td>
                    <td data-label="คำแนะนำของระบบ">${p.Recommendation || '-'}</td>
                </tr>
            `;
        }).join('');
    }

    // Shared feedback box used by both the troubleshoot step sheet and the ONU setup
    // detail view. When `required` is true (first-time user), it's marked mandatory
    // and window.__feedbackGateActive blocks navigation/closing until submitted.
    function buildFeedbackSectionHtml(inputId, btnId, recordId, contextLabel, required) {
        if (required) window.__feedbackGateActive = true;

        const labelHtml = required
            ? `<span style="color: #fbbf24; font-weight: 700;">* จำเป็นสำหรับการใช้งานครั้งแรก</span>`
            : `<span style="opacity: 0.7;">(ไม่บังคับ)</span>`;

        return `
            <div class="feedback-section">
                <div class="feedback-label"><i data-lucide="message-circle" style="width: 16px; height: 16px;"></i> คำแนะนำเพิ่มเติมจากผู้ใช้งาน ${labelHtml}</div>
                <textarea id="${inputId}" class="feedback-textarea" ${required ? 'required' : ''} placeholder="ระบุคำแนะนำ ข้อเสนอแนะ หรือรายละเอียดเพิ่มเติม เช่น ทำตามขั้นตอนแล้วอาการยังไม่ดีขึ้น พบว่าไฟกระพริบที่ช่อง WAN..."></textarea>
                <button id="${btnId}" class="feedback-submit-btn" onclick="window.submitStepFeedback('${inputId}', '${btnId}', '${(recordId || '').replace(/'/g, '')}', '${(contextLabel || '').replace(/'/g, '')}', ${required})">
                    <span>ส่งคำแนะนำ / บันทึกข้อมูล</span> <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
                </button>
            </div>
        `;
    }

    function showFeedbackGateNotice(inputId) {
        const ta = document.getElementById(inputId);
        if (!ta) return;
        ta.style.borderColor = '#ef4444';
        ta.focus();
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { ta.style.borderColor = 'rgba(255,255,255,0.08)'; }, 1500);
    }

    window.submitStepFeedback = (inputId, btnId, recordId, contextLabel, required) => {
        const textarea = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        const text = textarea.value.trim();

        if (required && !text) {
            showFeedbackGateNotice(inputId);
            return;
        }

        const log = JSON.parse(localStorage.getItem('fast_feedback_log') || '[]');
        log.push({ recordId, contextLabel, text, timestamp: Date.now() });
        localStorage.setItem('fast_feedback_log', JSON.stringify(log));

        textarea.value = '';
        btn.innerHTML = `<i data-lucide="check" style="width: 18px; height: 18px;"></i> <span>บันทึกข้อมูลแล้ว</span>`;
        btn.disabled = true;
        lucide.createIcons();

        if (required) {
            markFirstFeedbackDone();
            window.__feedbackGateActive = false;
            const closeBtn = document.getElementById('sheetCloseBtn');
            if (closeBtn) closeBtn.style.display = '';
            // Sheet flow: auto-close once the gate is satisfied. ONU flow: just leave the confirmation shown.
            if (document.getElementById('bottomSheet') && document.getElementById('bottomSheet').classList.contains('active')) {
                setTimeout(() => window.closeSheet(), 900);
            }
            return;
        }

        setTimeout(() => {
            btn.innerHTML = `<span>ส่งคำแนะนำ / บันทึกข้อมูล</span> <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>`;
            btn.disabled = false;
            lucide.createIcons();
        }, 2000);
    };

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
                                ${buildParameterRowsHtml()}
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
                        <!-- Populated by initOnuSetupFlow from admin-managed ONU configs -->
                    </div>
                </div>
                <div id="onu-config-result"></div>
            `,
            afterRender: () => window.initOnuSetupFlow()
        }
    };

    // ONU Setup Flow Logic — brands/modes are derived from onuConfigData (already
    // filtered to exclude admin-hidden records) instead of being hardcoded.
    window.initOnuSetupFlow = () => {
        const brandSelect = document.getElementById('brand-select');
        if (!brandSelect) return;

        const brands = [...new Set(onuConfigData.map(c => c.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));

        if (brands.length === 0) {
            brandSelect.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1;">ยังไม่มีข้อมูลการตั้งค่า ONU ในระบบ</p>`;
            return;
        }

        brandSelect.innerHTML = brands.map(brand => `
            <button class="option-btn brand-card" onclick="showOnuConfig('${brand.replace(/'/g, '')}')">
                <div class="brand-icon-wrapper"><i data-lucide="monitor"></i></div>
                <span>${brand}</span>
            </button>
        `).join('');
        lucide.createIcons();
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

    const STEP_EMOJI = ['🔍', '🔌', '📦', '🧵', '🛠️', '📶', '⚙️'];

    window.renderSymptomDetail = (indexStr, groupName) => {
        if (!indexStr) return;

        const items = fastData.filter(item => item.Group === groupName);
        const item = items[parseInt(indexStr)];
        if (!item) return;

        // Build the ordered step list: CheckPoint (what to check first) then each Steps line.
        const steps = [];
        if (item.CheckPoint) {
            steps.push({ title: 'จุดที่ต้องเช็คจุดแรก', desc: item.CheckPoint.replace(/"/g, '') });
        }
        if (item.Steps) {
            item.Steps.replace(/"/g, '').split(/\n/).filter(line => line.trim().length > 0).forEach(line => {
                steps.push({ title: line.trim().replace(/^[-•]\s*/, ''), desc: '' });
            });
        }

        const stepsHtml = steps.length > 0
            ? steps.map((step, i) => `
                <div class="step-card-dark">
                    <div class="step-badge-number">${i + 1}</div>
                    <div>
                        <div class="step-card-title">${STEP_EMOJI[i % STEP_EMOJI.length]} ${step.title}</div>
                        ${step.desc ? `<div class="step-card-desc">${step.desc}</div>` : ''}
                    </div>
                </div>
            `).join('')
            : `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 12px; color: #94a3b8; text-align: center;">
                    <i data-lucide="info" style="width: 24px; height: 24px; opacity: 0.6;"></i>
                    <span style="font-size: 13px;">ยังไม่มีขั้นตอนตรวจสอบสำหรับกรณีนี้ในระบบ</span>
                </div>
            `;

        window.__feedbackGateActive = false;
        const feedbackRequired = needsFirstFeedback();

        const html = `
            <div class="sheet-content active sheet-content-dark">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    ${item.ID ? `<span style="font-size: 11px; font-weight: 700; color: var(--nt-dark); background: var(--nt-yellow); padding: 2px 8px; border-radius: 6px;">${item.ID}</span>` : ''}
                    <span style="font-size: 12px; color: #94a3b8;">${groupName}</span>
                </div>
                <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 20px;">${item.Symptom || '-'}</h2>

                <div class="step-section-header">
                    <div class="step-section-title"><i data-lucide="wrench" style="width: 18px; height: 18px;"></i> ลำดับขั้นตอนการแก้ไขปัญหา</div>
                    ${steps.length > 0 ? `<span class="step-count-badge">${steps.length} ขั้นตอน</span>` : ''}
                </div>

                ${stepsHtml}

                ${buildFeedbackSectionHtml('feedback-text-input', 'feedback-submit-btn', item.ID, groupName, feedbackRequired)}
            </div>
        `;

        document.getElementById('sheet-content-container').innerHTML = html;
        const closeBtn = document.getElementById('sheetCloseBtn');
        if (closeBtn) closeBtn.style.display = feedbackRequired ? 'none' : '';
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
        if (window.__feedbackGateActive) {
            showFeedbackGateNotice('feedback-text-input');
            return;
        }
        const overlay = document.getElementById('sheetOverlay');
        const sheet = document.getElementById('bottomSheet');
        if (overlay && sheet) {
            overlay.classList.remove('active');
            sheet.classList.remove('active');
            document.body.style.overflow = '';
        }
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

        // Category label/icon derived from the group name (from backend Scom.Group) — keeps the
        // header truthful to the actual data instead of always saying "ROUTER STATUS".
        const nameLowerGroup = groupName.toLowerCase();
        let headerLabel = 'อาการที่พบ';
        let baseHeaderIcon = 'wrench';
        let baseHeaderColor = '#14b8a6';
        let isLedCategory = false;
        if (nameLowerGroup.includes('ไฟ') || nameLowerGroup.includes('pon') || nameLowerGroup.includes('dsl')) {
            headerLabel = 'ROUTER STATUS'; baseHeaderIcon = 'router'; baseHeaderColor = '#94a3b8'; isLedCategory = true;
        } else if (nameLowerGroup.includes('disconnect')) {
            headerLabel = 'CONNECTION'; baseHeaderIcon = 'network'; baseHeaderColor = '#ef4444';
        } else if (nameLowerGroup.includes('connect')) {
            headerLabel = 'INTERNET ACCESS'; baseHeaderIcon = 'wifi-off'; baseHeaderColor = '#f97316';
        } else if (nameLowerGroup.includes('speed')) {
            headerLabel = 'SPEED TEST'; baseHeaderIcon = 'gauge'; baseHeaderColor = '#8b5cf6';
        } else if (nameLowerGroup.includes('web')) {
            headerLabel = 'WEB ACCESS'; baseHeaderIcon = 'globe'; baseHeaderColor = '#3b82f6';
        } else if (nameLowerGroup.includes('mail')) {
            headerLabel = 'MAIL'; baseHeaderIcon = 'mail'; baseHeaderColor = '#0ea5e9';
        } else if (nameLowerGroup.includes('ip-phone') || nameLowerGroup.includes('โทร')) {
            headerLabel = 'IP-PHONE'; baseHeaderIcon = 'phone-call'; baseHeaderColor = '#22c55e';
        } else if (nameLowerGroup.includes('อื่น')) {
            headerLabel = 'OTHER CASE'; baseHeaderIcon = 'alert-circle'; baseHeaderColor = '#94a3b8';
        }

        items.forEach((item, index) => {
            const sym = item.Symptom || 'ไม่ระบุอาการ';
            const lowerSym = sym.toLowerCase();

            // Default Card styling (Dark Theme)
            let headerIcon = baseHeaderIcon;
            let headerColor = baseHeaderColor;
            let ledsHtml = '';
            let subtitle = item.Scoms || ''; // Use Scoms as subtitle if possible

            if (isLedCategory) {
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
                            <i data-lucide="${headerIcon}" style="width: 16px; height: 16px;"></i> ${headerLabel}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${item.ID ? `<span style="font-size: 11px; font-weight: 700; color: #64748b; background: rgba(148,163,184,0.1); padding: 2px 8px; border-radius: 6px;">${item.ID}</span>` : ''}
                            <i data-lucide="chevron-right" style="color: #475569; width: 20px; height: 20px;"></i>
                        </div>
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
            // First-time feedback gate: block leaving the current view until submitted.
            if (window.__feedbackGateActive) {
                showFeedbackGateNotice('onu-feedback-text-input');
                return;
            }

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

    window.showOnuConfigDetails = (brand, mode) => {
        const detailsDiv = document.getElementById('config-details-view');
        const config = onuConfigData.find(c => c.Brand === brand && c.Mode === mode);
        if (!config) return;

        window.__feedbackGateActive = false;
        const feedbackRequired = needsFirstFeedback();

        const imagesHtml = (config.Images && config.Images.length > 0)
            ? `
                <div class="onu-detail-images">
                    ${config.Images.map(img => `
                        <img src="/api/onu-configs/image?key=${encodeURIComponent(img.key)}" alt="${brand} ${mode}" onclick="window.openOnuImageLightbox(this.src)">
                    `).join('')}
                </div>
            `
            : '';

        const guide = ONU_INTERACTIVE_GUIDES[`${brand}/${mode}`];
        const guideHtml = guide ? `
            <div style="margin-bottom: 16px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <iframe src="${guide.url}" title="${guide.label}" style="width: 100%; height: clamp(480px, 85vh, 720px); border: none; display: block;" loading="lazy"></iframe>
            </div>
        ` : '';

        detailsDiv.innerHTML = `
            <div class="card" style="margin-top: 24px; animation: slideIn 0.3s ease; border-top: 4px solid var(--brand-primary);">
                <h4 class="mb-4 flex-between">
                    <span><i data-lucide="settings" style="margin-right: 8px; vertical-align: middle;"></i> ${brand} — ${mode}</span>
                    ${feedbackRequired ? '' : `<button class="icon-btn" onclick="document.getElementById('config-details-view').innerHTML=''"><i data-lucide="x"></i></button>`}
                </h4>
                ${guideHtml}
                <div style="background: var(--bg-main); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                    <p style="color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap;">${config.Details}</p>
                </div>
                ${imagesHtml}
                <div style="margin-top: 20px; background: #11142b; border-radius: 16px; padding: 20px;">
                    ${buildFeedbackSectionHtml('onu-feedback-text-input', 'onu-feedback-submit-btn', `${brand}/${mode}`, `ONU Setup: ${brand} ${mode}`, feedbackRequired)}
                </div>
            </div>
        `;
        lucide.createIcons();
        detailsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.openOnuImageLightbox = (src) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out;';
        overlay.onclick = () => overlay.remove();
        overlay.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">`;
        document.body.appendChild(overlay);
    };

    // Interactive step-by-step guides (self-contained HTML pages under /guides) keyed by
    // "Brand/Mode" so the guide shows inside that specific mode's detail view.
    const ONU_INTERACTIVE_GUIDES = {
        'Huawei/Router Mode (PPPoE)': { url: '/guides/huawei-hg8145v5.html?v=2', label: 'คู่มือ Interactive: Huawei HG8145V5' }
    };

    window.showOnuConfig = (brand) => {
        const resultDiv = document.getElementById('onu-config-result');
        const modes = onuConfigData.filter(c => c.Brand === brand);

        resultDiv.innerHTML = `
            <div class="card" style="animation: fadeIn 0.3s ease;">
                <h3 class="mb-4 flex-between">
                    <span>ตั้งค่า ${brand} ONU</span>
                    <span class="badge warning" style="font-size: 14px;">โหมดการใช้งาน</span>
                </h3>
                ${modes.length > 0 ? `
                    <p class="mb-4">เลือกโหมดที่ต้องการดูรายละเอียด:</p>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${modes.map(c => `<button class="btn-secondary" onclick="showOnuConfigDetails('${brand.replace(/'/g, '')}', '${c.Mode.replace(/'/g, '')}')">${c.Mode}</button>`).join('')}
                    </div>
                ` : `<p style="color: var(--text-secondary);">ยังไม่มีข้อมูลการตั้งค่าสำหรับยี่ห้อนี้</p>`}
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
