import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgentStatus, type AgentStatuses, type FinalAdvice, type MarketCrop, type SoilData, type WeatherDay, Language, ConversationMessage, AgentType, PlaybackStatuses, type ExtremeWeatherAlert, type GroundingSource } from './types';
import { getFinalAdvice, getMarketData, getSoilData, getWeatherData, decode, decodeAudioData, encode, createBlob, getTextToSpeechAudio, createSummaryForTTS } from './services/geminiService';
import { LocationInput } from './components/LocationInput';
import { AgentCard } from './components/AgentCard';
import { AdviceCard } from './components/AdviceCard';
import { BrainIcon, CloudIcon, DollarSignIcon, LeafIcon, ThermometerIcon, AlertTriangleIcon, TestTubeIcon, DropletIcon, TagIcon, GlobeIcon } from './components/Icons';
import { GoogleGenAI, FunctionDeclaration, Type, Modality } from '@google/genai';
import { VoiceAssistant } from './components/VoiceAssistant';
import { SubAgentCard } from './components/SubAgentCard';


const getFarmingAdviceFunctionDeclaration: FunctionDeclaration = {
  name: 'getFarmingAdvice',
  parameters: {
    type: Type.OBJECT,
    description: 'Gets comprehensive farming advice for a specific location, including weather, soil, market data, and crop recommendations.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'The city, region, or general area for which to get farming advice. For example, "Napa Valley, California" or "Indore, Madhya Pradesh".',
      },
    },
    required: ['location'],
  },
};

const initialAgentStatuses: AgentStatuses = {
  weather: {
    main: AgentStatus.IDLE,
    subAgents: { forecast: AgentStatus.IDLE, alerts: AgentStatus.IDLE },
  },
  soil: {
    main: AgentStatus.IDLE,
    subAgents: { nutrients: AgentStatus.IDLE, ph_moisture: AgentStatus.IDLE, type: AgentStatus.IDLE },
  },
  market: {
    main: AgentStatus.IDLE,
    subAgents: { prices: AgentStatus.IDLE, export: AgentStatus.IDLE },
  },
  planner: AgentStatus.IDLE,
};

const initialPlaybackStatuses: PlaybackStatuses = {
  [AgentType.WEATHER]: 'idle',
  [AgentType.SOIL]: 'idle',
  [AgentType.MARKET]: 'idle',
  [AgentType.PLANNER]: 'idle',
};

