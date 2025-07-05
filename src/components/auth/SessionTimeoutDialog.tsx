import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Progress
} from '@heroui/react';
import { useUserSession } from '../../hooks/use-user-session';

interface SessionTimeoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  remainingTime: number;
}

export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  isOpen,
  onClose,
  onLogout,
  remainingTime
}) => {
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    setTimeLeft(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressValue = Math.max(0, (timeLeft / remainingTime) * 100);

  return (
    <Modal 
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      backdrop="blur"
      isDismissable={false}
      hideCloseButton={false}
      classNames={{
        backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/50 backdrop-opacity-75"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">⏰</span>
            <h2 className="text-xl font-bold">Session Expiring</h2>
          </div>
        </ModalHeader>
        
        <ModalBody className="text-center space-y-4">
          <p className="text-default-600">
            Your session will expire in:
          </p>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-warning-500">
              {formatTime(timeLeft)}
            </div>
            
            <Progress 
              value={progressValue} 
              color="warning" 
              size="sm"
              className="max-w-md mx-auto"
            />
          </div>
          
          <p className="text-sm text-default-500">
            Click "Stay Active" to extend your session, or "Logout" to end it now.
          </p>
        </ModalBody>
        
        <ModalFooter className="flex justify-center gap-2">
          <Button 
            color="danger" 
            variant="light"
            onPress={onLogout}
          >
            Logout
          </Button>
          <Button 
            color="warning" 
            onPress={onClose}
          >
            Stay Active
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 