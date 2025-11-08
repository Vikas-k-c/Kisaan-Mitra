
import React from 'react';
import { AgentStatus, PlaybackStatus, GroundingSource } from '../types';
import { SpinnerIcon, StopCircleIcon, VolumeIcon } from './Icons';

interface AgentCardProps {
  title: string;
  status: AgentStatus;
  icon: React.ReactNode;
  children: React.ReactNode;
  onPlayAudio?: () => void;
  onStopAudio?: () => void;
  playbackStatus?: PlaybackStatus;
  sources?: GroundingSource[];
}

const StatusIndicator: React.FC<{ status: AgentStatus }> = ({ status }) => {
    let bgColor = 'bg-gray-400';
    let text = 'Idle';

    switch (status) {
        case AgentStatus.WORKING:
            bgColor = 'bg-blue-500 animate-pulse';
            text = 'Working...';
            break;
        case AgentStatus.DONE:
            bgColor = 'bg-green-500';
            text = 'Done';
            break;
        case AgentStatus.ERROR:
            bgColor = 'bg-red-500';
            text = 'Error';
            break;
    }

    return (
        <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${bgColor}`}>{text}</span>
        </div>
    );
};

export const AgentCard: React.FC<AgentCardProps> = ({ title, status, icon, children, onPlayAudio, onStopAudio, playbackStatus, sources }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:border-green-400 dark:hover:border-green-500 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
            <div className="text-green-500">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h3>
            {status === AgentStatus.DONE && onPlayAudio && (
              <div className="w-6 h-6"> {/* Container to prevent layout shift */}
                {playbackStatus === 'playing' ? (
                  <button
                    onClick={onStopAudio}
                    className="text-red-500 hover:text-red-600"
                    title="Stop audio playback"
                  >
                    <StopCircleIcon className="w-6 h-6" />
                  </button>
                ) : playbackStatus === 'buffering' ? (
                  <SpinnerIcon className="w-6 h-6 text-green-500" />
                ) : (
                  <button 
                    onClick={onPlayAudio} 
                    className="text-gray-500 hover:text-green-500"
                    title="Play audio summary"
                  >
                    <VolumeIcon className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}
        </div>
        <StatusIndicator status={status} />
      </div>
      <div className="content min-h-[140px] flex-grow flex flex-col">
        {status === AgentStatus.WORKING && (
          <div className="flex items-center justify-center flex-grow">
            <svg className="animate-spin h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {(status === AgentStatus.DONE || status === AgentStatus.WORKING) && (
            <div className="flex-grow">
                {children}
            </div>
        )}
         {status === AgentStatus.IDLE && (
            <p className="text-gray-500 dark:text-gray-400 text-sm flex-grow flex items-center justify-center">
                Waiting for input...
            </p>
         )}
        {status === AgentStatus.ERROR && (
            <p className="text-red-500 dark:text-red-400 text-sm flex-grow flex items-center justify-center">
                An error occurred while gathering data.
            </p>
        )}
        {status === AgentStatus.DONE && sources && sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Sources</h5>
                <ul className="space-y-1 max-h-24 overflow-y-auto">
                    {sources.map((source, index) => (
                        <li key={index} className="truncate">
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                {source.title || new URL(source.uri).hostname}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};
