import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import AdminScomsTab from './AdminScomsTab';
import AdminParametersTab from './AdminParametersTab';
import AdminOnuConfigsTab from './AdminOnuConfigsTab';
import AdminAtaConfigsTab from './AdminAtaConfigsTab';
import AdminGuidesTab from './AdminGuidesTab';
import AdminPhonebookTab from './AdminPhonebookTab';
import AdminUsersTab from './AdminUsersTab';
import AdminFeedbackTab from './AdminFeedbackTab';
import './admin.css';

export default function AdminPage() {
    const location = useLocation();

    return (
        <div className="page admin-page">
            <header className="admin-page-hero">
                <span className="admin-page-eyebrow">ADMIN WORKSPACE</span>
                <h1>จัดการข้อมูลระบบ</h1>
                <p>จัดการข้อมูลคู่มือ อุปกรณ์ และผู้ใช้งานจากพื้นที่ทำงานเดียว</p>
            </header>
            <nav className="admin-tabs" aria-label="เมนูจัดการข้อมูลระบบ">
                <NavLink to="/admin/scoms" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ข้อมูลการแก้ไขปัญหา
                </NavLink>
                <NavLink to="/admin/parameters" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ข้อมูลพารามิเตอร์อ้างอิง
                </NavLink>
                <NavLink to="/admin/onu-configs" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ข้อมูลการตั้งค่า ONU
                </NavLink>
                <NavLink to="/admin/ata-configs" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ข้อมูลการตั้งค่า ATA
                </NavLink>
                <NavLink to="/admin/guides" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    คู่มือ Interactive
                </NavLink>
                <NavLink to="/admin/phonebook" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    ข้อมูลสมุดโทรศัพท์
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    จัดการผู้ใช้งาน
                </NavLink>
                <NavLink to="/admin/feedback" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                    คำแนะนำจากผู้ใช้งาน
                </NavLink>
            </nav>
            <div className="admin-tab-content" key={location.pathname}>
                <Routes>
                    <Route index element={<Navigate to="scoms" replace />} />
                    <Route path="scoms" element={<AdminScomsTab />} />
                    <Route path="parameters" element={<AdminParametersTab />} />
                    <Route path="onu-configs" element={<AdminOnuConfigsTab />} />
                    <Route path="ata-configs" element={<AdminAtaConfigsTab />} />
                    <Route path="guides" element={<AdminGuidesTab />} />
                    <Route path="phonebook" element={<AdminPhonebookTab />} />
                    <Route path="users" element={<AdminUsersTab />} />
                    <Route path="feedback" element={<AdminFeedbackTab />} />
                </Routes>
            </div>
        </div>
    );
}
