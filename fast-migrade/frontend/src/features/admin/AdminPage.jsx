import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import AdminScomsTab from './AdminScomsTab';
import AdminParametersTab from './AdminParametersTab';
import AdminOnuConfigsTab from './AdminOnuConfigsTab';
import AdminGuidesTab from './AdminGuidesTab';
import AdminPhonebookTab from './AdminPhonebookTab';
import AdminUsersTab from './AdminUsersTab';
import './admin.css';

export default function AdminPage() {
    const location = useLocation();

    return (
        <div className="page admin-page">
            <h2>Admin</h2>
            <nav className="admin-tabs">
                <NavLink to="/admin/scoms" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    Scoms
                </NavLink>
                <NavLink to="/admin/parameters" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    Parameters
                </NavLink>
                <NavLink to="/admin/onu-configs" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ONU Configs
                </NavLink>
                <NavLink to="/admin/guides" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    Guides
                </NavLink>
                <NavLink to="/admin/phonebook" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    Phonebook
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    Users
                </NavLink>
            </nav>
            <div className="admin-tab-content" key={location.pathname}>
                <Routes>
                    <Route index element={<Navigate to="scoms" replace />} />
                    <Route path="scoms" element={<AdminScomsTab />} />
                    <Route path="parameters" element={<AdminParametersTab />} />
                    <Route path="onu-configs" element={<AdminOnuConfigsTab />} />
                    <Route path="guides" element={<AdminGuidesTab />} />
                    <Route path="phonebook" element={<AdminPhonebookTab />} />
                    <Route path="users" element={<AdminUsersTab />} />
                </Routes>
            </div>
        </div>
    );
}
