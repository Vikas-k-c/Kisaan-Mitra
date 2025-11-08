
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgentStatus, type AgentStatuses, type FinalAdvice, type MarketCrop, type SoilData, type WeatherDay, Language, ConversationMessage, AgentType, PlaybackStatuses, PlaybackStatus } from './types';
import { getFinalAdvice, getMarketData, getSoilData, getWeatherData, decode, decodeAudioData, encode, createBlob, getTextToSpeechAudio, createSummaryForTTS } from './services/geminiService';
import { LocationInput } from './components/LocationInput';
import { AgentCard } from './components/AgentCard';
import { AdviceCard } from './components/AdviceCard';
import { BrainIcon, CloudIcon, DollarSignIcon, LeafIcon } from './components/Icons';
// Fix: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, FunctionDeclaration, Type, Modality } from '@google/genai';
import { VoiceAssistant } from './components/VoiceAssistant';


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
  weather: AgentStatus.IDLE,
  soil: AgentStatus.IDLE,
  market: AgentStatus.IDLE,
  planner: AgentStatus.IDLE,
};

const initialPlaybackStatuses: PlaybackStatuses = {
  [AgentType.WEATHER]: 'idle',
  [AgentType.SOIL]: 'idle',
  [AgentType.MARKET]: 'idle',
  [AgentType.PLANNER]: 'idle',
};


