export class TechnitiumClient {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.token = token;
    }

    async getLogs(params = {}) {
        const query = new URLSearchParams({
            token: this.token,
            name: 'Query Logs (Sqlite)',
            classPath: 'QueryLogsSqlite.App',
            pageNumber: params.page || 1,
            entriesPerPage: params.limit || 100,
            descendingOrder: 'true',
            ...params
        });

        const url = `${this.baseUrl}/api/logs/query?${query.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Technitium API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            if (data.status !== 'ok') {
                throw new Error(`Technitium API Error: ${data.errorMessage || data.status}`);
            }

            return data;
        } catch (error) {
            console.error("Failed to fetch logs from Technitium:", error);
            throw error;
        }
    }
}