const uiStrings = {
    [Language.EN]: {
        title: 'Kisaan Mitra',
        subtitle: 'AI agents collaborate to provide personalized, real-time farming advice. Enter your location to begin.',
        locationPlaceholder: 'e.g., Napa Valley, California',
        getAdviceButton: 'Get Farming Advice',
        generatingButton: 'Generating...',
        cancelButton: 'Cancel',
        weatherAgent: 'Weather Agent',
        forecast: '7-Day Forecast',
        alerts: 'Extreme Weather Alert',
        soilAgent: 'Soil Agent',
        nutrients: 'Nutrient Analysis (ppm)',
        phLevel: 'pH Level',
        soilType: 'Soil Type',
        marketAgent: 'Market Agent',
        priceTracker: 'Local Price Tracker',
        exportMarkets: 'Export Markets',
        plannerAgent: 'Master Planner Agent',
        voiceAssistant: 'Voice Assistant',
        voiceAssistantPrompt: 'Press the mic to start',
        voiceAssistantListening: 'Listening...',
        soilTypeIdentified: 'Identified: Loamy Sand',
        exportPotential: 'High potential for Wheat',
        recommendedCrops: '🌾 Recommended Crops',
        sowingPlan: '🗓️ Sowing Plan',
        soilManagementTips: '🌱 Soil Management Tips',
        heatwaveWarning: 'Heatwave warning for {day} ({temp}°C).',
        heavyRainWarning: 'Heavy rain on {day} ({precip}%).',
        noAlerts: 'No extreme weather alerts.',
    },
    [Language.HI]: {
        title: 'किसान मित्र',
        subtitle: 'एआई एजेंट व्यक्तिगत, वास्तविक समय पर खेती की सलाह प्रदान करने के लिए सहयोग करते हैं। शुरू करने के लिए अपना स्थान दर्ज करें।',
        locationPlaceholder: 'उदा., इंदौर, मध्य प्रदेश',
        getAdviceButton: 'खेती की सलाह लें',
        generatingButton: 'उत्पन्न हो रहा है...',
        cancelButton: 'रद्द करें',
        weatherAgent: 'मौसम एजेंट',
        forecast: '7-दिन का पूर्वानुमान',
        alerts: 'चरम मौसम चेतावनी',
        soilAgent: 'मृदा एजेंट',
        nutrients: 'पोषक तत्व विश्लेषण (पीपीएम)',
        phLevel: 'पीएच स्तर',
        soilType: 'मिट्टी का प्रकार',
        marketAgent: 'बाजार एजेंट',
        priceTracker: 'स्थानीय मूल्य ट्रैकर',
        exportMarkets: 'निर्यात बाजार',
        plannerAgent: 'मास्टर प्लानर एजेंट',
        voiceAssistant: 'आवाज सहायक',
        voiceAssistantPrompt: 'शुरू करने के लिए माइक दबाएं',
        voiceAssistantListening: 'सुन रहा है...',
        soilTypeIdentified: 'पहचाना गया: दोमट रेत',
        exportPotential: 'गेहूं के लिए उच्च क्षमता',
        recommendedCrops: '🌾 अनुशंसित फसलें',
        sowingPlan: '🗓️ बुवाई योजना',
        soilManagementTips: '🌱 मृदा प्रबंधन युक्तियाँ',
        heatwaveWarning: '{day} के लिए लू की चेतावनी ({temp}°C)।',
        heavyRainWarning: '{day} को भारी बारिश ({precip}%)।',
        noAlerts: 'कोई चरम मौसम चेतावनी नहीं।',
    },
    [Language.KA]: {
        title: 'ಕಿಸಾನ್ ಮಿತ್ರ',
        subtitle: 'ಎಐ ಏಜೆಂಟ್‌ಗಳು ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ, ನೈಜ-ಸಮಯದ ಕೃಷಿ ಸಲಹೆಯನ್ನು ನೀಡಲು ಸಹಕರಿಸುತ್ತವೆ. ಪ್ರಾರಂಭಿಸಲು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ.',
        locationPlaceholder: 'ಉದಾ., ನಾಪಾ ವ್ಯಾಲಿ, ಕ್ಯಾಲಿಫೋರ್ನಿಯಾ',
        getAdviceButton: 'ಕೃಷಿ ಸಲಹೆ ಪಡೆಯಿರಿ',
        generatingButton: 'ರಚಿಸಲಾಗುತ್ತಿದೆ...',
        cancelButton: 'ರದ್ದುಮಾಡಿ',
        weatherAgent: 'ಹವಾಮಾನ ಏಜೆಂಟ್',
        forecast: '7-ದಿನದ ಮುನ್ಸೂಚನೆ',
        alerts: 'ತೀವ್ರ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ',
        soilAgent: 'ಮಣ್ಣು ಏಜೆಂಟ್',
        nutrients: 'ಪೋಷಕಾಂಶ ವಿಶ್ಲೇಷಣೆ (ಪಿಪಿಎಂ)',
        phLevel: 'ಪಿಎಚ್ ಮಟ್ಟ',
        soilType: 'ಮಣ್ಣಿನ ಪ್ರಕಾರ',
        marketAgent: 'ಮಾರುಕಟ್ಟೆ ಏಜೆಂಟ್',
        priceTracker: 'ಸ್ಥಳೀಯ ಬೆಲೆ ಟ್ರ್ಯಾಕರ್',
        exportMarkets: 'ರಫ್ತು ಮಾರುಕಟ್ಟೆಗಳು',
        plannerAgent: 'ಮಾಸ್ಟರ್ ಪ್ಲಾನರ್ ಏಜೆಂಟ್',
        voiceAssistant: 'ಧ್ವನಿ ಸಹಾಯಕ',
        voiceAssistantPrompt: 'ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ ಒತ್ತಿರಿ',
        voiceAssistantListening: 'ಕೇಳುತ್ತಿದೆ...',
        soilTypeIdentified: 'ಗುರುತಿಸಲಾಗಿದೆ: ಲೋಮಿ ಸ್ಯಾಂಡ್',
        exportPotential: 'ಗೋಧಿಗೆ ಹೆಚ್ಚಿನ ಸಾಮರ್ಥ್ಯ',
        recommendedCrops: '🌾 ಶಿಫಾರಸು ಮಾಡಲಾದ ಬೆಳೆಗಳು',
        sowingPlan: '🗓️ ಬಿತ್ತನೆ ಯೋಜನೆ',
        soilManagementTips: '🌱 ಮಣ್ಣು ನಿರ್ವಹಣೆ ಸಲಹೆಗಳು',
        heatwaveWarning: '{day} ರಂದು ತೀವ್ರ ಬಿಸಿಗಾಳಿ ಎಚ್ಚರಿಕೆ ({temp}°C).',
        heavyRainWarning: '{day} ರಂದು ಭಾರೀ ಮಳೆ ({precip}%)।',
        noAlerts: 'ಯಾವುದೇ ತೀವ್ರ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.',
    }
};


