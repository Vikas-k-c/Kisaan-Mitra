
import React from 'react';
import { type FinalAdvice } from '../types';

interface AdviceCardProps {
  advice: FinalAdvice;
  recommendedCropsTitle: string;
  sowingPlanTitle: string;
  soilManagementTipsTitle: string;
}

const getMarketPotentialColor = (potential: 'Excellent' | 'Good' | 'Fair') => {
  switch (potential) {
    case 'Excellent':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Good':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'Fair':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};


export const AdviceCard: React.FC<AdviceCardProps> = ({ advice, recommendedCropsTitle, sowingPlanTitle, soilManagementTipsTitle }) => {
  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-300">
      
      <div>
        <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{recommendedCropsTitle}</h4>
        <div className="space-y-4">
          {advice.recommendedCrops.map((crop) => (
            <div key={crop.name} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-md font-bold text-green-600 dark:text-green-400">{crop.name}</h5>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getMarketPotentialColor(crop.marketPotential)}`}>
                  {crop.marketPotential} Potential
                </span>
              </div>
              <p className="text-sm">{crop.reasoning}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{sowingPlanTitle}</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="font-bold text-md text-blue-600 dark:text-blue-400 mb-1">{advice.sowingPlan.optimalWindow}</p>
          <p className="text-sm">{advice.sowingPlan.justification}</p>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
        <h4 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">{soilManagementTipsTitle}</h4>
        <ul className="list-disc list-inside space-y-2 text-base text-yellow-900 dark:text-yellow-100">
          {advice.soilManagementTips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>

    </div>
  );
};