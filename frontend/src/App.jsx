import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import TroubleshootPage from './features/scoms/TroubleshootPage';
import SymptomGuidePage from './features/scoms/SymptomGuidePage';
import OnuSetupPage from './features/onu-configs/OnuSetupPage';
import PhonebookPage from './features/phonebook/PhonebookPage';
import AdminPage from './features/admin/AdminPage';
import './App.css';

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="troubleshoot" element={<TroubleshootPage />} />
                    <Route path="symptom-guide" element={<SymptomGuidePage />} />
                    <Route path="onu-setup" element={<OnuSetupPage deviceType="ONU" />} />
                    <Route path="ata-setup" element={<OnuSetupPage deviceType="ATA" />} />
                    <Route path="phonebook" element={<PhonebookPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminLayout>
                                <AdminPage />
                            </AdminLayout>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}
