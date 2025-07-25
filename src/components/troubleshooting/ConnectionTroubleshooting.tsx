import React from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { RiErrorWarningLine, RiInformationLine } from 'react-icons/ri';

interface ConnectionTroubleshootingProps {
  className?: string;
}

export const ConnectionTroubleshooting: React.FC<ConnectionTroubleshootingProps> = ({ className = '' }) => {
  return (
    <Card className={`max-w-2xl ${className}`}>
      <CardBody className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <RiErrorWarningLine size={24} className="text-warning" />
          <h3 className="text-xl font-semibold">Connection Troubleshooting</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-primary flex items-center gap-2">
              <RiInformationLine size={16} />
              Common Connection Issues:
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Chip size="sm" color="danger" variant="flat">1</Chip>
                <div>
                  <strong>Invalid API Key:</strong> Make sure your Google AI API key is correct and starts with "AIza"
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Chip size="sm" color="danger" variant="flat">2</Chip>
                <div>
                  <strong>API Access:</strong> Ensure your API key has access to the Gemini Live API (may require allowlist)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Chip size="sm" color="danger" variant="flat">3</Chip>
                <div>
                  <strong>Network Issues:</strong> Check your internet connection and firewall settings
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Chip size="sm" color="danger" variant="flat">4</Chip>
                <div>
                  <strong>Browser Compatibility:</strong> Ensure you're using a modern browser with WebSocket support
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-default-100 border border-default-200 rounded-lg">
            <p className="text-sm text-default-600">
              <strong>Still having issues?</strong> Check the browser console (F12 → Console) for detailed error messages 
              including WebSocket close codes and connection details.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}; 