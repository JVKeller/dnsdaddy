# DNS Daddy

DNS Daddy is a network traffic analysis and security dashboard. It integrates with Technitium DNS Server to fetch logs and uses Google's Gemini AI to analyze domain queries for application categorization and risk assessment.

## Features

- **Live Log Integration**: Fetches real-time logs from Technitium DNS.
- **AI-Powered Analysis**: Uses Gemini AI to categorize domains (Messaging, VoIP, Streaming, etc.) and assess risk.
- **Batch Processing**: Efficiently analyze multiple domains in batches to save tokens.
- **Modern UI**: Full-height, responsive dashboard with text selection and fast filtering.
- **SQLite Caching**: Stores analysis results locally to improve performance and reduce API costs.

## Prerequisites

- Node.js (v18+)
- A running [Technitium DNS Server](https://technitium.com/dns/)
- A Google Gemini API Key

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/dnsdaddy.git
   cd dnsdaddy
   ```

2. **Install Dependencies**:
   From the root directory:
   ```bash
   npm install
   npm run install:all
   ```

3. **Configure the Server**:
   Copy the example environment file and fill in your details:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your Technitium URL, Token, and Gemini API Key
   ```

## Running the Application

Start both the backend and frontend simultaneously from the root directory:

```bash
npm run dev
```

- **Frontend**: Available at `http://localhost:4001`
- **Backend**: Available at `http://localhost:4000`

## Project Structure

- `/client`: React + Vite frontend application.
- `/server`: Node.js Express backend and AI integration.
- `package.json`: Root scripts for managing both projects.

## License

ISC
