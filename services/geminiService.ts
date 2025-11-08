// Fix: Populating this file with all necessary service functions to resolve import errors.
import { GoogleGenAI, Type, Blob, Modality, GenerateContentResponse } from "@google/genai";
import { FinalAdvice, MarketCrop, SoilData, WeatherDay, AgentType, Language, GroundingSource } from "../types";

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
        // First, remove markdown fences if they exist.
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Find the start of the JSON (first '{' or '[')
        const firstBracket = cleanText.indexOf('[');
        const firstBrace = cleanText.indexOf('{');
        
        let start = -1;

        if (firstBracket === -1 && firstBrace === -1) {
             throw new Error("Could not find a JSON object or array in the response.");
        }

        if (firstBracket === -1) {
            start = firstBrace;
        } else if (firstBrace === -1) {
            start = firstBracket;
        } else {
            start = Math.min(firstBracket, firstBrace);
        }
        
        // Find the end of the JSON (last '}' or ']')
        const lastBracket = cleanText.lastIndexOf(']');
        const lastBrace = cleanText.lastIndexOf('}');

        let end = Math.max(lastBracket, lastBrace);
        
        if (end === -1) {
            throw new Error("Could not find a valid JSON object or array in the response.");
        }
        
        const jsonString = cleanText.substring(start, end + 1);
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error("Failed to parse JSON:", text, e);
        throw new Error("Received invalid JSON from the model.");
    }
};

const extractSources = (response: GenerateContentResponse): GroundingSource[] => {
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!chunks) return [];
    
    return chunks.map(chunk => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Untitled Source'
    })).filter(source => source.uri);
};


// --- Data Fetching Functions ---

export async function getWeatherData(location: string, language: string): Promise<{ data: WeatherDay[], sources: GroundingSource[] }> {
    const prompt = `Get the 7-day weather forecast for ${location}. The value for the "day" key MUST be the name of the day of the week, translated into the ${language} language. For example, for Hindi 'सोमवार', for Kannada 'ಸೋಮವಾರ'. Return temperatures in celsius. Respond with only a valid JSON array of objects, where each object has the following keys: "day", "high_temp_celsius", "low_temp_celsius", "precipitation_probability", and "humidity".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            ...generationConfig, 
            tools: [{googleSearch: {}}],
        }
    });
    const data = safeJSONParse<WeatherDay[]>(response.text);
    const sources = extractSources(response);
    return { data, sources };
}

export async function getSoilData(location: string, language: string): Promise<{ data: SoilData, sources: GroundingSource[] }> {
    const prompt = `Find typical soil analysis data for farms in ${location}, including pH level, nitrogen (N), phosphorus (P), and potassium (K) levels in ppm, and average soil moisture percentage. Provide the analysis relevant for a farmer who speaks ${language}. Respond with only a valid JSON object with the following keys: "ph_level", "nitrogen_ppm", "phosphorus_ppm", "potassium_ppm", "soil_moisture_percent".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            ...generationConfig, 
            tools: [{googleSearch: {}}],
        }
    });
    const data = safeJSONParse<SoilData>(response.text);
    const sources = extractSources(response);
    return { data, sources };
}

export async function getMarketData(location: string, language: string): Promise<{ data: MarketCrop[], sources: GroundingSource[] }> {
    const prompt = `Find current market prices for 5 agricultural crops commonly grown in ${location}. The "crop_name" field in your response MUST be in ${language}. For example, for Hindi 'गेहूं', for Kannada 'ಗೋಧಿ'. Respond with only a valid JSON array of objects, where each object has the following keys: "crop_name" and "market_price_per_kg".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            ...generationConfig,
            tools: [{googleSearch: {}}], 
        }
    });
    const data = safeJSONParse<MarketCrop[]>(response.text);
    const sources = extractSources(response);
    return { data, sources };
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
                                name: { type: Type.STRING, description: `Name of the crop. The text MUST be in ${language}.` },
                                reasoning: { type: Type.STRING, description: `Detailed explanation for why this crop is recommended, considering weather, soil, and market data. The text MUST be in ${language}.` },
                                marketPotential: { type: Type.STRING, description: "Market potential, can be 'Excellent', 'Good', or 'Fair'." }
                            },
                             required: ["name", "reasoning", "marketPotential"]
                        }
                    },
                    sowingPlan: {
                        type: Type.OBJECT,
                        description: "A plan for when to sow the crops.",
                        properties: {
                            optimalWindow: { type: Type.STRING, description: `The best time frame to sow, e.g., 'Next 3-5 days'. The text MUST be in ${language}.` },
                            justification: { type: Type.STRING, description: `Why this is the best time, referencing the weather forecast. The text MUST be in ${language}.` }
                        },
                         required: ["optimalWindow", "justification"]
                    },
                    soilManagementTips: {
                        type: Type.ARRAY,
                        description: "A list of 1-3 actionable tips for soil improvement based on the analysis.",
                        items: { type: Type.STRING, description: `An actionable tip for the user. The text MUST be in ${language}.` }
                    },
                    summary: {
                        type: Type.STRING,
                        description: `A detailed, conversational summary of all key recommendations. It should include the top recommended crop and its reasoning, the optimal sowing window, and at least one key soil management tip. This summary will be read aloud by a voice assistant. The text MUST be in ${language}.`
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
            const weatherData = data as WeatherDay[];
            if (language === Language.EN) {
                summary = `Here is the weather forecast for the next seven days. `;
                weatherData.forEach(day => {
                    summary += `On ${day.day}, the high will be ${day.high_temp_celsius} degrees with a low of ${day.low_temp_celsius}, and a ${day.precipitation_probability} percent chance of rain. `;
                });
            } else if (language === Language.HI) {
                summary = `अगले सात दिनों का मौसम पूर्वानुमान यहाँ है। `;
                weatherData.forEach(day => {
                    summary += `${day.day} को, अधिकतम तापमान ${day.high_temp_celsius} डिग्री और न्यूनतम ${day.low_temp_celsius} डिग्री रहेगा, और बारिश की ${day.precipitation_probability} प्रतिशत संभावना है। `;
                });
            } else { // Kannada
                summary = `ಮುಂದಿನ ಏಳು ದಿನಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಇಲ್ಲಿದೆ। `;
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
                    summary += `${crop.crop_name} is trading at ${crop.market_price_per_kg}. `;
                });
            } else if (language === Language.HI) {
                summary = `शीर्ष फसलों के लिए बाजार विश्लेषण यहाँ है। `;
                marketData.forEach(crop => {
                    summary += `${crop.crop_name} का कारोबार ${crop.market_price_per_kg} पर हो रहा है। `;
                });
            } else { // Kannada
                summary = `ಪ್ರಮುಖ ಬೆಳೆಗಳ ಮಾರುಕಟ್ಟೆ ವಿಶ್ಲೇಷಣೆ ಇಲ್ಲಿದೆ। `;
                marketData.forEach(crop => {
                    summary += `${crop.crop_name} ವು ${crop.market_price_per_kg} ದರದಲ್ಲಿ ವಹಿವಾಟು ನಡೆಸುತ್ತಿದೆ। `;
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