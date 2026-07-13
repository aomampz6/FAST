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

window.switchAdminTab = (tabId) => {
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.admin-tabs .tab-btn[onclick="switchAdminTab('${tabId}')"]`).classList.add('active');
    
    document.getElementById('tab-troubleshoot').classList.add('hidden');
    document.getElementById('tab-onu-setup').classList.add('hidden');
    
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
    
    currentScoms.forEach(scom => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${scom.ID}</td>
            <td>${scom.Group}</td>
            <td>${scom.Scoms}</td>
            <td>${scom.Symptom || '-'}</td>
            <td>
                <button class="action-btn edit" onclick="editScom('${scom._id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteScom('${scom._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
    
    currentOnuConfigs.forEach(config => {
        const tr = document.createElement('tr');
        const detailsSnippet = config.Details ? config.Details.substring(0, 80) + (config.Details.length > 80 ? '...' : '') : '-';
        tr.innerHTML = `
            <td>${config.Brand}</td>
            <td>${config.Mode}</td>
            <td style="white-space: pre-wrap; font-size: 13px;">${detailsSnippet}</td>
            <td>
                <button class="action-btn edit" onclick="editOnuConfig('${config._id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteOnuConfig('${config._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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

