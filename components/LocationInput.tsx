import React from 'react';

interface LocationInputProps {
  location: string;
  setLocation: (location: string) => void;
  onGetAdvice: () => void;
  isLoading: boolean;
  onCancel: () => void;
  placeholder: string;
  getAdviceText: string;
  generatingText: string;
  cancelText: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({ 
  location, 
  setLocation, 
  onGetAdvice, 
  isLoading, 
  onCancel,
  placeholder,
  getAdviceText,
  generatingText,
  cancelText 
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGetAdvice();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
      <div className="relative w-full sm:w-1/2 flex-grow">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
          disabled={isLoading}
        />
        {location && !isLoading && (
            <button
              type="button"
              onClick={() => setLocation('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="Clear location input"
              title="Clear location"
            >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!location || isLoading}
        className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {generatingText}
          </>
        ) : (
          getAdviceText
        )}
      </button>
      {isLoading && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105"
        >
          {cancelText}
        </button>
      )}
    </form>
  );
};