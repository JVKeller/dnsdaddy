
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, themeAlpine } from 'ag-grid-community';

// Register modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function Dashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [clientIp, setClientIp] = useState('');
    const [knownIps, setKnownIps] = useState([]);
    const [limit, setLimit] = useState(50);
    const [theme, setTheme] = useState('dark');
    const [filterCategory, setFilterCategory] = useState('all');

    const MESSAGING_KEYWORDS = [
        'whatsapp', 'facebook', 'fbcdn', 'instagram', 'telegra', 'discord', 'slack',
        'messenger', 'signal', 'skype', 'zoom', 'teams', 'webex'
    ];

    // Grid Column Definitions
    const colDefs = useMemo(() => [
        {
            field: 'timestamp',
            headerName: 'Time',
            width: 150,
            valueFormatter: (p) => new Date(p.value).toLocaleTimeString(),
            sortable: true,
            filter: true
        },
        { field: 'clientIp', headerName: 'Client IP', width: 140, sortable: true, filter: true },
        { field: 'domain', headerName: 'Domain', flex: 1, minWidth: 200, sortable: true, filter: true, resizable: true },
        {
            field: 'analysis',
            headerName: 'Analysis',
            flex: 2,
            minWidth: 300,
            autoHeight: true,
            wrapText: true,
            cellDataType: false, // Fix AG Grid warning #48
            cellRenderer: (params) => {
                const analysis = params.value;
                if (params.data.analyzing) return <span style={{ opacity: 0.7 }}>Analyzing...</span>;
                if (!analysis) return <span style={{ opacity: 0.5 }}>-</span>;

                return (
                    <div style={{ padding: '5px 0' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{analysis.app_name}</strong>
                        <div style={{ fontSize: '0.85em', opacity: 0.8, lineHeight: '1.2', whiteSpace: 'normal' }}>{analysis.summary}</div>
                    </div>
                );
            }
        },
        {
            field: 'analysis.risk',
            headerName: 'Risk',
            width: 90,
            cellRenderer: (params) => {
                if (!params.value) return null;
                const r = params.value.toLowerCase();
                let badgeClass = 'badge-risk-low';
                if (r === 'high' || r === 'critical') badgeClass = 'badge-risk-high';
                if (r === 'medium') badgeClass = 'badge-risk-medium';

                return <span className={`badge ${badgeClass} badge-sm`}>{params.value}</span>;
            }
        }
    ], []);

    // Filter Logic
    const filteredLogs = useMemo(() => {
        if (filterCategory === 'all') return logs;

        if (filterCategory === 'messaging') {
            return logs.filter(log => {
                const domain = log.domain.toLowerCase();
                const isAnalyzedMessaging = log.analysis &&
                    (log.analysis.category === 'Messaging' || log.analysis.app_name?.toLowerCase().includes('messaging'));

                const isKeywordMatch = MESSAGING_KEYWORDS.some(k => domain.includes(k));

                return isAnalyzedMessaging || isKeywordMatch;
            });
        }
        return logs;
    }, [logs, filterCategory]);

    // Merge logic
    const mergeLogs = (currentLogs, newLogs) => {
        const existingIds = new Set(currentLogs.map(l => l.id));
        const uniqueNewLogs = newLogs.filter(l => !existingIds.has(l.id));
        const taggedNewLogs = uniqueNewLogs.map(l => ({ ...l, isNew: true }));
        return [...taggedNewLogs, ...currentLogs];
    };

    const fetchLogs = async (isRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams();
            if (clientIp) query.set('clientIp', clientIp);
            query.set('limit', limit);

            const response = await fetch(`/api/logs?${query.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch logs');

            const data = await response.json();
            const freshLogs = data.logs || [];

            if (isRefresh) {
                setLogs(prev => {
                    const merged = mergeLogs(prev, freshLogs);
                    setTimeout(() => {
                        setLogs(current => current.map(l => l.isNew ? { ...l, isNew: false } : l));
                    }, 2000);
                    return merged;
                });
            } else {
                setLogs(freshLogs);
            }

            const ips = [...new Set(freshLogs.map(l => l.clientIp))];
            setKnownIps(prev => [...new Set([...prev, ...ips])]);

        } catch (err) {
            console.error(err);
            setError('Could not load logs.');
        } finally {
            setLoading(false);
        }
    };

    const bulkAnalyze = async () => {
        if (bulkAnalyzing) return;

        // Get up to 20 recent domains that need analysis
        const toAnalyze = logs
            .filter(l => !l.analysis && !l.analyzing)
            .slice(0, 20);

        if (toAnalyze.length === 0) return;

        const domains = [...new Set(toAnalyze.map(l => l.domain))];
        const ids = toAnalyze.map(l => l.id);

        setBulkAnalyzing(true);
        // Optimistic update
        setLogs(prev => prev.map(l => ids.includes(l.id) ? { ...l, analyzing: true } : l));

        try {
            const response = await fetch('/api/analyze-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domains })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error (${response.status}): ${text}`);
            }

            const data = await response.json();
            const analysisMap = data.analysis || {};

            setLogs(prev => prev.map(l => {
                if (ids.includes(l.id)) {
                    return { ...l, analyzing: false, analysis: analysisMap[l.domain] || null };
                }
                return l;
            }));
        } catch (err) {
            console.error(err);
            setLogs(prev => prev.map(l => ids.includes(l.id) ? { ...l, analyzing: false } : l));
        } finally {
            setBulkAnalyzing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const rowClassRules = useMemo(() => ({
        'row-new': (params) => params.data.isNew
    }), []);

    return (
        <div className="dashboard-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="controls">
                <div className="controls-left">
                    <div className="filter-group">
                        <input
                            list="known-ips"
                            placeholder="Filter by Client IP..."
                            value={clientIp}
                            onChange={(e) => setClientIp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(false)}
                        />
                        <datalist id="known-ips">
                            {knownIps.map(ip => <option key={ip} value={ip} />)}
                        </datalist>
                    </div>
                    <div className="filter-group">
                        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                            <option value={10}>10 records</option>
                            <option value={50}>50 records</option>
                            <option value={100}>100 records</option>
                            <option value={500}>500 records</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ minWidth: '160px' }}
                        >
                            <option value="all">All Traffic</option>
                            <option value="messaging">💬 Messaging Apps</option>
                        </select>
                    </div>

                    <button className="refresh-btn" onClick={() => fetchLogs(true)} disabled={loading}>
                        {loading ? 'Refreshing...' : '↻ Refresh'}
                    </button>

                    <button
                        className="analyze-btn"
                        onClick={bulkAnalyze}
                        disabled={bulkAnalyzing || logs.filter(l => !l.analysis).length === 0}
                        style={{ backgroundColor: 'var(--success-color)' }}
                    >
                        {bulkAnalyzing ? 'Analyzing...' : '✨ Analyze Recent'}
                    </button>

                    {loading && <span style={{ marginLeft: '10px', fontSize: '0.9em', opacity: 0.7 }}>Loading...</span>}
                </div>
                {error && <span style={{ color: 'var(--danger-color)' }}>{error}</span>}
            </div>

            <div style={{ flex: 1, width: '100%' }} className="ag-theme-alpine-dark">
                <AgGridReact
                    rowData={filteredLogs}
                    columnDefs={colDefs}
                    rowClassRules={rowClassRules}
                    getRowId={(params) => String(params.data.id)}
                    animateRows={true}
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                />
            </div>
        </div>
    );
}
