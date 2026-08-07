const API_URL = '/api';

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fast_admin_token');
    if (token) {
        showAdminScreen();
        fetchScoms();
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

const ADMIN_TAB_IDS = ['troubleshoot', 'onu-setup', 'parameters', 'guides'];

window.switchAdminTab = (tabId) => {
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.admin-tabs .tab-btn[onclick="switchAdminTab('${tabId}')"]`).classList.add('active');

    ADMIN_TAB_IDS.forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
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

    // Group rows by Scom.Group, preserving first-seen order
    const groups = [];
    const groupMap = {};
    currentScoms.forEach(scom => {
        const key = scom.Group || 'ไม่ระบุกลุ่ม';
        if (!groupMap[key]) {
            groupMap[key] = [];
            groups.push(key);
        }
        groupMap[key].push(scom);
    });

    groups.forEach((groupName, gIndex) => {
        const items = groupMap[groupName];
        const groupId = `scom-group-${gIndex}`;

        const headerTr = document.createElement('tr');
        headerTr.className = 'group-header-row';
        headerTr.innerHTML = `
            <td colspan="4">
                <button class="group-toggle-btn" onclick="toggleTableGroup('${groupId}', this)">
                    <i data-lucide="chevron-down" class="group-toggle-icon"></i>
                    <span>${groupName}</span>
                    <span class="group-count-badge">${items.length}</span>
                </button>
            </td>
        `;
        tbody.appendChild(headerTr);

        items.forEach(scom => {
            const tr = document.createElement('tr');
            tr.className = 'group-item-row';
            tr.dataset.group = groupId;
            tr.innerHTML = `
                <td>${scom.ID}</td>
                <td>${scom.Scoms}</td>
                <td>${scom.Symptom || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick="editScom('${scom._id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteScom('${scom._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    if (window.lucide) lucide.createIcons();
}

// Shared collapse/expand toggle for grouped admin tables (Scoms by Group, ONU configs by Brand).
window.toggleTableGroup = (groupId, btn) => {
    const rows = document.querySelectorAll(`tr[data-group="${groupId}"]`);
    const collapsed = rows.length > 0 && rows[0].style.display === 'none';
    rows.forEach(row => { row.style.display = collapsed ? '' : 'none'; });
    const icon = btn.querySelector('.group-toggle-icon');
    if (icon) icon.setAttribute('data-lucide', collapsed ? 'chevron-down' : 'chevron-right');
    if (window.lucide) lucide.createIcons();
};

// Group/ID/Scoms dropdowns: populated from existing Scom values so admins pick
// consistent, already-used entries instead of retyping (avoids typo'd duplicates).
// ID and Scoms options are scoped to whichever Group is currently selected, since
// each ID/Scoms pair in the data belongs to exactly one Group.
function makeDropdownField(selectEl, customEl, newValue, newLabel) {
    return {
        populate(options, selectedValue) {
            selectEl.innerHTML = '';
            if (selectedValue && !options.includes(selectedValue)) options = [...options, selectedValue];

            options.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                selectEl.appendChild(opt);
            });

            const newOpt = document.createElement('option');
            newOpt.value = newValue;
            newOpt.textContent = newLabel;
            selectEl.appendChild(newOpt);

            selectEl.value = selectedValue && options.includes(selectedValue) ? selectedValue : newValue;
            this.toggleCustomInput();
        },
        toggleCustomInput() {
            const isNew = selectEl.value === newValue;
            customEl.style.display = isNew ? '' : 'none';
            customEl.required = isNew;
            if (!isNew) customEl.value = '';
        },
        getValue() {
            return selectEl.value === newValue ? customEl.value.trim() : selectEl.value;
        },
        isNew() {
            return selectEl.value === newValue;
        }
    };
}

const NEW_GROUP_VALUE = '__new_group__';
const NEW_ID_VALUE = '__new_id__';
const NEW_SCOMS_VALUE = '__new_scoms__';

