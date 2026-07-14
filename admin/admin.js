const API_URL = '/api';

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fast_admin_token');
    if (token) {
        showAdminScreen();
        fetchScoms();
        fetchOnuConfigs(); // assuming this exists, wait I'll check
        fetchPhonebook();
    } else {
        window.location.href = '/';
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('fast_admin_token');
    window.location.href = '/';
});

function showAdminScreen() {
    document.getElementById('admin-screen').classList.remove('hidden');
}

window.switchAdminTab = (tabId) => {
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.admin-tabs .tab-btn[onclick="switchAdminTab('${tabId}')"]`).classList.add('active');
    
    document.querySelectorAll('.admin-content').forEach(content => content.classList.add('hidden'));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
};

// Data Management
let currentScoms = [];

async function fetchScoms() {
    try {
        const res = await fetch(`${API_URL}/scoms`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        currentScoms = await res.json();
        if (Array.isArray(currentScoms)) {
            renderTable();
        } else {
            console.error('Failed to load Scoms:', currentScoms);
        }
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

function renderTable() {
    const tbody = document.getElementById('scom-tbody');
    tbody.innerHTML = '';
    
    let i = 0;
    while (i < currentScoms.length) {
        let count = 1;
        while (i + count < currentScoms.length && 
               currentScoms[i].ID === currentScoms[i+count].ID && 
               currentScoms[i].Group === currentScoms[i+count].Group && 
               currentScoms[i].Scoms === currentScoms[i+count].Scoms) {
            count++;
        }
        
        for (let j = 0; j < count; j++) {
            const scom = currentScoms[i + j];
            const tr = document.createElement('tr');
            
            let html = '';
            if (j === 0) {
                html += `
                    <td rowspan="${count}" style="vertical-align: middle; background-color: var(--bg-main); border-bottom: 2px solid var(--border-color); font-weight: 500;">${scom.ID || ''}</td>
                    <td rowspan="${count}" style="vertical-align: middle; background-color: var(--bg-main); border-bottom: 2px solid var(--border-color);">${scom.Group || ''}</td>
                    <td rowspan="${count}" style="vertical-align: middle; background-color: var(--bg-main); border-bottom: 2px solid var(--border-color);">${scom.Scoms || ''}</td>
                `;
            }
            
            const borderStyle = (j === count - 1) ? 'border-bottom: 2px solid var(--border-color);' : 'border-bottom: 1px solid #eee;';
            
            html += `
                <td style="${borderStyle}">${scom.Symptom || '-'}</td>
                <td style="${borderStyle}">
                    <button class="action-btn edit" onclick="editScom('${scom._id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteScom('${scom._id}')">Delete</button>
                </td>
            `;
            tr.innerHTML = html;
            tbody.appendChild(tr);
        }
        i += count;
    }
}

// Modal logic
const modal = document.getElementById('scom-modal');
document.getElementById('add-new-btn').addEventListener('click', () => {
    document.getElementById('scom-form').reset();
    document.getElementById('scom-id').value = '';
    document.getElementById('modal-title').innerText = 'Add New Scom';
    modal.classList.remove('hidden');
});

document.getElementById('modal-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Edit
window.editScom = (id) => {
    const scom = currentScoms.find(s => s._id === id);
    if (!scom) return;
    
    document.getElementById('scom-id').value = scom._id;
    document.getElementById('f-id').value = scom.ID || '';
    document.getElementById('f-group').value = scom.Group || '';
    document.getElementById('f-scoms').value = scom.Scoms || '';
    document.getElementById('f-symptom').value = scom.Symptom || '';
    document.getElementById('f-checkpoint').value = scom.CheckPoint || '';
    document.getElementById('f-steps').value = scom.Steps || '';
    document.getElementById('f-normalvalue').value = scom.NormalValue || '';
    document.getElementById('f-equipment').value = scom.Equipment || '';
    
    document.getElementById('modal-title').innerText = 'Edit Scom';
    modal.classList.remove('hidden');
};

// Delete
window.deleteScom = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        await fetch(`${API_URL}/scoms/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        fetchScoms();
    } catch (err) {
        alert('Error deleting record');
    }
};

