import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(username, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message
                    || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้งาน/รหัสพนักงาน และรหัสผ่าน'
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page">
            <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-brand">
                    <img src="/nt-logo.webp" alt="NT" className="login-logo" />
                    <h1>FAST System</h1>
                    <p className="login-subtitle">Field Assistant System for Technician</p>
                </div>
                {error && <div className="error-banner">{error}</div>}
                <label>
                    ชื่อผู้ใช้งาน หรือ รหัสพนักงาน
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder="กรอกชื่อผู้ใช้งาน หรือ รหัสพนักงาน"
                        required
                    />
                    <span className="login-hint">
                        ใช้ได้ทั้งชื่อผู้ใช้งาน (เช่น somchai.p) และรหัสพนักงาน (เช่น 12345678)
                    </span>
                </label>
                <label>
                    รหัสผ่าน (Password)
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="กรอกรหัสผ่าน"
                        required
                    />
                </label>
                <button type="submit" disabled={submitting}>
                    {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
            </form>
        </div>
    );
}
