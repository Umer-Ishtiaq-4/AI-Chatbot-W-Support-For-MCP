'use client'

import ServiceConnectionCard from './ServiceConnectionCard';

interface GSCConnectionCardProps {
  onConnect: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

export default function GSCConnectionCard({ onConnect, isConnected, isLoading }: GSCConnectionCardProps) {
  const gscIcon = (
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.75 19h-1.5v-6h1.5v6zm0-8h-1.5V5h1.5v6z"/>
    </svg>
  );

  return (
    <ServiceConnectionCard
      serviceName="Google Search Console"
      serviceDescription="Access search analytics and optimization data"
      serviceIcon={gscIcon}
      gradientColors="from-green-500 to-emerald-600"
      onConnect={onConnect}
      isConnected={isConnected}
      isLoading={isLoading}
    />
  );
}

