'use client'

import { useState, useEffect, useRef } from 'react';

interface GA4ConnectionCardProps {
  onConnect: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

export default function GA4ConnectionCard({ onConnect, isConnected, isLoading }: GA4ConnectionCardProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const hasShownSuccess = useRef(false);

  useEffect(() => {
    if (isConnected && !hasShownSuccess.current) {
      hasShownSuccess.current = true;
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.2 12.04c0-.82-.07-1.61-.2-2.37H12v4.48h5.71c-.25 1.32-1 2.44-2.12 3.19v2.65h3.43c2.01-1.85 3.18-4.58 3.18-7.95z"/>
              <path d="M12 24c2.87 0 5.27-.95 7.02-2.58l-3.43-2.65c-.95.64-2.17 1.01-3.59 1.01-2.75 0-5.08-1.86-5.91-4.36H2.51v2.74C4.25 21.5 7.87 24 12 24z"/>
              <path d="M6.09 15.42c-.21-.64-.33-1.32-.33-2.02s.12-1.38.33-2.02V8.64H2.51C1.83 10 1.45 11.47 1.45 13s.38 3 1.06 4.36l3.58-2.94z"/>
              <path d="M12 4.76c1.55 0 2.94.53 4.04 1.58l3.02-3.02C17.25 1.63 14.85.45 12 .45 7.87.45 4.25 2.95 2.51 6.29l3.58 2.94c.83-2.5 3.16-4.47 5.91-4.47z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Google Analytics 4</h3>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Connect to query your analytics data'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {isConnected && (
            <div className="flex items-center text-green-600">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
          
          <button
            onClick={onConnect}
            disabled={isLoading || isConnected}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isLoading
                ? 'bg-gray-200 text-gray-500 cursor-wait'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <p className="text-sm text-green-700">
            ✅ Successfully connected to Google Analytics 4! You can now query your analytics data.
          </p>
        </div>
      )}
    </div>
  );
}