// Save
document.getElementById('scom-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('scom-id').value;
    const data = {
        ID: document.getElementById('f-id').value,
        Group: document.getElementById('f-group').value,
        Scoms: document.getElementById('f-scoms').value,
        Symptom: document.getElementById('f-symptom').value,
        CheckPoint: document.getElementById('f-checkpoint').value,
        Steps: document.getElementById('f-steps').value,
        NormalValue: document.getElementById('f-normalvalue').value,
        Equipment: document.getElementById('f-equipment').value
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/scoms/${id}` : `${API_URL}/scoms`;
    
    try {
        await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}`
            },
            body: JSON.stringify(data)
        });
        modal.classList.add('hidden');
        fetchScoms();
    } catch (err) {
        alert('Error saving record');
    }
});

// ONU Config Management
let currentOnuConfigs = [];

async function fetchOnuConfigs() {
    try {
        const res = await fetch(`${API_URL}/onu-configs`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        currentOnuConfigs = await res.json();
        renderOnuTable();
    } catch (err) {
        console.error('Error fetching ONU configs:', err);
    }
}

function renderOnuTable() {
    const tbody = document.getElementById('onu-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let i = 0;
    while (i < currentOnuConfigs.length) {
        let count = 1;
        while (i + count < currentOnuConfigs.length && 
               currentOnuConfigs[i].Brand === currentOnuConfigs[i+count].Brand) {
            count++;
        }
        
        for (let j = 0; j < count; j++) {
            const config = currentOnuConfigs[i + j];
            const tr = document.createElement('tr');
            
            // Strip HTML to prevent breaking the table if there is an <img> tag in details
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = config.Details || '';
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            const detailsSnippet = plainText.substring(0, 80) + (plainText.length > 80 ? '...' : '') || '-';
            
            let html = '';
            if (j === 0) {
                html += `
                    <td rowspan="${count}" style="vertical-align: top; background-color: var(--bg-main); border-bottom: 2px solid var(--border-color); font-weight: 500;">
                        ${config.Brand || ''}
                        <div style="margin-top: 12px;">
                            <button class="action-btn" style="color: var(--brand-primary); font-size: 12px; padding: 4px 8px; border: 1px dashed var(--brand-primary); border-radius: 4px;" onclick="addModeForBrand('${config.Brand}')">+ Add Mode</button>
                        </div>
                    </td>
                `;
            }
            
            const borderStyle = (j === count - 1) ? 'border-bottom: 2px solid var(--border-color);' : 'border-bottom: 1px solid #eee;';
            
            html += `
                <td style="${borderStyle}">${config.Mode || '-'}</td>
                <td style="white-space: pre-wrap; font-size: 13px; ${borderStyle}">${detailsSnippet}</td>
                <td style="${borderStyle}">
                    <button class="action-btn edit" onclick="editOnuConfig('${config._id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteOnuConfig('${config._id}')">Delete</button>
                </td>
            `;
            tr.innerHTML = html;
            tbody.appendChild(tr);
        }
        i += count;
    }
}

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fast_admin_token');
    if (token) {
        fetchOnuConfigs();
    }
});

const onuModal = document.getElementById('onu-modal');
if (document.getElementById('add-new-onu-btn')) {
    document.getElementById('add-new-onu-btn').addEventListener('click', () => {
        document.getElementById('onu-form').reset();
        document.getElementById('onu-id').value = '';
        document.getElementById('onu-modal-title').innerText = 'Add New ONU Config';
        onuModal.classList.remove('hidden');
    });
}

window.addModeForBrand = (brand) => {
    document.getElementById('onu-form').reset();
    document.getElementById('onu-id').value = '';
    document.getElementById('o-brand').value = brand;
    document.getElementById('onu-modal-title').innerText = 'Add New ONU Config (' + brand + ')';
    onuModal.classList.remove('hidden');
};