const groupField = makeDropdownField(document.getElementById('f-group-select'), document.getElementById('f-group'), NEW_GROUP_VALUE, '+ เพิ่มกลุ่มใหม่...');
const idField = makeDropdownField(document.getElementById('f-id-select'), document.getElementById('f-id'), NEW_ID_VALUE, '+ เพิ่ม ID ใหม่...');
const scomsField = makeDropdownField(document.getElementById('f-scoms-select'), document.getElementById('f-scoms'), NEW_SCOMS_VALUE, '+ เพิ่มหัวข้อใหม่...');

function itemsInGroup(groupName) {
    return groupName ? currentScoms.filter(s => s.Group === groupName) : currentScoms;
}

// Refreshes the ID and Scoms dropdowns to only show values that belong to the given group.
function refreshIdAndScomsOptions(groupName, selectedId, selectedScoms) {
    const scoped = itemsInGroup(groupName);
    const ids = [...new Set(scoped.map(s => s.ID).filter(Boolean))].sort();
    const scomsList = [...new Set(scoped.map(s => s.Scoms).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
    idField.populate(ids, selectedId);
    scomsField.populate(scomsList, selectedScoms);
}

document.getElementById('f-group-select').addEventListener('change', () => {
    groupField.toggleCustomInput();
    // Group context changed — reset ID/Scoms so they don't leak values from another group.
    refreshIdAndScomsOptions(groupField.isNew() ? null : groupField.getValue(), null, null);
});

document.getElementById('f-id-select').addEventListener('change', () => {
    idField.toggleCustomInput();
    // ID and Scoms are paired 1:1 in the data — auto-fill Scoms from the chosen ID.
    if (!idField.isNew()) {
        const match = currentScoms.find(s => s.ID === idField.getValue() && (groupField.isNew() || s.Group === groupField.getValue()));
        if (match) scomsField.populate([...new Set(itemsInGroup(groupField.isNew() ? null : groupField.getValue()).map(s => s.Scoms).filter(Boolean))], match.Scoms);
    }
});

document.getElementById('f-scoms-select').addEventListener('change', () => scomsField.toggleCustomInput());

// Modal logic
const modal = document.getElementById('scom-modal');
document.getElementById('add-new-btn').addEventListener('click', () => {
    document.getElementById('scom-form').reset();
    document.getElementById('scom-id').value = '';
    groupField.populate([...new Set(currentScoms.map(s => s.Group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), null);
    refreshIdAndScomsOptions(null, null, null);
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
    groupField.populate([...new Set(currentScoms.map(s => s.Group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), scom.Group || '');
    refreshIdAndScomsOptions(scom.Group || null, scom.ID || '', scom.Scoms || '');
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
        ID: idField.getValue(),
        Group: groupField.getValue(),
        Scoms: scomsField.getValue(),
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

    // Group rows by Brand, preserving first-seen order
    const groups = [];
    const groupMap = {};
    currentOnuConfigs.forEach(config => {
        const key = config.Brand || 'ไม่ระบุยี่ห้อ';
        if (!groupMap[key]) {
            groupMap[key] = [];
            groups.push(key);
        }
        groupMap[key].push(config);
    });

    groups.forEach((brandName, gIndex) => {
        const items = groupMap[brandName];
        const groupId = `onu-group-${gIndex}`;

        const headerTr = document.createElement('tr');
        headerTr.className = 'group-header-row';
        headerTr.innerHTML = `
            <td colspan="3">
                <button class="group-toggle-btn" onclick="toggleTableGroup('${groupId}', this)">
                    <i data-lucide="chevron-down" class="group-toggle-icon"></i>
                    <span>${brandName}</span>
                    <span class="group-count-badge">${items.length}</span>
                </button>
            </td>
        `;
        tbody.appendChild(headerTr);

        items.forEach(config => {
            const tr = document.createElement('tr');
            tr.className = 'group-item-row' + (config.Hidden ? ' onu-row-hidden' : '');
            tr.dataset.group = groupId;
            const detailsSnippet = config.Details ? config.Details.substring(0, 80) + (config.Details.length > 80 ? '...' : '') : '-';
            tr.innerHTML = `
                <td>${config.Mode} ${config.Hidden ? '<span class="hidden-badge">ซ่อนอยู่</span>' : ''}</td>
                <td style="white-space: pre-wrap; font-size: 13px;">${detailsSnippet}</td>
                <td>
                    <button class="action-btn edit" onclick="editOnuConfig('${config._id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteOnuConfig('${config._id}')">Delete</button>
                    <button class="action-btn hide" onclick="toggleOnuVisibility('${config._id}')">${config.Hidden ? 'แสดง' : 'ซ่อน'}</button>
                    <button class="action-btn images" onclick="openOnuImagesModal('${config._id}')">รูปภาพ${config.Images && config.Images.length ? ` (${config.Images.length})` : ''}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    if (window.lucide) lucide.createIcons();
}

// Hide/show an ONU config from the user-facing app while keeping it manageable here.
window.toggleOnuVisibility = async (id) => {
    const config = currentOnuConfigs.find(c => c._id === id);
    if (!config) return;

    try {
        await fetch(`${API_URL}/onu-configs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}`
            },
            body: JSON.stringify({ Hidden: !config.Hidden })
        });
        fetchOnuConfigs();
    } catch (err) {
        alert('Error updating visibility');
    }
};

// ONU Config Images — unlimited images per Brand/Mode, stored in S3, shown on the
// user-facing ONU setup page.
let onuImagesCurrentConfigId = null;

const onuImagesModal = document.getElementById('onu-images-modal');

function renderOnuImagesGrid(config) {
    const grid = document.getElementById('onu-images-grid');
    if (!config.Images || config.Images.length === 0) {
        grid.innerHTML = `<p style="color: #6B7280; grid-column: 1 / -1;">ยังไม่มีรูปภาพ</p>`;
        return;
    }
    grid.innerHTML = config.Images.map(img => `
        <div class="onu-image-thumb">
            <img src="/api/onu-configs/image?key=${encodeURIComponent(img.key)}" alt="${img.originalName || ''}">
            <button type="button" class="onu-image-delete-btn" onclick="deleteOnuImage('${config._id}', '${img._id}')">&times;</button>
        </div>
    `).join('');
}

window.openOnuImagesModal = (configId) => {
    const config = currentOnuConfigs.find(c => c._id === configId);
    if (!config) return;

    onuImagesCurrentConfigId = configId;
    document.getElementById('onu-images-modal-title').innerText = `รูปภาพประกอบ — ${config.Brand} / ${config.Mode}`;
    document.getElementById('onu-images-input').value = '';
    renderOnuImagesGrid(config);
    onuImagesModal.classList.remove('hidden');
};

document.getElementById('onu-images-modal-close').addEventListener('click', () => {
    onuImagesModal.classList.add('hidden');
    onuImagesCurrentConfigId = null;
});

document.getElementById('onu-images-upload-btn').addEventListener('click', async () => {
    const input = document.getElementById('onu-images-input');
    if (!onuImagesCurrentConfigId || !input.files || input.files.length === 0) return;

    const formData = new FormData();
    Array.from(input.files).forEach(file => formData.append('images', file));

    const btn = document.getElementById('onu-images-upload-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Uploading...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/onu-configs/${onuImagesCurrentConfigId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` },
            body: formData
        });
        const updatedConfig = await res.json();

        const idx = currentOnuConfigs.findIndex(c => c._id === onuImagesCurrentConfigId);
        if (idx !== -1) currentOnuConfigs[idx] = updatedConfig;

        input.value = '';
        renderOnuImagesGrid(updatedConfig);
        renderOnuTable();
    } catch (err) {
        alert('Error uploading images');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

window.deleteOnuImage = async (configId, imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
        const res = await fetch(`${API_URL}/onu-configs/${configId}/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        const updatedConfig = await res.json();

        const idx = currentOnuConfigs.findIndex(c => c._id === configId);
        if (idx !== -1) currentOnuConfigs[idx] = updatedConfig;

        renderOnuImagesGrid(updatedConfig);
        renderOnuTable();
    } catch (err) {
        alert('Error deleting image');
    }
};

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fast_admin_token');
    if (token) {
        fetchOnuConfigs();
        fetchParameters();
        fetchGuides();
    }
});

// Reference Parameters Management
let currentParameters = [];
const LEVEL_LABELS = { danger: 'Danger', warning: 'Warning', info: 'Info', none: 'None' };

async function fetchParameters() {
    try {
        const res = await fetch(`${API_URL}/parameters`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        currentParameters = await res.json();
        renderParameterTable();
    } catch (err) {
        console.error('Error fetching parameters:', err);
    }
}

function renderParameterTable() {
    const tbody = document.getElementById('parameter-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    currentParameters.forEach(param => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${param.Type}</td>
            <td>${param.Parameter}</td>
            <td>${param.Standard}</td>
            <td>${param.Recommendation || '-'}</td>
            <td><span class="level-badge level-${param.Level || 'none'}">${LEVEL_LABELS[param.Level] || 'None'}</span></td>
            <td>
                <button class="action-btn edit" onclick="editParameter('${param._id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteParameter('${param._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

const parameterModal = document.getElementById('parameter-modal');
if (document.getElementById('add-new-parameter-btn')) {
    document.getElementById('add-new-parameter-btn').addEventListener('click', () => {
        document.getElementById('parameter-form').reset();
        document.getElementById('p-id').value = '';
        document.getElementById('parameter-modal-title').innerText = 'Add New Parameter';
        parameterModal.classList.remove('hidden');
    });
}

if (document.getElementById('parameter-modal-cancel')) {
    document.getElementById('parameter-modal-cancel').addEventListener('click', () => {
        parameterModal.classList.add('hidden');
    });
}

window.editParameter = (id) => {
    const param = currentParameters.find(p => p._id === id);
    if (!param) return;

    document.getElementById('p-id').value = param._id;
    document.getElementById('p-type').value = param.Type || '';
    document.getElementById('p-parameter').value = param.Parameter || '';
    document.getElementById('p-standard').value = param.Standard || '';
    document.getElementById('p-recommendation').value = param.Recommendation || '';
    document.getElementById('p-level').value = param.Level || 'none';

    document.getElementById('parameter-modal-title').innerText = 'Edit Parameter';
    parameterModal.classList.remove('hidden');
};

window.deleteParameter = async (id) => {
    if (!confirm('Are you sure you want to delete this parameter?')) return;

    try {
        await fetch(`${API_URL}/parameters/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        fetchParameters();
    } catch (err) {
        alert('Error deleting record');
    }
};

if (document.getElementById('parameter-form')) {
    document.getElementById('parameter-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('p-id').value;
        const data = {
            Type: document.getElementById('p-type').value,
            Parameter: document.getElementById('p-parameter').value,
            Standard: document.getElementById('p-standard').value,
            Recommendation: document.getElementById('p-recommendation').value,
            Level: document.getElementById('p-level').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/parameters/${id}` : `${API_URL}/parameters`;

        try {
            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}`
                },
                body: JSON.stringify(data)
            });
            parameterModal.classList.add('hidden');
            fetchParameters();
        } catch (err) {
            alert('Error saving record');
        }
    });
}

const onuModal = document.getElementById('onu-modal');

// Brand/Mode dropdowns: populated from existing OnuConfig values, same pattern as the
// Scom Group/ID/Scoms fields. Mode options are scoped to the currently selected Brand.
const NEW_BRAND_VALUE = '__new_brand__';
const NEW_MODE_VALUE = '__new_mode__';
const brandField = makeDropdownField(document.getElementById('o-brand-select'), document.getElementById('o-brand'), NEW_BRAND_VALUE, '+ เพิ่มยี่ห้อใหม่...');
const modeField = makeDropdownField(document.getElementById('o-mode-select'), document.getElementById('o-mode'), NEW_MODE_VALUE, '+ เพิ่มโหมดใหม่...');

function refreshModeOptions(brandName, selectedMode) {
    const scoped = brandName ? currentOnuConfigs.filter(c => c.Brand === brandName) : currentOnuConfigs;
    const modes = [...new Set(scoped.map(c => c.Mode).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
    modeField.populate(modes, selectedMode);
}

document.getElementById('o-brand-select').addEventListener('change', () => {
    brandField.toggleCustomInput();
    // Brand context changed — reset Mode so it doesn't leak values from another brand.
    refreshModeOptions(brandField.isNew() ? null : brandField.getValue(), null);
});

document.getElementById('o-mode-select').addEventListener('change', () => modeField.toggleCustomInput());

if (document.getElementById('add-new-onu-btn')) {
    document.getElementById('add-new-onu-btn').addEventListener('click', () => {
        document.getElementById('onu-form').reset();
        document.getElementById('onu-id').value = '';
        brandField.populate([...new Set(currentOnuConfigs.map(c => c.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), null);
        refreshModeOptions(null, null);
        document.getElementById('onu-modal-title').innerText = 'Add New ONU Config';
        onuModal.classList.remove('hidden');
    });
}

if (document.getElementById('onu-modal-cancel')) {
    document.getElementById('onu-modal-cancel').addEventListener('click', () => {
        onuModal.classList.add('hidden');
    });
}

window.editOnuConfig = (id) => {
    const config = currentOnuConfigs.find(c => c._id === id);
    if (!config) return;

    document.getElementById('onu-id').value = config._id;
    brandField.populate([...new Set(currentOnuConfigs.map(c => c.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), config.Brand || '');
    refreshModeOptions(config.Brand || null, config.Mode || '');
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
            Brand: brandField.getValue(),
            Mode: modeField.getValue(),
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

// Interactive Guide file management — lets admins edit the raw HTML of the
// self-contained guide pages under /guides (embedded via <iframe> in ONU setup).
let currentGuideFilename = null;

async function fetchGuides() {
    try {
        const res = await fetch(`${API_URL}/guides`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        const guides = await res.json();
        renderGuidesTable(guides);
    } catch (err) {
        console.error('Error fetching guides:', err);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderGuidesTable(guides) {
    const tbody = document.getElementById('guides-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!guides || guides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#6B7280;">ยังไม่มีไฟล์คู่มือ</td></tr>`;
        return;
    }

    guides.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.filename}</td>
            <td>${formatBytes(g.size)}</td>
            <td>${new Date(g.updatedAt).toLocaleString('th-TH')}</td>
            <td>
                <button class="action-btn edit" onclick="openGuideEditor('${g.filename}')">Edit</button>
                <a class="action-btn" style="color:#059669;" href="/guides/${g.filename}" target="_blank">Preview</a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

const guideEditorModal = document.getElementById('guide-editor-modal');

window.openGuideEditor = async (filename) => {
    try {
        const res = await fetch(`${API_URL}/guides/${encodeURIComponent(filename)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}` }
        });
        if (!res.ok) { alert('Error loading guide file'); return; }
        const data = await res.json();

        currentGuideFilename = filename;
        document.getElementById('guide-editor-title').innerText = `Edit ${filename}`;
        document.getElementById('guide-editor-textarea').value = data.content;
        guideEditorModal.classList.remove('hidden');
    } catch (err) {
        alert('Error loading guide file');
    }
};

document.getElementById('guide-editor-cancel').addEventListener('click', () => {
    guideEditorModal.classList.add('hidden');
    currentGuideFilename = null;
});

document.getElementById('guide-editor-save').addEventListener('click', async () => {
    if (!currentGuideFilename) return;
    const content = document.getElementById('guide-editor-textarea').value;

    const btn = document.getElementById('guide-editor-save');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/guides/${encodeURIComponent(currentGuideFilename)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': `Bearer ${localStorage.getItem('fast_admin_token')}`
            },
            body: content
        });
        if (!res.ok) throw new Error('Save failed');

        guideEditorModal.classList.add('hidden');
        currentGuideFilename = null;
        fetchGuides();
    } catch (err) {
        alert('Error saving guide file');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

