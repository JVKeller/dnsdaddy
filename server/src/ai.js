
import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIClient {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async analyzeDomain(domain) {
        const prompt = `
      Analyze the domain "${domain}" and provide a brief summary of what application or service it belongs to.
      Specifically, identify if it is a Messaging App (like WhatsApp, Telegram), a VoIP App, Video Streaming, or potentially malicious/risky.
      
      Return the result as a JSON object with this structure:
      {
        "app_name": "Name of app",
        "category": "Messaging | VoIP | Streaming | Social | Other | Risky",
        "risk": "Low | Medium | High",
        "summary": "One sentence description."
      }
      Do not include markdown formatting in your response. Just the JSON.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Clean up potential markdown code blocks
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error) {
            console.error("AI Analysis failed:", error);
            return {
                app_name: "Unknown",
                category: "Unknown",
                risk: "Unknown",
                summary: "Analysis failed."
            };
        }
    }

    async analyzeDomainsBulk(domains) {
        if (!domains || domains.length === 0) return {};

        const prompt = `
      Analyze the following list of domains and provide a brief summary of what application or service each belongs to.
      Specifically, identify if it is a Messaging App (like WhatsApp, Telegram), a VoIP App, Video Streaming, Social Media, or potentially malicious/risky.

      List: ${domains.join(', ')}

      Return the result as a single JSON object where each key is the domain name from the list, and the value is an object with this structure:
      {
        "app_name": "Name of app",
        "category": "Messaging | VoIP | Streaming | Social | Other | Risky",
        "risk": "Low | Medium | High",
        "summary": "One sentence description."
      }
      Do not include markdown formatting in your response. Just the JSON. If you cannot identify a domain, still include it with "app_name": "Unknown" and "risk": "Low".
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error) {
            console.error("Bulk AI Analysis failed:", error);
            const fallback = {};
            domains.forEach(d => {
                fallback[d] = {
                    app_name: "Unknown",
                    category: "Unknown",
                    risk: "Unknown",
                    summary: "Bulk analysis failed."
                };
            });
            return fallback;
        }
    }
}
