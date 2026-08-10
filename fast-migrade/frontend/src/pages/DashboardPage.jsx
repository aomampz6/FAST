import { useParameters } from '../features/parameters/useParameters';

const LEVEL_LABEL = {
    danger: 'อันตราย',
    warning: 'คำเตือน',
    info: 'ข้อมูล',
    none: 'ปกติ',
};

export default function DashboardPage() {
    const { parameters, loading, error } = useParameters();

    return (
        <div className="page">
            <h2>หน้าหลัก</h2>
            <p>ข้อมูลพารามิเตอร์อ้างอิงและเกณฑ์มาตรฐาน</p>
            {loading && (
                <div className="page-loading">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" />
                    <div className="skeleton-line w-60" />
                </div>
            )}
            {error && <div className="error-banner">{error}</div>}
            {!loading && !error && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ประเภทอุปกรณ์ (Type)</th>
                            <th>พารามิเตอร์ (Parameter)</th>
                            <th>เกณฑ์มาตรฐาน (Standard)</th>
                            <th>คำแนะนำของระบบ (Recommendation)</th>
                            <th>ระดับ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((p) => (
                            <tr key={p._id} className={`level-${p.Level || 'none'}`}>
                                <td>{p.Type}</td>
                                <td>{p.Parameter}</td>
                                <td>{p.Standard}</td>
                                <td>{p.Recommendation}</td>
                                <td>{LEVEL_LABEL[p.Level] || p.Level}</td>
                            </tr>
                        ))}
                        {parameters.length === 0 && (
                            <tr>
                                <td colSpan={5}>ยังไม่มีข้อมูลพารามิเตอร์อ้างอิงในระบบ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
