import React, { useState, useCallback } from 'react';
import { AgentStatus, type AgentStatuses, type FinalAdvice, type MarketCrop, type SoilData, type WeatherDay } from './types';
import { getFinalAdvice, getMarketData, getSoilData, getWeatherData } from './services/geminiService';
import { LocationInput } from './components/LocationInput';
import { AgentCard } from './components/AgentCard';
import { AdviceCard } from './components/AdviceCard';
import { BrainIcon, CloudIcon, DollarSignIcon, LeafIcon } from './components/Icons';

const App: React.FC = () => {
  const [location, setLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [weatherData, setWeatherData] = useState<WeatherDay[] | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [marketData, setMarketData] = useState<MarketCrop[] | null>(null);
  const [finalAdvice, setFinalAdvice] = useState<FinalAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialAgentStatuses: AgentStatuses = {
    weather: AgentStatus.IDLE,
    soil: AgentStatus.IDLE,
    market: AgentStatus.IDLE,
    planner: AgentStatus.IDLE,
  };
  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>(initialAgentStatuses);

  const resetState = () => {
    setWeatherData(null);
    setSoilData(null);
    setMarketData(null);
    setFinalAdvice(null);
    setError(null);
    setAgentStatuses(initialAgentStatuses);
  };

  const handleGetAdvice = useCallback(async () => {
    if (!location) return;

    setIsLoading(true);
    resetState();

    setAgentStatuses(prev => ({ ...prev, weather: AgentStatus.WORKING, soil: AgentStatus.WORKING, market: AgentStatus.WORKING }));

    try {
      const [weatherResult, soilResult, marketResult] = await Promise.all([
        getWeatherData(location).finally(() => setAgentStatuses(prev => ({ ...prev, weather: AgentStatus.DONE }))),
        getSoilData(location).finally(() => setAgentStatuses(prev => ({ ...prev, soil: AgentStatus.DONE }))),
        getMarketData(location).finally(() => setAgentStatuses(prev => ({ ...prev, market: AgentStatus.DONE })))
      ]);

      setWeatherData(weatherResult);
      setSoilData(soilResult);
      setMarketData(marketResult);

      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.WORKING }));

      const adviceResult = await getFinalAdvice(location, weatherResult, soilResult, marketResult);
      setFinalAdvice(adviceResult);
      setAgentStatuses(prev => ({ ...prev, planner: AgentStatus.DONE }));

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate advice. ${errorMessage}`);
      setAgentStatuses({
        weather: AgentStatus.ERROR,
        soil: AgentStatus.ERROR,
        market: AgentStatus.ERROR,
        planner: AgentStatus.ERROR,
      });
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">
            Agri-Agent Collaborative
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            AI agents collaborate to provide personalized, real-time farming advice. Enter your location to begin.
          </p>
        </header>

        <main>
          <LocationInput
            location={location}
            setLocation={setLocation}
            onGetAdvice={handleGetAdvice}
            isLoading={isLoading}
          />

          {error && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-6 text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <AgentCard title="Weather Agent" status={agentStatuses.weather} icon={<CloudIcon />}>
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

            <AgentCard title="Soil Agent" status={agentStatuses.soil} icon={<LeafIcon />}>
                {soilData && (
                    <div className="text-sm space-y-2">
                        <p><strong>pH Level:</strong> <span className="font-mono text-green-500">{soilData.ph_level}</span></p>
                        <p><strong>Nitrogen:</strong> <span className="font-mono text-green-500">{soilData.nitrogen_ppm} ppm</span></p>
                        <p><strong>Moisture:</strong> <span className="font-mono text-green-500">{soilData.soil_moisture_percent}%</span></p>
                    </div>
                )}
            </AgentCard>

            <AgentCard title="Market Agent" status={agentStatuses.market} icon={<DollarSignIcon />}>
                 {marketData && (
                    <ul className="space-y-2 text-sm">
                        {marketData.slice(0,3).map(crop => (
                            <li key={crop.crop_name} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                                <span className="font-semibold">{crop.crop_name}</span>
                                <span>{crop.market_price_per_kg}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
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
             <AgentCard title="Master Planner Agent" status={agentStatuses.planner} icon={<BrainIcon />}>
                {finalAdvice && <AdviceCard advice={finalAdvice} />}
            </AgentCard>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
