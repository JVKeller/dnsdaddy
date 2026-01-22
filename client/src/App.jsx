import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import SettingsModal from './components/SettingsModal'

function App() {
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState('dark');

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <div className="app-container">
            <header className="app-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>DNS Daddy</h1>
                        <p>Network Traffic Analysis & Security</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="settings-btn" onClick={toggleTheme}>
                            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                        </button>
                        <button className="settings-btn" onClick={() => setShowSettings(true)}>
                            ⚙️ Settings
                        </button>
                    </div>
                </div>
            </header>
            <main>
                <Dashboard />
            </main>

            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    onSave={() => {
                        setShowSettings(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    )
}

export default App
