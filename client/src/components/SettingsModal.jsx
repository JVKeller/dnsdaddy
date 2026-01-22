
import { useState } from 'react';

export default function SettingsModal({ onClose, onSave }) {
    const [technitiumToken, setTechnitiumToken] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {};
        if (technitiumToken) payload.technitiumToken = technitiumToken;
        if (geminiApiKey) payload.geminiApiKey = geminiApiKey;

        if (Object.keys(payload).length === 0) {
            onClose();
            return;
        }

        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update settings');
            }

            onSave(); // Close and refresh
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <h2>Settings</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Technitium API Token (DNS)</label>
                        <input
                            type="text"
                            value={technitiumToken}
                            onChange={e => setTechnitiumToken(e.target.value)}
                            placeholder="Keep empty to leave unchanged"
                        />
                    </div>

                    <div className="form-group">
                        <label>Google Gemini API Key (AI)</label>
                        <input
                            type="text"
                            value={geminiApiKey}
                            onChange={e => setGeminiApiKey(e.target.value)}
                            placeholder="Keep empty to leave unchanged"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Validating...' : 'Save & Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