if (document.getElementById('onu-modal-cancel')) {
    document.getElementById('onu-modal-cancel').addEventListener('click', () => {
        onuModal.classList.add('hidden');
    });
}

window.editOnuConfig = (id) => {
    const config = currentOnuConfigs.find(c => c._id === id);
    if (!config) return;
    
    document.getElementById('onu-id').value = config._id;
    document.getElementById('o-brand').value = config.Brand || '';
    document.getElementById('o-mode').value = config.Mode || '';
    document.getElementById('o-details').value = config.Details || '';
    
    document.getElementById('onu-modal-title').innerText = 'Edit ONU Config';
    onuModal.classList.remove('hidden');
};

window.deleteOnuConfig = async (id) => {
    if (!confirm('Are you sure you want to delete this ONU config?')) return;
    
    try {
        await fetch(`${API_URL}/onu-configs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        fetchOnuConfigs();
    } catch (err) {
        alert('Error deleting record');
    }
};

if (document.getElementById('onu-form')) {
    document.getElementById('onu-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('onu-id').value;
        const data = {
            Brand: document.getElementById('o-brand').value,
            Mode: document.getElementById('o-mode').value,
            Details: document.getElementById('o-details').value
        };
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/onu-configs/${id}` : `${API_URL}/onu-configs`;
        
        try {
            await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}`
                },
                body: JSON.stringify(data)
            });
            onuModal.classList.add('hidden');
            fetchOnuConfigs();
        } catch (err) {
            alert('Error saving record');
        }
    });
}

// Helper to insert text at cursor position in textarea
function insertTextAtCursor(el, text) {
    const val = el.value;
    const endIndex = el.selectionEnd;
    el.value = val.slice(0, endIndex) + text + val.slice(endIndex);
    el.selectionStart = el.selectionEnd = endIndex + text.length;
    el.focus();
}

window.promptInsertImageUrl = () => {
    const url = prompt('กรุณาใส่ URL ของรูปภาพ:');
    if (url) {
        insertTextAtCursor(document.getElementById('o-details'), `\n<img src="${url}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" alt="Image">\n`);
    }
};

window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Resize image using canvas if it's too large to save space
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get base64 string (jpeg, 80% quality)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            insertTextAtCursor(document.getElementById('o-details'), `\n<img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" alt="Uploaded Image">\n`);
            
            // Reset input so the same file can be selected again
            event.target.value = '';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// --- Phonebook Management ---
window.fetchPhonebook = function() {
    let data = localStorage.getItem('fast_phonebook_data');
    if (!data) {
        const defaultPhonebookData = [
            { id: 'pb_g1', title: 'ส่วนงาน บลนน.', icon: 'building-2', color: 'var(--nt-yellow)', bgColor: 'rgba(255, 209, 0, 0.1)', contacts: [] }
        ];
        data = JSON.stringify(defaultPhonebookData);
        localStorage.setItem('fast_phonebook_data', data);
    }
    renderPhonebookTable(JSON.parse(data));
};

function renderPhonebookTable(data) {
    const tbody = document.getElementById('phonebook-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(group => {
        const groupRowSpan = Math.max(group.contacts.length, 1);
        
        if (group.contacts.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="background: var(--bg-main); font-weight: bold;">
                    ${group.title} <br>
                    <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="action-btn edit" onclick="pbEditGroup('${group.id}')">Edit Group</button>
                        <button class="action-btn delete" onclick="pbDeleteGroup('${group.id}')">Del Group</button>
                        <button class="action-btn" style="background:#4CAF50; color:white; border:none;" onclick="pbAddContact('${group.id}')">+ Contact</button>
                    </div>
                </td>
                <td colspan="4" style="text-align:center; color:var(--text-secondary);">No contacts</td>
            `;
            tbody.appendChild(tr);
        } else {
            group.contacts.forEach((contact, index) => {
                const tr = document.createElement('tr');
                let html = '';
                if (index === 0) {
                    html += `
                        <td rowspan="${groupRowSpan}" style="background: var(--bg-main); font-weight: bold; vertical-align: top;">
                            ${group.title} <br>
                            <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                                <button class="action-btn edit" onclick="pbEditGroup('${group.id}')">Edit Group</button>
                                <button class="action-btn delete" onclick="pbDeleteGroup('${group.id}')">Del Group</button>
                                <button class="action-btn" style="background:#4CAF50; color:white; border:none;" onclick="pbAddContact('${group.id}')">+ Contact</button>
                            </div>
                        </td>
                    `;
                }
                
                html += `
                    <td>${contact.title} ${contact.subtitle ? '<br><small style="color:var(--text-secondary)">'+contact.subtitle+'</small>' : ''}</td>
                    <td>${contact.phone}</td>
                    <td>${contact.extension || '-'}</td>
                    <td>
                        <button class="action-btn edit" onclick="pbEditContact('${group.id}', '${contact.id}')">Edit</button>
                        <button class="action-btn delete" onclick="pbDeleteContact('${group.id}', '${contact.id}')">Delete</button>
                    </td>
                `;
                tr.innerHTML = html;
                tbody.appendChild(tr);
            });
        }
    });
}

function savePhonebook(data) {
    localStorage.setItem('fast_phonebook_data', JSON.stringify(data));
    fetchPhonebook();
}

window.pbAddGroup = () => {
    const title = prompt('ชื่อกลุ่มส่วนงานใหม่:');
    if (!title) return;
    const data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    data.push({
        id: 'pb_g_' + Date.now(),
        title: title,
        icon: 'building-2',
        color: 'var(--text-primary)',
        bgColor: 'var(--border-color)',
        contacts: []
    });
    savePhonebook(data);
};

window.pbEditGroup = (groupId) => {
    const data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    const group = data.find(g => g.id === groupId);
    if (!group) return;
    const title = prompt('แก้ไขชื่อกลุ่มส่วนงาน:', group.title);
    if (title !== null && title.trim() !== '') {
        group.title = title;
        savePhonebook(data);
    }
};

window.pbDeleteGroup = (groupId) => {
    if (!confirm('คุณต้องการลบกลุ่มนี้พร้อมเบอร์โทรทั้งหมดในกลุ่มใช่หรือไม่?')) return;
    let data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    data = data.filter(g => g.id !== groupId);
    savePhonebook(data);
};

window.pbAddContact = (groupId) => {
    const title = prompt('ชื่องาน/รายละเอียด:');
    if (!title) return;
    const subtitle = prompt('รายละเอียดรอง (เว้นว่างได้):');
    const phone = prompt('เบอร์โทรศัพท์:');
    if (!phone) return;
    const extension = prompt('เบอร์ต่อ (เว้นว่างได้):');

    const data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    const group = data.find(g => g.id === groupId);
    if (group) {
        group.contacts.push({
            id: 'c_' + Date.now(),
            title: title,
            subtitle: subtitle || '',
            phone: phone,
            extension: extension || ''
        });
        savePhonebook(data);
    }
};

window.pbEditContact = (groupId, contactId) => {
    const data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    const group = data.find(g => g.id === groupId);
    if (!group) return;
    const contact = group.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const title = prompt('ชื่องาน/รายละเอียด:', contact.title);
    if (title === null) return;
    const subtitle = prompt('รายละเอียดรอง:', contact.subtitle);
    const phone = prompt('เบอร์โทรศัพท์:', contact.phone);
    if (phone === null) return;
    const extension = prompt('เบอร์ต่อ:', contact.extension);

    contact.title = title;
    contact.subtitle = subtitle || '';
    contact.phone = phone;
    contact.extension = extension || '';
    savePhonebook(data);
};

window.pbDeleteContact = (groupId, contactId) => {
    if (!confirm('คุณต้องการลบเบอร์โทรนี้ใช่หรือไม่?')) return;
    const data = JSON.parse(localStorage.getItem('fast_phonebook_data') || '[]');
    const group = data.find(g => g.id === groupId);
    if (group) {
        group.contacts = group.contacts.filter(c => c.id !== contactId);
        savePhonebook(data);
    }
};
