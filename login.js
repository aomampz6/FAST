let currentRole = 'user';

function switchTab(role) {
    currentRole = role;
    
    // Update tabs
    document.getElementById('tab-user').classList.remove('active');
    document.getElementById('tab-admin').classList.remove('active');
    document.getElementById(`tab-${role}`).classList.add('active');
    
    // Update button text and form fields
    const btn = document.getElementById('submit-btn');
    const pwdGroup = document.getElementById('password-group');
    const pwdInput = document.getElementById('password');
    const userLabel = document.getElementById('username-label');
    const userInput = document.getElementById('username');
    
    if (role === 'admin') {
        btn.innerText = 'Login as Admin';
        btn.style.background = '#EF4444';
        btn.style.color = '#FFFFFF';
        document.documentElement.style.setProperty('--nt-yellow', '#EF4444');
        
        pwdGroup.style.display = 'block';
        pwdInput.required = true;
        userLabel.innerText = 'ชื่อผู้ใช้งาน (Username)';
        userInput.placeholder = 'กรอกชื่อผู้ใช้งาน';
    } else {
        btn.innerText = 'Login as User';
        btn.style.background = '#FFC800';
        btn.style.color = '#1F2937';
        document.documentElement.style.setProperty('--nt-yellow', '#FFC800');
        
        pwdGroup.style.display = 'none';
        pwdInput.required = false;
        pwdInput.value = ''; // clear password when switching to user
        userLabel.innerText = 'รหัสพนักงาน (Employee ID)';
        userInput.placeholder = 'กรอกรหัสพนักงาน';
    }
    
    document.getElementById('error-msg').innerText = '';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    
    errorMsg.innerText = 'Logging in...';
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Store token
            if (currentRole === 'admin') {
                if (data.role !== 'admin') {
                    errorMsg.innerText = 'You do not have admin privileges.';
                    return;
                }
                localStorage.setItem('fast_admin_token', data.token);
                window.location.href = '/admin/';
            } else {
                localStorage.setItem('fast_user_token', data.token);
                window.location.href = '/app.html';
            }
        } else {
            errorMsg.innerText = data.message || 'Login failed';
        }
    } catch (err) {
        errorMsg.innerText = 'Connection error. Please try again.';
        console.error(err);
    }
});