type WeatherInfo = { days: WeatherDay[], sources: GroundingSource[] };
type SoilInfo = { data: SoilData, sources: GroundingSource[] };
type MarketInfo = { crops: MarketCrop[], sources: GroundingSource[] };

const App: React.FC = () => {
  const [location, setLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [soilInfo, setSoilInfo] = useState<SoilInfo | null>(null);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [finalAdvice, setFinalAdvice] = useState<FinalAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sub-agent derived data
  const [extremeWeatherAlert, setExtremeWeatherAlert] = useState<ExtremeWeatherAlert | null>(null);

  // Voice Assistant State
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.EN);
  const [isRecording, setIsRecording] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const activePlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>(initialAgentStatuses);
  const [playbackStatuses, setPlaybackStatuses] = useState<PlaybackStatuses>(initialPlaybackStatuses);

  const resetState = useCallback(() => {
    setWeatherInfo(null);
    setSoilInfo(null);
    setMarketInfo(null);
    setFinalAdvice(null);
    setError(null);
    setAgentStatuses(initialAgentStatuses);
    setPlaybackStatuses(initialPlaybackStatuses);
    setExtremeWeatherAlert(null);
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    resetState();
  }, [resetState]);
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkExtremeWeather = useCallback((data: WeatherDay[]): ExtremeWeatherAlert => {
    const currentAlertStrings = uiStrings[selectedLanguage];
    const severeDay = data.find(d => d.high_temp_celsius > 38 || d.precipitation_probability > 80);
    if (severeDay) {
        if (severeDay.high_temp_celsius > 38) {
             const message = currentAlertStrings.heatwaveWarning
                .replace('{day}', severeDay.day)
                .replace('{temp}', String(severeDay.high_temp_celsius));
            return { type: 'Heatwave', message };
        }
        if (severeDay.precipitation_probability > 80) {
            const message = currentAlertStrings.heavyRainWarning
                .replace('{day}', severeDay.day)
                .replace('{precip}', String(severeDay.precipitation_probability));
            return { type: 'Heavy Rain', message };
        }
    }
    return { type: 'None', message: currentAlertStrings.noAlerts };
  }, [selectedLanguage]);

  const handleGetAdvice = useCallback(async (newLocation: string) => {
    if (!newLocation) return;

    abortControllerRef.current?.abort(); // Cancel any previous request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLocation(newLocation);
    setIsLoading(true);
    resetState();

    setAgentStatuses(prev => ({ 
        ...prev, 
        weather: { ...prev.weather, main: AgentStatus.WORKING },
        soil: { ...prev.soil, main: AgentStatus.WORKING },
        market: { ...prev.market, main: AgentStatus.WORKING }
    }));
    
    const language = selectedLanguage === Language.EN ? 'English' : selectedLanguage === Language.HI ? 'Hindi' : 'Kannada';

    // Staggered sub-agent execution for better visualization
    const weatherPromise = (async () => {
        await sleep(0);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, weather: { ...prev.weather, subAgents: { ...prev.weather.subAgents, forecast: AgentStatus.WORKING } } }));
        const result = await getWeatherData(newLocation, language);
        if (controller.signal.aborted) return null;
        setWeatherInfo({ days: result.data, sources: result.sources });
        setAgentStatuses(prev => ({ ...prev, weather: { ...prev.weather, subAgents: { ...prev.weather.subAgents, forecast: AgentStatus.DONE } } }));
        
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, weather: { ...prev.weather, subAgents: { ...prev.weather.subAgents, alerts: AgentStatus.WORKING } } }));
        const alert = checkExtremeWeather(result.data);
        setExtremeWeatherAlert(alert);
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, weather: { ...prev.weather, subAgents: { ...prev.weather.subAgents, alerts: AgentStatus.DONE }, main: AgentStatus.DONE } }));
        return result.data;
    })();

    const soilPromise = (async () => {
        await sleep(100);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, nutrients: AgentStatus.WORKING } } }));
        const result = await getSoilData(newLocation, language);
        if (controller.signal.aborted) return null;
        setSoilInfo(result);
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, nutrients: AgentStatus.DONE } } }));

        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, ph_moisture: AgentStatus.WORKING } } }));
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, ph_moisture: AgentStatus.DONE } } }));

        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, type: AgentStatus.WORKING } } }));
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, soil: { ...prev.soil, subAgents: { ...prev.soil.subAgents, type: AgentStatus.DONE }, main: AgentStatus.DONE } }));

        return result.data;
    })();

    const marketPromise = (async () => {
        await sleep(200);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, market: { ...prev.market, subAgents: { ...prev.market.subAgents, prices: AgentStatus.WORKING } } }));
        const result = await getMarketData(newLocation, language);
        if (controller.signal.aborted) return null;
        setMarketInfo({ crops: result.data, sources: result.sources });
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, market: { ...prev.market, subAgents: { ...prev.market.subAgents, prices: AgentStatus.DONE } } }));
        
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, market: { ...prev.market, subAgents: { ...prev.market.subAgents, export: AgentStatus.WORKING } } }));
        await sleep(300);
        if (controller.signal.aborted) return null;
        setAgentStatuses(prev => ({ ...prev, market: { ...prev.market, subAgents: { ...prev.market.subAgents, export: AgentStatus.DONE }, main: AgentStatus.DONE } }));
        return result.data;
    })();

    try {
      const [weatherResult, soilResult, marketResult] = await Promise.all([weatherPromise, soilPromise, marketPromise]);
      
      if (controller.signal.aborted || !weatherResult || !soilResult || !marketResult) {
          return;
      }
      
      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.WORKING }));
      const adviceResult = await getFinalAdvice(newLocation, weatherResult, soilResult, marketResult, language);
      if (controller.signal.aborted) return;
      setFinalAdvice(adviceResult);
      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.DONE }));
      return adviceResult;

    } catch (err) {
      if (controller.signal.aborted) {
        console.log("Request was cancelled.");
        return;
      }
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate advice. ${errorMessage}`);
       setAgentStatuses({
        weather: { main: AgentStatus.ERROR, subAgents: { forecast: AgentStatus.ERROR, alerts: AgentStatus.ERROR }},
        soil: { main: AgentStatus.ERROR, subAgents: { nutrients: AgentStatus.ERROR, ph_moisture: AgentStatus.ERROR, type: AgentStatus.ERROR }},
        market: { main: AgentStatus.ERROR, subAgents: { prices: AgentStatus.ERROR, export: AgentStatus.ERROR }},
        planner: AgentStatus.ERROR
      });
      throw err;
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [resetState, selectedLanguage, checkExtremeWeather]);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setConversation([]);
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const systemInstruction = 
            selectedLanguage === Language.EN ? "You are Agri, a friendly and encouraging farming assistant. Your goal is to make farming advice accessible and easy to understand. Your entire response, including greetings, questions, and the final summary delivery, MUST be in English. Start the conversation by warmly greeting the user and asking for their location in English. Strictly process user input spoken in English and ignore other languages. If the location name is unclear, ask for clarification. When they provide a location, use the `getFarmingAdvice` tool. After you send the tool call, you will receive the result as a summary. Your job is to then speak this summary back to the user in a clear, positive, and conversational tone, entirely in English."
            : selectedLanguage === Language.HI ? "आप एग्री हैं, एक मिलनसार और उत्साहजनक खेती सहायक। आपका लक्ष्य खेती की सलाह को सुलभ और समझने में आसान बनाना है। आपकी पूरी प्रतिक्रिया, अभिवादन, प्रश्न और अंतिम सारांश सहित, अनिवार्य रूप से हिंदी में होनी चाहिए। उपयोगकर्ता का गर्मजोशी से अभिवादन करके और हिंदी में उनकी लोकेशन पूछकर बातचीत शुरू करें। केवल हिंदी में बोले गए उपयोगकर्ता इनपुट को संसाधित करें और अन्य भाषाओं को अनदेखा करें। यदि स्थान का नाम अस्पष्ट है, तो स्पष्टीकरण मांगें। जब वे एक लोकेशन प्रदान करते हैं, तो `getFarmingAdvice` टूल का उपयोग करें। टूल कॉल भेजने के बाद, आपको परिणाम एक सारांश के रूप में प्राप्त होगा। आपका काम इस सारांश को उपयोगकर्ता को एक स्पष्ट, सकारात्मक और संवादी लहजे में पूरी तरह से हिंदी में सुनाना है।"
            : "ನೀವು ಅಗ್ರಿ, ಒಬ್ಬ ಸ್ನೇಹಪರ ಮತ್ತು ಉತ್ತೇಜಕ ಕೃಷಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಗುರಿ ಕೃಷಿ ಸಲಹೆಯನ್ನು ಸುಲಭವಾಗಿ ಮತ್ತು ಅರ್ಥವಾಗುವಂತೆ ಮಾಡುವುದು. ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಪ್ರತಿಕ್ರಿಯೆ, ಶುಭಾಶಯಗಳು, ಪ್ರಶ್ನೆಗಳು, ಮತ್ತು ಅಂತಿಮ ಸಾರಾಂಶವನ್ನು ಒಳಗೊಂಡಂತೆ, ಕಡ್ಡಾಯವಾಗಿ ಕನ್ನಡದಲ್ಲಿರಬೇಕು. ಬಳಕೆದಾರರನ್ನು ಆತ್ಮೀಯವಾಗಿ ಸ್ವಾಗತಿಸಿ ಮತ್ತು ಕನ್ನಡದಲ್ಲಿ ಅವರ ಸ್ಥಳವನ್ನು ಕೇಳುವ ಮೂಲಕ ಸಂಭಾಷಣೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ. ಕೇವಲ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುವ ಬಳಕೆದಾರರ ಇನ್‌ಪುಟ್ ಅನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ ಮತ್ತು ಇತರ ಭಾಷೆಗಳನ್ನು ನಿರ್ಲಕ್ಷಿಸಿ. ಸ್ಥಳದ ಹೆಸರು ಅಸ್ಪಷ್ಟವಾಗಿದ್ದರೆ, ಸ್ಪಷ್ಟೀಕರಣವನ್ನು ಕೇಳಿ. ಅವರು ಸ್ಥಳವನ್ನು ಒದಗಿಸಿದಾಗ, `getFarmingAdvice` ಉಪಕರಣವನ್ನು ಬಳಸಿ. ಉಪಕರಣದ ಕರೆಯನ್ನು ಕಳುಹಿಸಿದ ನಂತರ, ನೀವು ಫಲಿತಾಂಶವನ್ನು ಸಾರಾಂಶವಾಗಿ ಸ್ವೀಕರಿಸುತ್ತೀರಿ. ನಿಮ್ಮ ಕೆಲಸ ಈ ಸಾರಾಂಶವನ್ನು ಬಳಕೆದಾರರಿಗೆ ಸ್ಪಷ್ಟ, ಸಕಾರಾತ್ಮಕ ಮತ್ತು ಸಂಭಾಷಣಾತ್ಮಕ ಧ್ವನಿಯಲ್ಲಿ ಸಂಪೂರ್ಣವಾಗಿ ಕನ್ನಡದಲ್ಲಿ ಹೇಳುವುದು.";

        if (!outputAudioContextRef.current) {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const outputNode = outputAudioContextRef.current.createGain();

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    if (!audioContextRef.current) {
                        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    }
                    
                    const source = audioContextRef.current.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;
                    
                    const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current.destination);
                },
                onmessage: async (message) => {
                    if(message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) setIsAssistantSpeaking(true);

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'getFarmingAdvice') {
                                const location = fc.args.location as string;
                                const analyzingText = selectedLanguage === Language.EN ? `Got it! Analyzing data for ${location}...`
                                    : selectedLanguage === Language.HI ? `समझ गया! ${location} के लिए डेटा का विश्लेषण कर रहा हूँ...`
                                    : `ಅರ್ಥವಾಯಿತು! ${location} ಗಾಗಿ ಡೇಟಾವನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...`;
                                setConversation(prev => [...prev, { speaker: 'assistant', text: analyzingText }]);
                                try {
                                    const advice = await handleGetAdvice(location);
                                    if(fc.id && advice) {
                                      sessionPromise.then(session => session.sendToolResponse({
                                          functionResponses: { id: fc.id, name: fc.name, response: { result: advice.summary } }
                                      }));
                                    }
                                } catch (e) {
                                    const errorSummary = selectedLanguage === Language.EN 
                                        ? 'I\'m sorry, I seem to be having trouble getting the data for that location. Could you please check the name and try again?' 
                                        : selectedLanguage === Language.HI
                                        ? 'माफ़ कीजिए, मुझे उस लोकेशन के लिए डेटा प्राप्त करने में कुछ समस्या हो रही है। क्या आप कृपया नाम जांच कर फिर से प्रयास कर सकते हैं?'
                                        : 'ಕ್ಷಮಿಸಿ, ಆ ಸ್ಥಳಕ್ಕಾಗಿ ಡೇಟಾವನ್ನು ಪಡೆಯಲು ನನಗೆ ಸಮಸ್ಯೆಯಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಬಹುದೇ?';

                                    if(fc.id) {
                                      sessionPromise.then(session => session.sendToolResponse({
                                          functionResponses: { id: fc.id, name: fc.name, response: { result: errorSummary } }
                                      }));
                                    }
                                }
                            }
                        }
                    }

                    if (message.serverContent?.outputTranscription?.text) {
                        setConversation(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.speaker === 'assistant') {
                                return [...prev.slice(0, -1), { ...last, text: last.text + message.serverContent.outputTranscription.text }];
                            }
                            return [...prev, { speaker: 'assistant', text: message.serverContent.outputTranscription.text }];
                        });
                    }
                    if (message.serverContent?.inputTranscription?.text) {
                         setConversation(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.speaker === 'user') {
                                return [...prev.slice(0, -1), { ...last, text: last.text + message.serverContent.inputTranscription.text }];
                            }
                            return [...prev, { speaker: 'user', text: message.serverContent.inputTranscription.text }];
                        });
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => {
                            sources.delete(source);
                            if (sources.size === 0) setIsAssistantSpeaking(false);
                        });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    } else if (sources.size === 0) {
                        setIsAssistantSpeaking(false);
                    }
                },
                onerror: (e) => console.error('Live session error:', e),
                onclose: () => {
                    stream.getTracks().forEach(track => track.stop());
                    scriptProcessorRef.current?.disconnect();
                    mediaStreamSourceRef.current?.disconnect();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                tools: [{ functionDeclarations: [getFarmingAdviceFunctionDeclaration] }],
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: selectedLanguage === Language.EN ? 'Kore' : 'Puck' },
                    },
                },
                systemInstruction,
            },
        });
        sessionPromiseRef.current = sessionPromise;
    } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
    }
  }, [handleGetAdvice, selectedLanguage]);
  
  const stopRecording = useCallback(async () => {
      if (sessionPromiseRef.current) {
          try {
            const session = await sessionPromiseRef.current;
            session.close();
          } catch(e) {
             console.error("Error closing session", e);
          } finally {
            sessionPromiseRef.current = null;
          }
      }
      setIsRecording(false);
      setIsAssistantSpeaking(false);
  }, []);

  const handleClearConversation = useCallback(() => {
    setConversation([]);
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handlePlayAudio = useCallback(async (agentType: AgentType, data: any) => {
    if (activePlaybackSourceRef.current) {
        activePlaybackSourceRef.current.onended = null; 
        activePlaybackSourceRef.current.stop();
        activePlaybackSourceRef.current = null;
    }

    if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (playbackAudioContextRef.current.state === 'suspended') {
        await playbackAudioContextRef.current.resume();
    }
    
    setPlaybackStatuses({ ...initialPlaybackStatuses, [agentType]: 'buffering' });

    try {
        let summaryText: string;
        if (agentType === AgentType.PLANNER) {
            summaryText = (data as FinalAdvice).summary;
        } else {
            summaryText = createSummaryForTTS(agentType, data, selectedLanguage);
        }
        
        const audioBase64 = await getTextToSpeechAudio(summaryText, selectedLanguage);
        
        if (!playbackAudioContextRef.current) return;

        const audioBuffer = await decodeAudioData(decode(audioBase64), playbackAudioContextRef.current, 24000, 1);
        const source = playbackAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackAudioContextRef.current.destination);
        
        activePlaybackSourceRef.current = source;
        
        setPlaybackStatuses(prev => ({ ...prev, [agentType]: 'playing' }));
        source.start(0);

        source.onended = () => {
            if (activePlaybackSourceRef.current === source) {
                setPlaybackStatuses(prev => ({ ...prev, [agentType]: 'idle' }));
                activePlaybackSourceRef.current = null;
            }
        };

    } catch (e) {
        console.error(`Error playing audio for ${agentType}:`, e);
        setPlaybackStatuses(prev => ({ ...prev, [agentType]: 'error' }));
        activePlaybackSourceRef.current = null;
    }
  }, [selectedLanguage]);
  
  const handleStopAudio = useCallback(() => {
    if (activePlaybackSourceRef.current) {
        activePlaybackSourceRef.current.onended = null;
        activePlaybackSourceRef.current.stop();
        activePlaybackSourceRef.current = null;
    }
    setPlaybackStatuses(initialPlaybackStatuses);
  }, []);


  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const currentStrings = uiStrings[selectedLanguage];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">
            {currentStrings.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {currentStrings.subtitle}
          </p>
        </header>

        <main>
          <div className="flex justify-center mb-6">
              <div className="flex rounded-lg shadow-sm" role="group">
                  <button type="button" onClick={() => setSelectedLanguage(Language.EN)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.EN ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border border-gray-200 dark:border-gray-600 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors`}>
                      English
                  </button>
                  <button type="button" onClick={() => setSelectedLanguage(Language.HI)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.HI ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border-t border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors`}>
                      हिंदी
                  </button>
                  <button type="button" onClick={() => setSelectedLanguage(Language.KA)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.KA ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border border-gray-200 dark:border-gray-600 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors`}>
                      ಕನ್ನಡ
                  </button>
              </div>
          </div>
          <LocationInput
            location={location}
            setLocation={setLocation}
            onGetAdvice={() => handleGetAdvice(location)}
            isLoading={isLoading}
            onCancel={handleCancel}
            placeholder={currentStrings.locationPlaceholder}
            getAdviceText={currentStrings.getAdviceButton}
            generatingText={currentStrings.generatingButton}
            cancelText={currentStrings.cancelButton}
          />
          
          <VoiceAssistant
            isRecording={isRecording}
            isAssistantSpeaking={isAssistantSpeaking}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            conversation={conversation}
            onClearConversation={handleClearConversation}
            title={currentStrings.voiceAssistant}
            promptText={currentStrings.voiceAssistantPrompt}
            listeningText={currentStrings.voiceAssistantListening}
          />

          {error && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-6 text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
            <AgentCard title={currentStrings.weatherAgent} status={agentStatuses.weather.main} icon={<CloudIcon />} onPlayAudio={weatherInfo ? () => handlePlayAudio(AgentType.WEATHER, weatherInfo.days) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.WEATHER]} sources={weatherInfo?.sources}>
                <div className="grid grid-cols-1 gap-2 mt-2">
                    <SubAgentCard title={currentStrings.forecast} icon={<ThermometerIcon />} status={agentStatuses.weather.subAgents.forecast}>
                        {weatherInfo && (
                            <ul className="space-y-1 text-xs max-h-[120px] overflow-y-auto pr-2 w-full">
                                {weatherInfo.days.slice(0, 7).map((day, index) => (
                                    <li key={day.day} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-1 rounded">
                                    <span>{day.day.slice(0,10)}</span>
                                    <span className="font-semibold">{day.high_temp_celsius}°/{day.low_temp_celsius}°C</span>
                                    <span>💧{day.precipitation_probability}%</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SubAgentCard>
                     <SubAgentCard title={currentStrings.alerts} icon={<AlertTriangleIcon />} status={agentStatuses.weather.subAgents.alerts}>
                       {extremeWeatherAlert && (
                         <p className={`text-sm font-bold text-center ${extremeWeatherAlert.type !== 'None' ? 'text-orange-400' : 'text-gray-500'}`}>{extremeWeatherAlert.message}</p>
                       )}
                    </SubAgentCard>
                </div>
            </AgentCard>

            <AgentCard title={currentStrings.soilAgent} status={agentStatuses.soil.main} icon={<LeafIcon />} onPlayAudio={soilInfo ? () => handlePlayAudio(AgentType.SOIL, soilInfo.data) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.SOIL]} sources={soilInfo?.sources}>
               <div className="grid grid-cols-1 gap-2 mt-2">
                    <SubAgentCard title={currentStrings.nutrients} icon={<TestTubeIcon />} status={agentStatuses.soil.subAgents.nutrients}>
                        {soilInfo && (
                            <div className="grid grid-cols-3 gap-x-2 text-center w-full">
                                <div><p className="text-sm text-gray-500 dark:text-gray-400">N</p><p className="font-mono text-base font-semibold">{soilInfo.data.nitrogen_ppm}</p></div>
                                <div><p className="text-sm text-gray-500 dark:text-gray-400">P</p><p className="font-mono text-base font-semibold">{soilInfo.data.phosphorus_ppm}</p></div>
                                <div><p className="text-sm text-gray-500 dark:text-gray-400">K</p><p className="font-mono text-base font-semibold">{soilInfo.data.potassium_ppm}</p></div>
                            </div>
                        )}
                    </SubAgentCard>
                     <SubAgentCard title={currentStrings.phLevel} icon={<DropletIcon />} status={agentStatuses.soil.subAgents.ph_moisture}>
                        {soilInfo && (
                           <div className="text-center">
                                <span className="font-mono text-xl font-bold">{soilInfo.data.ph_level}</span>
                           </div>
                        )}
                    </SubAgentCard>
                     <SubAgentCard title={currentStrings.soilType} icon={<GlobeIcon />} status={agentStatuses.soil.subAgents.type}>
                         <p className="text-sm text-gray-500 dark:text-gray-300 font-semibold">{currentStrings.soilTypeIdentified}</p>
                    </SubAgentCard>
                </div>
            </AgentCard>

            <AgentCard title={currentStrings.marketAgent} status={agentStatuses.market.main} icon={<DollarSignIcon />} onPlayAudio={marketInfo ? () => handlePlayAudio(AgentType.MARKET, marketInfo.crops) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.MARKET]} sources={marketInfo?.sources}>
                <div className="grid grid-cols-1 gap-2 mt-2">
                    <SubAgentCard title={currentStrings.priceTracker} icon={<TagIcon />} status={agentStatuses.market.subAgents.prices}>
                        {marketInfo && (
                             <ul className="space-y-1 text-xs max-h-[120px] overflow-y-auto pr-2 w-full">
                                {marketInfo.crops.slice(0,3).map(crop => (
                                    <li key={crop.crop_name} className="grid grid-cols-[1.5fr_1fr] items-center gap-x-2">
                                        <span className="font-semibold break-words">{crop.crop_name}</span>
                                        <span className="font-mono text-right">{crop.market_price_per_kg}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SubAgentCard>
                     <SubAgentCard title={currentStrings.exportMarkets} icon={<GlobeIcon />} status={agentStatuses.market.subAgents.export}>
                         <p className="text-sm text-gray-500 dark:text-gray-300 font-semibold">{currentStrings.exportPotential}</p>
                    </SubAgentCard>
                </div>
            </AgentCard>
          </div>

          <div className="mt-8">
             <AgentCard 
                title={currentStrings.plannerAgent} 
                status={agentStatuses.planner} 
                icon={<BrainIcon />}
                onPlayAudio={finalAdvice ? () => handlePlayAudio(AgentType.PLANNER, finalAdvice) : undefined}
                onStopAudio={handleStopAudio}
                playbackStatus={playbackStatuses[AgentType.PLANNER]}
              >
                {finalAdvice && <AdviceCard 
                    advice={finalAdvice} 
                    recommendedCropsTitle={currentStrings.recommendedCrops}
                    sowingPlanTitle={currentStrings.sowingPlan}
                    soilManagementTipsTitle={currentStrings.soilManagementTips}
                />}
            </AgentCard>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;