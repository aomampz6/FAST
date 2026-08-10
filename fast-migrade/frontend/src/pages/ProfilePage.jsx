import { useAuth } from '../shared/auth/AuthContext';

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

const ROLE_LABEL = {
    admin: 'ผู้ดูแลระบบ',
    user: 'ช่างเทคนิค',
};

export default function ProfilePage() {
    const { role, token } = useAuth();
    const claims = token ? decodeJwt(token) : null;

    return (
        <div className="page">
            <h2>ข้อมูลส่วนตัว</h2>
            <div className="profile-card">
                <p>
                    <strong>บทบาท:</strong> {ROLE_LABEL[role] || role}
                </p>
                {claims?.id && (
                    <p>
                        <strong>รหัสผู้ใช้งาน:</strong> {claims.id}
                    </p>
                )}
                {claims?.exp && (
                    <p>
                        <strong>เซสชันหมดอายุ:</strong> {new Date(claims.exp * 1000).toLocaleString('th-TH')}
                    </p>
                )}
            </div>
        </div>
    );
}
