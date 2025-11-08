
import React, { useRef, useEffect } from 'react';
import { Language, type ConversationMessage } from '../types';
import { MicrophoneIcon, StopIcon, TrashIcon, VolumeIcon } from './Icons';

interface VoiceAssistantProps {
    isRecording: boolean;
    isAssistantSpeaking: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onClearConversation: () => void;
    selectedLanguage: Language;
    onLanguageChange: (lang: Language) => void;
    conversation: ConversationMessage[];
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
    isRecording,
    isAssistantSpeaking,
    onStartRecording,
    onStopRecording,
    onClearConversation,
    selectedLanguage,
    onLanguageChange,
    conversation
}) => {
    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation]);

    const handleClearClick = () => {
        if (window.confirm("Are you sure you want to clear the conversation history?")) {
            onClearConversation();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Voice Assistant</h3>
                     <button
                        onClick={handleClearClick}
                        disabled={conversation.length === 0}
                        className="text-gray-500 hover:text-red-500 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        aria-label="Clear conversation history"
                        title="Clear conversation"
                    >
                        <TrashIcon />
                    </button>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex rounded-lg shadow-sm" role="group">
                        <button type="button" onClick={() => onLanguageChange(Language.EN)} disabled={isRecording} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.EN ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border border-gray-200 dark:border-gray-600 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50`}>
                            English
                        </button>
                        <button type="button" onClick={() => onLanguageChange(Language.HI)} disabled={isRecording} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.HI ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border-t border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50`}>
                            हिंदी
                        </button>
                        <button type="button" onClick={() => onLanguageChange(Language.KA)} disabled={isRecording} className={`px-4 py-2 text-sm font-medium ${selectedLanguage === Language.KA ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} border border-gray-200 dark:border-gray-600 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-green-500 disabled:opacity-50`}>
                            ಕನ್ನಡ
                        </button>
                    </div>
                    <button
                        onClick={isRecording ? onStopRecording : onStartRecording}
                        className={`relative w-16 h-16 flex items-center justify-center rounded-full transition-colors duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                        aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                        {isRecording ? <StopIcon className="w-8 h-8 text-white" /> : <MicrophoneIcon className="w-8 h-8 text-white" />}
                        {isRecording && <span className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></span>}
                    </button>
                </div>
            </div>

            <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-y-auto space-y-4">
                {conversation.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                       {isRecording ? "Listening..." : "Press the mic to start"}
                    </div>
                )}
                {conversation.map((msg, index) => (
                     <div key={index} className={`flex items-start gap-2.5 ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 rounded-xl ${
                             msg.speaker === 'user' 
                                ? 'bg-green-100 dark:bg-green-700 rounded-br-none' 
                                : 'bg-blue-100 dark:bg-blue-700 rounded-bl-none'
                        }`}>
                             <p className={`text-sm font-normal ${msg.speaker === 'user' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                                {msg.text}
                            </p>
                        </div>
                         {msg.speaker === 'assistant' && isAssistantSpeaking && index === conversation.length - 1 && (
                            <VolumeIcon className="w-5 h-5 text-blue-500 animate-pulse" />
                        )}
                    </div>
                ))}
                 <div ref={conversationEndRef} />
            </div>
        </div>
    )
}