import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import AdminScomsTab from './AdminScomsTab';
import AdminParametersTab from './AdminParametersTab';
import AdminOnuConfigsTab from './AdminOnuConfigsTab';
import AdminGuidesTab from './AdminGuidesTab';
import AdminPhonebookTab from './AdminPhonebookTab';

export default function AdminPage() {
    return (
        <div className="page">
            <h2>Admin</h2>
            <nav className="admin-tabs">
                <NavLink to="/admin/scoms">Scoms</NavLink>
                <NavLink to="/admin/parameters">Parameters</NavLink>
                <NavLink to="/admin/onu-configs">ONU Configs</NavLink>
                <NavLink to="/admin/guides">Guides</NavLink>
                <NavLink to="/admin/phonebook">Phonebook</NavLink>
            </nav>
            <Routes>
                <Route index element={<Navigate to="scoms" replace />} />
                <Route path="scoms" element={<AdminScomsTab />} />
                <Route path="parameters" element={<AdminParametersTab />} />
                <Route path="onu-configs" element={<AdminOnuConfigsTab />} />
                <Route path="guides" element={<AdminGuidesTab />} />
                <Route path="phonebook" element={<AdminPhonebookTab />} />
            </Routes>
        </div>
    );
}
