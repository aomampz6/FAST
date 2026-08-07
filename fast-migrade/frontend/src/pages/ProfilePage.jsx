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

export default function ProfilePage() {
    const { role, token } = useAuth();
    const claims = token ? decodeJwt(token) : null;

    return (
        <div className="page">
            <h2>Profile</h2>
            <div className="profile-card">
                <p>
                    <strong>Role:</strong> {role}
                </p>
                {claims?.id && (
                    <p>
                        <strong>User ID:</strong> {claims.id}
                    </p>
                )}
                {claims?.exp && (
                    <p>
                        <strong>Session expires:</strong> {new Date(claims.exp * 1000).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}
