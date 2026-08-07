import { useParameters } from '../features/parameters/useParameters';

const LEVEL_LABEL = {
    danger: 'Danger',
    warning: 'Warning',
    info: 'Info',
    none: 'None',
};

export default function DashboardPage() {
    const { parameters, loading, error } = useParameters();

    return (
        <div className="page">
            <h2>Dashboard</h2>
            <p>Reference parameters and standards.</p>
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
                            <th>Type</th>
                            <th>Parameter</th>
                            <th>Standard</th>
                            <th>Recommendation</th>
                            <th>Level</th>
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
                                <td colSpan={5}>No parameters found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
