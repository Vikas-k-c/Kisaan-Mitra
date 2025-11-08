
import React from 'react';
import { AgentStatus } from '../types';
import { SpinnerIcon } from './Icons';

interface SubAgentCardProps {
  title: string;
  status: AgentStatus;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const SubAgentCard: React.FC<SubAgentCardProps> = ({ title, status, icon, children }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600/50 h-full">
      <div className="flex items-center space-x-2 mb-2">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      </div>
      <div className="content text-sm min-h-[44px] flex items-center justify-center">
        {status === AgentStatus.WORKING && (
            <SpinnerIcon className="w-5 h-5 text-green-500" />
        )}
        {status === AgentStatus.DONE && children}
        {status === AgentStatus.IDLE && (
            <p className="text-gray-400 dark:text-gray-500 text-xs w-full text-center">Waiting...</p>
        )}
        {status === AgentStatus.ERROR && (
            <p className="text-red-500 dark:text-red-400 text-xs w-full text-center">Error</p>
        )}
      </div>
    </div>
  );
};
