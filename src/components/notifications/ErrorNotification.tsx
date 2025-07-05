import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody, Chip } from '@heroui/react';
import { RiErrorWarningLine, RiInformationLine, RiExternalLinkLine } from 'react-icons/ri';

interface ErrorNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    type: 'connection' | 'auth' | 'network' | 'unknown';
    message: string;
    details?: any;
    closeCode?: number;
  };
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  isOpen, 
  onClose, 
  error 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorInfo = () => {
    switch (error.type) {
      case 'auth':
        return {
          title: 'Authentication Error',
          description: 'There\'s an issue with your API key or authentication.',
          color: 'danger' as const,
          solutions: [
            'Verify your API key is correct and starts with "AIza"',
            'Check if your API key has access to Gemini Live API',
            'Ensure your account has sufficient credits',
            'Try generating a new API key from Google AI Studio'
          ],
          actionText: 'Check API Key Settings',
          actionLink: 'https://ai.google.dev/'
        };
      
      case 'connection':
        return {
          title: 'Connection Error',
          description: 'Failed to establish connection to Google AI API.',
          color: 'warning' as const,
          solutions: [
            'Check your internet connection',
            'Verify firewall settings allow WebSocket connections',
            'Try refreshing the page',
            'Check if Google AI services are experiencing issues'
          ],
          actionText: 'Check Connection',
          actionLink: null
        };
      
      case 'network':
        return {
          title: 'Network Error',
          description: 'Network connectivity issues detected.',
          color: 'warning' as const,
          solutions: [
            'Check your internet connection',
            'Try switching to a different network',
            'Disable VPN if active',
            'Contact your network administrator'
          ],
          actionText: 'Retry Connection',
          actionLink: null
        };
      
      default:
        return {
          title: 'API Error',
          description: 'An unexpected error occurred with the API connection.',
          color: 'danger' as const,
          solutions: [
            'Try refreshing the page',
            'Check the browser console for more details',
            'Verify your API key is valid',
            'Contact support if the issue persists'
          ],
          actionText: 'View Documentation',
          actionLink: 'https://ai.google.dev/docs'
        };
    }
  };

  const getCloseCodeInfo = (code: number) => {
    const closeCodes: { [key: number]: { meaning: string; likely_cause: string } } = {
      1000: { meaning: 'Normal closure', likely_cause: 'Connection closed normally' },
      1001: { meaning: 'Going away', likely_cause: 'Server is shutting down' },
      1002: { meaning: 'Protocol error', likely_cause: 'Invalid data sent to server' },
      1003: { meaning: 'Unsupported data', likely_cause: 'Server cannot process the data format' },
      1006: { meaning: 'Abnormal closure', likely_cause: 'Connection lost unexpectedly' },
      1007: { meaning: 'Invalid frame payload', likely_cause: 'Data format is incorrect' },
      1008: { meaning: 'Policy violation', likely_cause: 'API key invalid or access denied' },
      1009: { meaning: 'Message too big', likely_cause: 'Sent data exceeds size limit' },
      1011: { meaning: 'Internal server error', likely_cause: 'Server encountered an error' },
      1012: { meaning: 'Service restart', likely_cause: 'Server is restarting' },
      1014: { meaning: 'Bad gateway', likely_cause: 'Server connectivity issue' },
      1015: { meaning: 'TLS handshake', likely_cause: 'SSL/TLS connection failed' }
    };

    return closeCodes[code] || { meaning: 'Unknown error', likely_cause: 'Unexpected error code' };
  };

  const errorInfo = getErrorInfo();
  const closeCodeInfo = error.closeCode ? getCloseCodeInfo(error.closeCode) : null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      placement="center"
      backdrop="blur"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <RiErrorWarningLine 
            size={24} 
            className={`text-${errorInfo.color}`} 
          />
          <span>{errorInfo.title}</span>
        </ModalHeader>
        
        <ModalBody className="space-y-4">
          {/* Error Description */}
          <div className={`p-4 bg-${errorInfo.color}-50 border border-${errorInfo.color}-200 rounded-lg`}>
            <p className={`text-${errorInfo.color}-800 font-medium`}>
              {errorInfo.description}
            </p>
            <p className={`text-${errorInfo.color}-700 text-sm mt-2`}>
              {error.message}
            </p>
          </div>

          {/* WebSocket Close Code Information */}
          {closeCodeInfo && (
            <Card className="bg-default-50">
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <RiInformationLine size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">
                      WebSocket Close Code: {error.closeCode}
                    </p>
                    <p className="text-sm text-default-600 mt-1">
                      <strong>Meaning:</strong> {closeCodeInfo.meaning}
                    </p>
                    <p className="text-sm text-default-600">
                      <strong>Likely Cause:</strong> {closeCodeInfo.likely_cause}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Solutions */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">How to Fix:</h4>
            <div className="space-y-2">
              {errorInfo.solutions.map((solution, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Chip size="sm" variant="flat" color="primary">
                    {index + 1}
                  </Chip>
                  <span className="text-sm text-default-600">{solution}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details Toggle */}
          {error.details && (
            <div className="space-y-2">
              <Button
                variant="light"
                size="sm"
                onPress={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
              
              {showDetails && (
                <Card className="bg-default-100">
                  <CardBody>
                    <pre className="text-xs overflow-auto max-h-32 text-default-700">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </ModalBody>
        
        <ModalFooter className="justify-between">
          <div className="flex gap-2">
            {errorInfo.actionLink && (
              <Button
                variant="light"
                color="primary"
                size="sm"
                startContent={<RiExternalLinkLine size={16} />}
                onPress={() => window.open(errorInfo.actionLink!, '_blank')}
              >
                {errorInfo.actionText}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="light"
              onPress={onClose}
            >
              Close
            </Button>
            <Button
              color="primary"
              onPress={() => {
                onClose();
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 