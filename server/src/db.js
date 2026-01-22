
import sqlite3 from 'sqlite3';

const sqlite = sqlite3.verbose();

// Initialize DB
let db;

export async function initDB() {
    if (db) return db;

    db = new sqlite.Database('./cache.db', (err) => {
        if (err) {
            console.error("Could not connect to database", err);
        } else {
            console.log("Connected to SQLite cache database");
        }
    });

    // Create table if not exists
    db.run(`CREATE TABLE IF NOT EXISTS domain_analysis (
    domain TEXT PRIMARY KEY,
    analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

    return db;
}

export function getCachedAnalysis(domain) {
    return new Promise((resolve, reject) => {
        db.get("SELECT analysis FROM domain_analysis WHERE domain = ?", [domain], (err, row) => {
            if (err) reject(err);
            else resolve(row ? JSON.parse(row.analysis) : null);
        });
    });
}

export function getBulkCachedAnalysis(domains) {
    return new Promise((resolve, reject) => {
        if (!domains || domains.length === 0) {
            return resolve({});
        }

        const placeholders = domains.map(() => '?').join(',');
        const sql = `SELECT domain, analysis FROM domain_analysis WHERE domain IN (${placeholders})`;

        db.all(sql, domains, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const map = {};
                rows.forEach(row => {
                    try {
                        map[row.domain] = JSON.parse(row.analysis);
                    } catch (e) {
                        // ignore parse error
                    }
                });
                resolve(map);
            }
        });
    });
}

export function cacheAnalysis(domain, analysis) {
    return new Promise((resolve, reject) => {
        const json = JSON.stringify(analysis);
        db.run("INSERT OR REPLACE INTO domain_analysis (domain, analysis) VALUES (?, ?)", [domain, json], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function bulkCacheAnalysis(analysisMap) {
    return new Promise((resolve, reject) => {
        const domains = Object.keys(analysisMap);
        if (domains.length === 0) return resolve();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT OR REPLACE INTO domain_analysis (domain, analysis) VALUES (?, ?)");
            domains.forEach(domain => {
                stmt.run(domain, JSON.stringify(analysisMap[domain]));
            });
            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}
