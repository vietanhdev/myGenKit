import React from 'react';
import { Chip } from '@heroui/react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { connected, client } = useLiveAPIContext();
  
  const getStatusInfo = () => {
    if (connected) {
      return {
        label: 'Connected',
        color: 'success' as const,
        variant: 'flat' as const,
        description: 'API connection active'
      };
    } else {
      const status = client.status;
      if (status === 'connecting') {
        return {
          label: 'Connecting',
          color: 'warning' as const,
          variant: 'flat' as const,
          description: 'Establishing connection...'
        };
      } else {
        return {
          label: 'Disconnected',
          color: 'danger' as const,
          variant: 'flat' as const,
          description: 'No API connection'
        };
      }
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Chip
        color={statusInfo.color}
        variant={statusInfo.variant}
        size="sm"
        className="text-xs"
      >
        {statusInfo.label}
      </Chip>
      <span className="text-xs text-default-500 hidden sm:inline">
        {statusInfo.description}
      </span>
    </div>
  );
}; 