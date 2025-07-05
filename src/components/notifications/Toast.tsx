import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { RiErrorWarningLine, RiCheckLine, RiInformationLine, RiCloseLine } from 'react-icons/ri';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [isVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!message.persistent && message.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(message.id), 300);
      }, message.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [message.id, message.duration, message.persistent, onClose]);

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <RiCheckLine size={20} className="text-success" />;
      case 'error':
        return <RiErrorWarningLine size={20} className="text-danger" />;
      case 'warning':
        return <RiErrorWarningLine size={20} className="text-warning" />;
      case 'info':
      default:
        return <RiInformationLine size={20} className="text-primary" />;
    }
  };

  const getColor = () => {
    switch (message.type) {
      case 'success':
        return 'border-success bg-success-50';
      case 'error':
        return 'border-danger bg-danger-50';
      case 'warning':
        return 'border-warning bg-warning-50';
      case 'info':
      default:
        return 'border-primary bg-primary-50';
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(message.id), 300);
  };

  return (
    <Card 
      className={`
        ${getColor()} 
        border-l-4 
        shadow-lg 
        transition-all 
        duration-300 
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${isVisible ? 'animate-in slide-in-from-right' : ''}
      `}
    >
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm">
                  {message.title}
                </h4>
                {message.message && (
                  <p className="text-sm text-default-600 mt-1">
                    {message.message}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-default-400 hover:text-default-600 transition-colors shrink-0"
              >
                <RiCloseLine size={18} />
              </button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  messages, 
  onClose, 
  position = 'top-right' 
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'fixed top-4 left-4 z-50 space-y-2 max-w-md w-full';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50 space-y-2 max-w-md w-full';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50 space-y-2 max-w-md w-full';
      case 'top-center':
        return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 max-w-md w-full';
      case 'top-right':
      default:
        return 'fixed top-4 right-4 z-50 space-y-2 max-w-md w-full';
    }
  };

  return (
    <div className={getPositionClasses()}>
      {messages.map((message) => (
        <Toast key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
};

// Hook for managing toast notifications
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setMessages(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAll = () => {
    setMessages([]);
  };

  return {
    messages,
    addToast,
    removeToast,
    clearAll
  };
}; 