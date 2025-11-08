// Fix: Populating this file with all necessary service functions to resolve import errors.
import { GoogleGenAI, Type, Blob, Modality } from "@google/genai";
import { FinalAdvice, MarketCrop, SoilData, WeatherDay, AgentType, Language } from "../types";

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
        console.error("Failed to parse JSON:", text, e);
        throw new Error("Received invalid JSON from the model.");
    }
};

// --- Data Fetching Functions ---

export async function getWeatherData(location: string): Promise<WeatherDay[]> {
    const prompt = `Generate a 7-day weather forecast for ${location}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
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
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
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
        contents: prompt,
        config: { 
            ...generationConfig, 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        crop_name: { type: Type.STRING },
                        market_price_per_kg: { type: Type.STRING },
                        demand_trend: { type: Type.STRING, description: "Can be 'High', 'Medium', or 'Low'" }
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
    marketData: MarketCrop[],
    language: string
): Promise<FinalAdvice> {
    const systemInstruction = `You are an expert agronomist AI. Your task is to provide personalized farming advice based on the provided data. Respond in ${language}.`;
    const prompt = `
        Given the following data for a farm near ${location}:

        Weather Forecast:
        ${JSON.stringify(weatherData, null, 2)}

        Soil Analysis:
        ${JSON.stringify(soilData, null, 2)}

        Market Data:
        ${JSON.stringify(marketData, null, 2)}

        Provide a personalized farming recommendation. Your response MUST be a valid JSON object with the exact structure specified in the schema. Analyze all inputs to make the best, most coherent recommendation. The entire response, including all strings in the JSON, must be in ${language}.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
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
                        description: "A list of 1-3 actionable tips for soil improvement based on the analysis.",
                        items: { type: Type.STRING }
                    },
                    summary: {
                        type: Type.STRING,
                        description: "A detailed, conversational summary of all key recommendations. It should include the top recommended crop and its reasoning, the optimal sowing window, and at least one key soil management tip. This summary will be read aloud by a voice assistant."
                    }
                },
                required: ["recommendedCrops", "sowingPlan", "soilManagementTips", "summary"]
            }
        }
    });

    return safeJSONParse<FinalAdvice>(response.text);
}

// --- Audio Helper Functions for Live API & TTS ---

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Text-to-Speech Functions ---

export async function getTextToSpeechAudio(text: string, language: Language): Promise<string> {
    const voiceName = language === Language.EN ? 'Kore' : 'Puck';

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from TTS API.");
    }
    return base64Audio;
}

