
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

export function updateEnvVars(updates) {
    try {
        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf8');
        }

        const lines = content.split('\n');
        const keys = Object.keys(updates);
        const keysFound = new Set();

        const newLines = lines.map(line => {
            for (const key of keys) {
                if (line.startsWith(`${key}=`)) {
                    keysFound.add(key);
                    return `${key}=${updates[key]}`;
                }
            }
            return line;
        });

        for (const key of keys) {
            if (!keysFound.has(key)) {
                newLines.push(`${key}=${updates[key]}`);
            }
        }

        fs.writeFileSync(envPath, newLines.join('\n'));
        return true;
    } catch (err) {
        console.error("Failed to update .env file:", err);
        return false;
    }
}