const App: React.FC = () => {
  const [location, setLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [weatherData, setWeatherData] = useState<WeatherDay[] | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [marketData, setMarketData] = useState<MarketCrop[] | null>(null);
  const [finalAdvice, setFinalAdvice] = useState<FinalAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice Assistant State
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.EN);
  const [isRecording, setIsRecording] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  // Fix: LiveSession is not an exported member of @google/genai, using any instead.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const activePlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>(initialAgentStatuses);
  const [playbackStatuses, setPlaybackStatuses] = useState<PlaybackStatuses>(initialPlaybackStatuses);

  const resetState = useCallback(() => {
    setWeatherData(null);
    setSoilData(null);
    setMarketData(null);
    setFinalAdvice(null);
    setError(null);
    setAgentStatuses(initialAgentStatuses);
    setPlaybackStatuses(initialPlaybackStatuses);
  }, []);

  const handleGetAdvice = useCallback(async (newLocation: string) => {
    if (!newLocation) return;
    setLocation(newLocation);
    setIsLoading(true);
    resetState();

    setAgentStatuses(prev => ({ ...prev, weather: AgentStatus.WORKING, soil: AgentStatus.WORKING, market: AgentStatus.WORKING }));

    try {
      const [weatherResult, soilResult, marketResult] = await Promise.all([
        getWeatherData(newLocation),
        getSoilData(newLocation),
        getMarketData(newLocation)
      ]);
      setAgentStatuses(prev => ({ ...prev, weather: AgentStatus.DONE, soil: AgentStatus.DONE, market: AgentStatus.DONE }));
      setWeatherData(weatherResult);
      setSoilData(soilResult);
      setMarketData(marketResult);

      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.WORKING }));
      const language = selectedLanguage === Language.EN ? 'English' : selectedLanguage === Language.HI ? 'Hindi' : 'Kannada';
      const adviceResult = await getFinalAdvice(newLocation, weatherResult, soilResult, marketResult, language);
      setFinalAdvice(adviceResult);
      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.DONE }));
      return adviceResult;

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate advice. ${errorMessage}`);
      setAgentStatuses({ weather: AgentStatus.ERROR, soil: AgentStatus.ERROR, market: AgentStatus.ERROR, planner: AgentStatus.ERROR });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [resetState, selectedLanguage]);

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
                    
                    const workletCode = `
                        class AudioProcessor extends AudioWorkletProcessor {
                            process(inputs, outputs, parameters) {
                                const input = inputs[0];
                                if (input.length > 0) {
                                    this.port.postMessage(input[0]);
                                }
                                return true;
                            }
                        }
                        registerProcessor('audio-processor', AudioProcessor);
                    `;
                    const blob = new Blob([workletCode], { type: 'application/javascript' });
                    const workletURL = URL.createObjectURL(blob);

                    try {
                      await audioContextRef.current.audioWorklet.addModule(workletURL);
                    } catch(e) {
                      console.error("Error adding audio worklet module", e);
                      setIsRecording(false);
                      return;
                    }

                    mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                    workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
                    
                    workletNodeRef.current.port.onmessage = (event) => {
                        const pcmData = event.data;
                        const pcmBlob = createBlob(pcmData);
                        // Fix: Use the sessionPromise from the closure to avoid a race condition.
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    mediaStreamSourceRef.current.connect(workletNodeRef.current);
                    workletNodeRef.current.connect(audioContextRef.current.destination);
                },
                onmessage: async (message) => {
                    if(message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) setIsAssistantSpeaking(true);

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'getFarmingAdvice') {
                                // Fix: Explicitly cast location from function call arguments to string.
                                const location = fc.args.location as string;
                                setConversation(prev => [...prev, { speaker: 'assistant', text: `Got it! Analyzing data for ${location}...`}]);
                                try {
                                    const advice = await handleGetAdvice(location);
                                    if(fc.id) {
                                      // Fix: Use the sessionPromise from the closure to avoid a race condition.
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
                                      // Fix: Use the sessionPromise from the closure to avoid a race condition.
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
                    workletNodeRef.current?.disconnect();
                    mediaStreamSourceRef.current?.disconnect();
                },
            },
            // Fix: Replaced invalid `languageCode` property with `speechConfig` to set the voice based on the selected language.
            // Fix: Removed invalid 'endpointerConfig' property from the config as it's not a valid property for LiveConnectConfig.
            config: {
                responseModalities: [Modality.AUDIO],
                tools: [{ functionDeclarations: [getFarmingAdviceFunctionDeclaration] }],
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        // Puck is a good voice for Indic languages.
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
  }, []);

  const handlePlayAudio = useCallback(async (agentType: AgentType, data: any) => {
    // Stop any currently playing audio source
    if (activePlaybackSourceRef.current) {
        activePlaybackSourceRef.current.onended = null; 
        activePlaybackSourceRef.current.stop();
        activePlaybackSourceRef.current = null;
    }

    if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    // Resume context if it's suspended (e.g., by browser autoplay policies)
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
            // Only update state if this is the source that was meant to be playing
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">
            Kisaan Mitra
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            AI agents collaborate to provide personalized, real-time farming advice. Enter your location to begin.
          </p>
        </header>

        <main>
          <LocationInput
            location={location}
            setLocation={setLocation}
            onGetAdvice={() => handleGetAdvice(location)}
            isLoading={isLoading}
          />
          
          <VoiceAssistant
            isRecording={isRecording}
            isAssistantSpeaking={isAssistantSpeaking}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            conversation={conversation}
            onClearConversation={handleClearConversation}
          />

          {error && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-6 text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <AgentCard title="Weather Agent" status={agentStatuses.weather} icon={<CloudIcon />} onPlayAudio={weatherData ? () => handlePlayAudio(AgentType.WEATHER, weatherData) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.WEATHER]}>
              {weatherData && (
                 <ul className="space-y-2 text-sm">
                  {weatherData.slice(0, 3).map(day => (
                     <li key={day.day} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                       <span>{day.day}</span>
                       <span className="font-semibold">{day.high_temp_celsius}°C / {day.low_temp_celsius}°C</span>
                       <span>💧 {day.precipitation_probability}%</span>
                     </li>
                   ))}
                 </ul>
              )}
            </AgentCard>

            <AgentCard title="Soil Agent" status={agentStatuses.soil} icon={<LeafIcon />} onPlayAudio={soilData ? () => handlePlayAudio(AgentType.SOIL, soilData) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.SOIL]}>
                {soilData && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <span><strong>pH Level:</strong></span><span className="font-mono text-green-500 text-right">{soilData.ph_level}</span>
                        <span><strong>Nitrogen:</strong></span><span className="font-mono text-green-500 text-right">{soilData.nitrogen_ppm} ppm</span>
                        <span><strong>Phosphorus:</strong></span><span className="font-mono text-green-500 text-right">{soilData.phosphorus_ppm} ppm</span>
                        <span><strong>Potassium:</strong></span><span className="font-mono text-green-500 text-right">{soilData.potassium_ppm} ppm</span>
                        <span><strong>Moisture:</strong></span><span className="font-mono text-green-500 text-right">{soilData.soil_moisture_percent}%</span>
                    </div>
                )}
            </AgentCard>

            <AgentCard title="Market Agent" status={agentStatuses.market} icon={<DollarSignIcon />} onPlayAudio={marketData ? () => handlePlayAudio(AgentType.MARKET, marketData) : undefined} onStopAudio={handleStopAudio} playbackStatus={playbackStatuses[AgentType.MARKET]}>
                 {marketData && (
                    <ul className="space-y-2 text-sm">
                        {marketData.slice(0,3).map(crop => (
                             <li key={crop.crop_name} className="grid grid-cols-[2fr_1.5fr_1fr] items-center gap-x-3 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                                <span className="font-semibold break-words">{crop.crop_name}</span>
                                <span className="font-mono text-right">{crop.market_price_per_kg}</span>
                                <span className={`px-2 py-1 text-xs rounded-full justify-self-end ${
                                    crop.demand_trend === 'High' ? 'bg-green-200 text-green-800' :
                                    crop.demand_trend === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                                    'bg-red-200 text-red-800'
                                }`}>{crop.demand_trend}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </AgentCard>
          </div>

          <div className="mt-8">
             <AgentCard 
                title="Master Planner Agent" 
                status={agentStatuses.planner} 
                icon={<BrainIcon />}
                onPlayAudio={finalAdvice ? () => handlePlayAudio(AgentType.PLANNER, finalAdvice) : undefined}
                onStopAudio={handleStopAudio}
                playbackStatus={playbackStatuses[AgentType.PLANNER]}
              >
                {finalAdvice && <AdviceCard advice={finalAdvice} />}
            </AgentCard>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;