export function createSummaryForTTS(agentType: AgentType, data: any, language: Language): string {
    let summary: string;

    switch (agentType) {
        case AgentType.WEATHER:
            const weatherData = (data as WeatherDay[]).slice(0, 3);
            if (language === Language.EN) {
                summary = `Here is the weather forecast for the next three days. `;
                weatherData.forEach(day => {
                    summary += `On ${day.day}, the high will be ${day.high_temp_celsius} degrees with a low of ${day.low_temp_celsius}, and a ${day.precipitation_probability} percent chance of rain. `;
                });
            } else if (language === Language.HI) {
                summary = `अगले तीन दिनों का मौसम पूर्वानुमान यहाँ है। `;
                weatherData.forEach(day => {
                    summary += `${day.day} को, अधिकतम तापमान ${day.high_temp_celsius} डिग्री और न्यूनतम ${day.low_temp_celsius} डिग्री रहेगा, और बारिश की ${day.precipitation_probability} प्रतिशत संभावना है। `;
                });
            } else { // Kannada
                summary = `ಮುಂದಿನ ಮೂರು ದಿನಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಇಲ್ಲಿದೆ। `;
                weatherData.forEach(day => {
                    summary += `${day.day} ರಂದು, ಗರಿಷ್ಠ ತಾಪಮಾನ ${day.high_temp_celsius} ಡಿಗ್ರಿ ಮತ್ತು ಕನಿಷ್ಠ ${day.low_temp_celsius} ಡಿಗ್ರಿ ಇರುತ್ತದೆ, ಮತ್ತು ಮಳೆಯ ಸಂಭವನೀಯತೆ ${day.precipitation_probability} ಪ್ರತಿಶತ. `;
                });
            }
            break;
        case AgentType.SOIL:
            const soilData = data as SoilData;
            if (language === Language.EN) {
                summary = `Here is your soil analysis. The pH level is ${soilData.ph_level}. Nitrogen is at ${soilData.nitrogen_ppm} parts per million. Phosphorus is ${soilData.phosphorus_ppm} parts per million, and Potassium is ${soilData.potassium_ppm} parts per million. Soil moisture is currently at ${soilData.soil_moisture_percent} percent.`;
            } else if (language === Language.HI) {
                summary = `आपकी मिट्टी का विश्लेषण यहाँ है। पीएच स्तर ${soilData.ph_level} है। नाइट्रोजन ${soilData.nitrogen_ppm} पार्ट्स पर मिलियन है। फास्फोरस ${soilData.phosphorus_ppm} पार्ट्स पर मिलियन है, और पोटेशियम ${soilData.potassium_ppm} पार्ट्स पर मिलियन है। मिट्टी की नमी वर्तमान में ${soilData.soil_moisture_percent} प्रतिशत है।`;
            } else { // Kannada
                summary = `ನಿಮ್ಮ ಮಣ್ಣಿನ ವಿಶ್ಲೇಷಣೆ ಇಲ್ಲಿದೆ. ಪಿಹೆಚ್ ಮಟ್ಟ ${soilData.ph_level} ಆಗಿದೆ. ಸಾರಜನಕವು ಪ್ರತಿ ಮಿಲಿಯನ್‌ಗೆ ${soilData.nitrogen_ppm} ಭಾಗಗಳಲ್ಲಿದೆ. ರಂಜಕವು ಪ್ರತಿ ಮಿಲಿಯನ್‌ಗೆ ${soilData.phosphorus_ppm} ಭಾಗಗಳು, ಮತ್ತು ಪೊಟ್ಯಾಸಿಯಮ್ ಪ್ರತಿ ಮಿಲಿಯನ್‌ಗೆ ${soilData.potassium_ppm} ಭಾಗಗಳು. ಮಣ್ಣಿನ ತೇವಾಂಶವು ಪ್ರಸ್ತುತ ${soilData.soil_moisture_percent} ಪ್ರತಿಶತದಲ್ಲಿದೆ.`;
            }
            break;
        case AgentType.MARKET:
            const marketData = (data as MarketCrop[]).slice(0, 3);
            if (language === Language.EN) {
                summary = `Here is the market analysis for the top crops. `;
                marketData.forEach(crop => {
                    summary += `${crop.crop_name} is trading at ${crop.market_price_per_kg} with ${crop.demand_trend} demand. `;
                });
            } else if (language === Language.HI) {
                summary = `शीर्ष फसलों के लिए बाजार विश्लेषण यहाँ है। `;
                marketData.forEach(crop => {
                    summary += `${crop.crop_name} का कारोबार ${crop.market_price_per_kg} पर हो रहा है और इसकी मांग ${crop.demand_trend} है। `;
                });
            } else { // Kannada
                summary = `ಪ್ರಮುಖ ಬೆಳೆಗಳ ಮಾರುಕಟ್ಟೆ ವಿಶ್ಲೇಷಣೆ ಇಲ್ಲಿದೆ। `;
                marketData.forEach(crop => {
                    summary += `${crop.crop_name} ವು ${crop.market_price_per_kg} ದರದಲ್ಲಿ ವಹಿವಾಟು ನಡೆಸುತ್ತಿದೆ ಮತ್ತು ${crop.demand_trend} ಬೇಡಿಕೆಯಲ್ಲಿದೆ. `;
                });
            }
            break;
        default:
             if (language === Language.EN) {
                summary = "I'm sorry, I cannot provide a summary for this category.";
             } else if (language === Language.HI) {
                summary = "मुझे खेद है, मैं इस श्रेणी के लिए सारांश प्रदान नहीं कर सकता।";
             } else {
                summary = "ಕ್ಷಮಿಸಿ, ಈ ವರ್ಗಕ್ಕೆ ನಾನು ಸಾರಾಂಶವನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.";
             }
            break;
    }
    return summary;
}