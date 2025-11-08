
export enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  DONE = 'done',
  ERROR = 'error',
}

export enum Language {
  EN = 'en-US',
  HI = 'hi-IN',
  KA = 'kn-IN',
}

export enum AgentType {
  WEATHER = 'weather',
  SOIL = 'soil',
  MARKET = 'market',
  PLANNER = 'planner',
}

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'error';

export interface PlaybackStatuses {
  [AgentType.WEATHER]: PlaybackStatus;
  [AgentType.SOIL]: PlaybackStatus;
  [AgentType.MARKET]: PlaybackStatus;
  [AgentType.PLANNER]: PlaybackStatus;
}


export interface ConversationMessage {
  speaker: 'user' | 'assistant';
  text: string;
}

export interface WeatherDay {
  day: string;
  high_temp_celsius: number;
  low_temp_celsius: number;
  precipitation_probability: number;
  humidity: number;
}

export interface SoilData {
  ph_level: number;
  nitrogen_ppm: number;
  phosphorus_ppm: number;
  potassium_ppm: number;
  soil_moisture_percent: number;
}

export interface MarketCrop {
  crop_name: string;
  market_price_per_kg: string;
}

export interface RecommendedCrop {
  name: string;
  reasoning: string;
  marketPotential: 'Excellent' | 'Good' | 'Fair';
}

export interface SowingPlan {
  optimalWindow: string;
  justification: string;
}

export interface FinalAdvice {
  recommendedCrops: RecommendedCrop[];
  sowingPlan: SowingPlan;
  soilManagementTips: string[];
  summary: string;
}

// New types for sub-agents
export interface ExtremeWeatherAlert {
  type: 'Heatwave' | 'Frost' | 'Heavy Rain' | 'High Winds' | 'None';
  message: string;
}

export interface SubAgentStatuses {
  [key: string]: AgentStatus;
}

export interface MainAgentStatus {
  main: AgentStatus;
  subAgents: SubAgentStatuses;
}

// Updated AgentStatuses to be hierarchical
export interface AgentStatuses {
  weather: MainAgentStatus;
  soil: MainAgentStatus;
  market: MainAgentStatus;
  planner: AgentStatus;
}

// New type for grounding sources
export interface GroundingSource {
  uri: string;
  title: string;
}