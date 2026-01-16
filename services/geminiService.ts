
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Strictly follow guidelines for API key initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeAppreciation = async (
  currentRate: number, 
  previousRate: number, 
  history: any[]
) => {
  const prompt = `
    Analyze the SGD to EUR exchange rate.
    Current Rate: 1 SGD = ${currentRate} EUR
    Previous Rate: 1 SGD = ${previousRate} EUR
    Recent Trend: ${JSON.stringify(history.slice(-5))}
    
    Is SGD appreciating significantly? If so, generate a professional email subject and body 
    to notify a user. If not, explain why. 
    Format your response as JSON.
  `;

  try {
    // Fix: Use responseSchema for robust JSON output as recommended in guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAppreciating: {
              type: Type.BOOLEAN,
              description: 'Whether the SGD is appreciating significantly.'
            },
            subject: {
              type: Type.STRING,
              description: 'Email subject line.'
            },
            body: {
              type: Type.STRING,
              description: 'Email body content.'
            },
            analysis: {
              type: Type.STRING,
              description: 'Analysis of the current trend.'
            }
          },
          required: ["isAppreciating", "subject", "body", "analysis"]
        }
      }
    });

    // Fix: response.text is a getter, use it directly
    const text = response.text;
    return JSON.parse(text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
