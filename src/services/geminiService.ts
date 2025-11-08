import { GoogleGenAI, Type } from "@google/genai";
import { FinalAdvice, MarketCrop, SoilData, WeatherDay } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const generationConfig = {
    temperature: 0.2,
    topK: 1,
    topP: 1,
};

const safeJSONParse = <T,>(text: string): T => {
    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error("Received invalid JSON from the model.");
    }
};

export async function getWeatherData(location: string): Promise<WeatherDay[]> {
    const prompt = `Generate a 7-day weather forecast for ${location}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // Fix: Use a simple string for the 'contents' parameter for single-turn text prompts.
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
            // Fix: Added responseSchema to ensure valid JSON output from the model.
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING },
                        high_temp_celsius: { type: Type.NUMBER },
                        low_temp_celsius: { type: Type.NUMBER },
                        precipitation_probability: { type: Type.NUMBER },
                        humidity: { type: Type.NUMBER }
                    },
                    required: ["day", "high_temp_celsius", "low_temp_celsius", "precipitation_probability", "humidity"]
                }
            }
        }
    });
    return safeJSONParse<WeatherDay[]>(response.text);
}

export async function getSoilData(location: string): Promise<SoilData> {
    const prompt = `Generate a plausible soil analysis report for a farm in ${location}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // Fix: Use a simple string for the 'contents' parameter for single-turn text prompts.
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
            // Fix: Added responseSchema to ensure valid JSON output from the model.
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ph_level: { type: Type.NUMBER },
                    nitrogen_ppm: { type: Type.NUMBER },
                    phosphorus_ppm: { type: Type.NUMBER },
                    potassium_ppm: { type: Type.NUMBER },
                    soil_moisture_percent: { type: Type.NUMBER }
                },
                required: ["ph_level", "nitrogen_ppm", "phosphorus_ppm", "potassium_ppm", "soil_moisture_percent"]
            }
        }
    });
    return safeJSONParse<SoilData>(response.text);
}

export async function getMarketData(location: string): Promise<MarketCrop[]> {
    const prompt = `Generate a market analysis for 5 agricultural crops suitable for the climate of ${location}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // Fix: Use a simple string for the 'contents' parameter for single-turn text prompts.
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
            // Fix: Added responseSchema to ensure valid JSON output from the model.
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        crop_name: { type: Type.STRING },
                        market_price_per_kg: { type: Type.STRING },
                        demand_trend: { type: Type.STRING }
                    },
                    required: ["crop_name", "market_price_per_kg", "demand_trend"]
                }
            }
        }
    });
    return safeJSONParse<MarketCrop[]>(response.text);
}

export async function getFinalAdvice(
    location: string,
    weatherData: WeatherDay[],
    soilData: SoilData,
    marketData: MarketCrop[]
): Promise<FinalAdvice> {
    // Fix: Extracted the system instruction from the prompt to use the dedicated `systemInstruction` config property.
    const systemInstruction = "You are an expert agronomist AI. Your task is to provide personalized farming advice based on the provided data.";
    const prompt = `
        Given the following data for a farm near ${location}:

        Weather Forecast:
        ${JSON.stringify(weatherData, null, 2)}

        Soil Analysis:
        ${JSON.stringify(soilData, null, 2)}

        Market Data:
        ${JSON.stringify(marketData, null, 2)}

        Provide a personalized farming recommendation. Your response MUST be a valid JSON object with the exact structure specified in the schema. Analyze all inputs to make the best, most coherent recommendation.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Using a more powerful model for synthesis
        // Fix: Use a simple string for the 'contents' parameter for single-turn text prompts.
        contents: prompt,
        config: {
            ...generationConfig,
            systemInstruction,
            temperature: 0.5,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendedCrops: {
                        type: Type.ARRAY,
                        description: "A list of 2-3 crops recommended for planting.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Name of the crop." },
                                reasoning: { type: Type.STRING, description: "Detailed explanation for why this crop is recommended, considering weather, soil, and market data." },
                                marketPotential: { type: Type.STRING, description: "Market potential, can be 'Excellent', 'Good', or 'Fair'." }
                            },
                             required: ["name", "reasoning", "marketPotential"]
                        }
                    },
                    sowingPlan: {
                        type: Type.OBJECT,
                        description: "A plan for when to sow the crops.",
                        properties: {
                            optimalWindow: { type: Type.STRING, description: "The best time frame to sow, e.g., 'Next 3-5 days'." },
                            justification: { type: Type.STRING, description: "Why this is the best time, referencing the weather forecast." }
                        },
                         required: ["optimalWindow", "justification"]
                    },
                    soilManagementTips: {
                        type: Type.ARRAY,
                        description: "A list of 1-2 actionable tips for soil improvement based on the analysis.",
                        items: { type: Type.STRING }
                    }
                },
                required: ["recommendedCrops", "sowingPlan", "soilManagementTips"]
            }
        }
    });

    return safeJSONParse<FinalAdvice>(response.text);
}
