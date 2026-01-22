
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TechnitiumClient } from './src/technitium.js';
import { AIClient } from './src/ai.js';
import { initDB, getCachedAnalysis, cacheAnalysis, getBulkCachedAnalysis, bulkCacheAnalysis } from './src/db.js';
import { updateEnvVars } from './src/config.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize Database
initDB();

// Initialize Clients
const technitium = new TechnitiumClient(
    process.env.TECHNITIUM_API_URL,
    process.env.TECHNITIUM_TOKEN
);

// Initialize AI Client only if key is present
let aiClient = process.env.GEMINI_API_KEY
    ? new AIClient(process.env.GEMINI_API_KEY)
    : null;

// Middleware for logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Routes ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', port });
});

app.get('/api/logs', async (req, res) => {
    try {
        const queryParams = { ...req.query };

        if (queryParams.clientIp) {
            queryParams.clientIpAddress = queryParams.clientIp;
            delete queryParams.clientIp;
        }

        const data = await technitium.getLogs(queryParams);

        let logs = (data.response && data.response.entries) ? data.response.entries.map(l => ({
            id: l.rowNumber,
            timestamp: l.timestamp,
            domain: l.qname,
            clientIp: l.clientIpAddress,
            analysis: null
        })) : [];

        if (logs.length > 0) {
            const uniqueDomains = [...new Set(logs.map(l => l.domain))].filter(d => d);

            if (uniqueDomains.length > 0) {
                try {
                    const analysisMap = await getBulkCachedAnalysis(uniqueDomains);
                    logs = logs.map(log => ({
                        ...log,
                        analysis: analysisMap[log.domain] || null
                    }));
                } catch (err) {
                    console.error("Failed to hydrate cache:", err);
                }
            }
        }

        res.json({ logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs from Technitium' });
    }
});

app.post('/api/analyze-bulk', async (req, res) => {
    console.log('Bulk analysis request received for domains:', req.body.domains?.length);
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({ error: 'Domains array is required' });
    }

    if (!aiClient) {
        return res.status(503).json({ error: 'AI Analysis unavailable. Missing API Key.' });
    }

    try {
        const cacheMap = await getBulkCachedAnalysis(domains);
        const missingDomains = domains.filter(d => !cacheMap[d]);

        if (missingDomains.length === 0) {
            console.log('All domains found in cache.');
            return res.json({ analysis: cacheMap });
        }

        console.log(`Analyzing ${missingDomains.length} domains with AI...`);
        const newAnalysisMap = await aiClient.analyzeDomainsBulk(missingDomains);

        await bulkCacheAnalysis(newAnalysisMap);
        console.log('Bulk analysis complete and cached.');

        res.json({ analysis: { ...cacheMap, ...newAnalysisMap } });
    } catch (error) {
        console.error('Error in bulk analysis:', error);
        res.status(500).json({ error: 'Bulk AI Analysis failed' });
    }
});

app.post('/api/analyze', async (req, res) => {
    const { domain } = req.body;

    if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    try {
        const cached = await getCachedAnalysis(domain);
        if (cached) {
            return res.json({ analysis: cached });
        }
    } catch (err) {
        console.error("Cache read error:", err);
    }

    if (!aiClient) {
        return res.status(503).json({ error: 'AI Analysis unavailable.' });
    }

    try {
        const analysis = await aiClient.analyzeDomain(domain);
        cacheAnalysis(domain, analysis).catch(e => console.error("Cache write error:", e));
        res.json({ analysis });
    } catch (error) {
        console.error('Error analyzing domain:', error);
        res.status(500).json({ error: 'AI Analysis failed' });
    }
});

app.post('/api/config', async (req, res) => {
    const { technitiumToken, geminiApiKey } = req.body;
    const updates = {};

    if (technitiumToken) {
        const tempClient = new TechnitiumClient(process.env.TECHNITIUM_API_URL, technitiumToken);
        try {
            await tempClient.getLogs({ limit: 1 });
            updates['TECHNITIUM_TOKEN'] = technitiumToken;
        } catch (err) {
            return res.status(401).json({ error: 'Invalid Technitium Token' });
        }
    }

    if (geminiApiKey) {
        updates['GEMINI_API_KEY'] = geminiApiKey;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No settings provided' });
    }

    const saved = updateEnvVars(updates);

    if (saved) {
        if (updates['TECHNITIUM_TOKEN']) {
            process.env.TECHNITIUM_TOKEN = updates['TECHNITIUM_TOKEN'];
            technitium.token = updates['TECHNITIUM_TOKEN'];
        }
        if (updates['GEMINI_API_KEY']) {
            process.env.GEMINI_API_KEY = updates['GEMINI_API_KEY'];
            aiClient = new AIClient(process.env.GEMINI_API_KEY);
        }
        res.json({ success: true, message: 'Settings updated.' });
    } else {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

app.get('*', (req, res) => {
    res.send('DNS Daddy Server is Running! API available at /api/logs');
});

// Catch-all for unmatched routes to debug 404s
app.use((req, res) => {
    console.log(`[UNMATCHED ROUTE] ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
