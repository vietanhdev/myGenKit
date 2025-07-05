import React, { useRef, useState, useEffect } from 'react';
import { UserAPIProvider } from '../components/providers/user-api-provider';
import SidePanel from '../components/side-panel/SidePanel';
import { Altair } from '../components/altair/Altair';
import ControlTray from '../components/control-tray/ControlTray';
import BackgroundVisual3D from '../components/3d-visual/BackgroundVisual3D';
import { useVisualizationSettings } from '../hooks/use-visualization-settings';
import { ConnectionTroubleshooting } from '../components/troubleshooting/ConnectionTroubleshooting';
import { ErrorNotification } from '../components/notifications/ErrorNotification';
import { ToastContainer, useToast } from '../components/notifications/Toast';
import { ConnectionStatus } from '../components/status/ConnectionStatus';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { Button } from '@heroui/react';
import { RiCloseLine } from 'react-icons/ri';
import cn from 'classnames';

const MainAppContent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [errorNotification, setErrorNotification] = useState<{
    isOpen: boolean;
    error: {
      type: 'connection' | 'auth' | 'network' | 'unknown';
      message: string;
      details?: any;
      closeCode?: number;
    };
  }>({
    isOpen: false,
    error: { type: 'unknown', message: '' }
  });
  const { config: visualizationConfig, isLoaded } = useVisualizationSettings();
  const { client, connected } = useLiveAPIContext();
  const { messages: toastMessages, addToast, removeToast } = useToast();

  // Classify error type based on error details and close codes
  const classifyError = (error: any, closeCode?: number) => {
    // Check for authentication errors
    if (error?.message?.includes('auth') || 
        error?.message?.includes('unauthorized') ||
        error?.message?.includes('invalid') ||
        closeCode === 1008) {
      return 'auth';
    }
    
    // Check for network errors
    if (error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        closeCode === 1006 ||
        closeCode === 1014 ||
        closeCode === 1015) {
      return 'network';
    }
    
    // Check for connection errors
    if (error?.message?.includes('connect') ||
        error?.message?.includes('websocket') ||
        closeCode === 1002 ||
        closeCode === 1003 ||
        closeCode === 1011) {
      return 'connection';
    }
    
    return 'unknown';
  };

  // Track connection failures and show error notifications
  useEffect(() => {
    const handleError = (errorEvent: ErrorEvent) => {
      setConnectionAttempts(prev => prev + 1);
      
      // For critical errors, show modal
      const errorType = classifyError(errorEvent);
      if (errorType === 'auth' || errorType === 'connection') {
        setErrorNotification({
          isOpen: true,
          error: {
            type: errorType,
            message: errorEvent.message || 'An unexpected error occurred',
            details: {
              type: errorEvent.type,
              filename: errorEvent.filename,
              lineno: errorEvent.lineno,
              colno: errorEvent.colno,
              timestamp: new Date().toISOString()
            }
          }
        });
      } else {
        // For less critical errors, show toast
        addToast({
          type: 'error',
          title: 'Connection Issue',
          message: errorEvent.message || 'A connection error occurred',
          duration: 7000
        });
      }
    };

    const handleClose = (closeEvent: CloseEvent) => {
      setConnectionAttempts(prev => prev + 1);
      
      // Only show notifications for non-normal closures
      if (closeEvent.code !== 1000 && closeEvent.code !== 1001) {
        const errorType = classifyError(closeEvent, closeEvent.code);
        
        // For critical errors (auth, connection), show modal
        if (errorType === 'auth' || (errorType === 'connection' && closeEvent.code === 1008)) {
          setErrorNotification({
            isOpen: true,
            error: {
              type: errorType,
              message: closeEvent.reason || `Connection closed unexpectedly (Code: ${closeEvent.code})`,
              details: {
                code: closeEvent.code,
                reason: closeEvent.reason,
                wasClean: closeEvent.wasClean,
                timestamp: new Date().toISOString()
              },
              closeCode: closeEvent.code
            }
          });
        } else {
          // For less critical errors, show toast
          addToast({
            type: 'warning',
            title: 'Connection Lost',
            message: closeEvent.reason || `Connection closed (Code: ${closeEvent.code})`,
            duration: 5000
          });
        }
      }
    };

    const handleOpen = () => {
      setConnectionAttempts(0);
      setShowTroubleshooting(false);
      setErrorNotification(prev => ({ ...prev, isOpen: false }));
      
      // Show success toast when connected
      addToast({
        type: 'success',
        title: 'Connected Successfully',
        message: 'Connected to Google AI Live API',
        duration: 3000
      });
    };

    client.on('error', handleError);
    client.on('close', handleClose);
    client.on('open', handleOpen);

    return () => {
      client.off('error', handleError);
      client.off('close', handleClose);
      client.off('open', handleOpen);
    };
  }, [client, addToast]);

  // Show troubleshooting after 2 failed connection attempts
  useEffect(() => {
    if (connectionAttempts >= 2 && !connected) {
      setShowTroubleshooting(true);
    }
  }, [connectionAttempts, connected]);

  // Note: API key change notifications are handled in UserAPIProvider

  return (
    <>
      {/* Background Audio Visualization */}
      {isLoaded && <BackgroundVisual3D config={visualizationConfig} />}
      
      {/* Connection Status - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-40">
        <ConnectionStatus />
      </div>
      
      <div className="app-container">
        <div className="bg-background">
          <SidePanel />
        </div>
        <main>
          <div className="main-app-area">
            <Altair />
            <video
              className={cn("stream", {
                hidden: !videoRef.current || !videoStream,
              })}
              ref={videoRef}
              autoPlay
              playsInline
            />

            {/* Connection Troubleshooting Overlay */}
            {showTroubleshooting && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="relative">
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => setShowTroubleshooting(false)}
                    className="absolute -top-2 -right-2 z-10 bg-background"
                    size="sm"
                  >
                    <RiCloseLine size={18} />
                  </Button>
                  <ConnectionTroubleshooting />
                </div>
              </div>
            )}
            
            {/* Error Notification Modal */}
            <ErrorNotification
              isOpen={errorNotification.isOpen}
              onClose={() => setErrorNotification(prev => ({ ...prev, isOpen: false }))}
              error={errorNotification.error}
            />
            
            {/* Toast Notifications for connection issues - positioned at top-right */}
            <ToastContainer 
              messages={toastMessages}
              onClose={removeToast}
              position="top-right"
            />
          </div>

          <ControlTray
            videoRef={videoRef}
            supportsVideo={true}
            onVideoStreamChange={setVideoStream}
            enableEditingSettings={true}
          >
            {/* put your own buttons here */}
          </ControlTray>
        </main>
      </div>
    </>
  );
};

export const MainApp: React.FC = () => {
  return (
    <UserAPIProvider>
      <MainAppContent />
    </UserAPIProvider>
  );
}; 