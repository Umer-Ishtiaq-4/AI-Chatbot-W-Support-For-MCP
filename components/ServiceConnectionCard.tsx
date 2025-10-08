'use client'

import { useState, useEffect, useRef } from 'react';

interface ServiceConnectionCardProps {
  serviceName: string;
  serviceDescription: string;
  serviceIcon: React.ReactNode;
  gradientColors: string; // e.g., "from-blue-500 to-indigo-600"
  onConnect: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

export default function ServiceConnectionCard({ 
  serviceName, 
  serviceDescription,
  serviceIcon,
  gradientColors,
  onConnect, 
  isConnected, 
  isLoading 
}: ServiceConnectionCardProps) {
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
          <div className={`w-12 h-12 bg-gradient-to-br ${gradientColors} rounded-lg flex items-center justify-center`}>
            {serviceIcon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{serviceName}</h3>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Connected' : serviceDescription}
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
                : `bg-gradient-to-r ${gradientColors} text-white hover:shadow-lg`
            }`}
          >
            {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <p className="text-sm text-green-700">
            ✅ Successfully connected to {serviceName}! You can now query your data.
          </p>
        </div>
      )}
    </div>
  );
}

