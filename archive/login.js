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
            // The server determines the role from the database; the client just
            // routes to the matching area based on the returned role.
            if (data.role === 'admin') {
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
