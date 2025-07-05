import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  Divider,
} from '@heroui/react';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
  mode: 'unlock' | 'create';
  title?: string;
  description?: string;
  onReset?: () => void;
  showReset?: boolean;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  title,
  description,
  onReset,
  showReset = false,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultTitles = {
    unlock: 'Unlock Settings',
    create: 'Create Password',
  };

  const defaultDescriptions = {
    unlock: 'Enter your password to access saved settings',
    create: 'Create a password to protect your API key and settings',
  };

  const handleSubmit = async () => {
    setError('');
    
    if (mode === 'create' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await onSubmit(password);
      if (success) {
        setPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err) {
      setError('Failed to process password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="md"
      backdrop="opaque"
      isDismissable={false}
      hideCloseButton
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{title || defaultTitles[mode]}</h2>
          <p className="text-sm text-default-500">
            {description || defaultDescriptions[mode]}
          </p>
        </ModalHeader>
        
        <ModalBody className="gap-4">
          <p className="text-sm text-default-500 mb-4">
            {mode === 'create' 
              ? 'Create a password to encrypt and save your settings locally.' 
              : 'Enter your password to unlock your encrypted settings.'}
          </p>
          
          {mode === 'unlock' && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg">
              <p className="text-success-700 text-sm">
                💡 Your password will be remembered for 1 hour after successful unlock, 
                automatically unlocking your settings during this period.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'create' ? 'Create a secure password' : 'Enter your password'}
              isRequired
              variant="bordered"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSubmit();
                }
              }}
            />

            {mode === 'create' && (
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                isRequired
                variant="bordered"
                color={password !== confirmPassword ? 'danger' : 'default'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleSubmit();
                  }
                }}
              />
            )}

            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}
          </div>

          {mode === 'create' && (
            <>
              <Divider />
              <Card className="bg-primary-50 border-primary-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600">🔒</span>
                    <div className="flex-1">
                      <p className="text-primary-800 text-sm">
                        <strong>Important:</strong> This password will encrypt your API key and settings. 
                        Make sure to remember it as it cannot be recovered.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
          
          {showReset && onReset && (
            <>
              <Divider />
              <Card className="bg-danger-50 border-danger-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-danger-600">⚠️</span>
                    <div className="flex-1">
                      <p className="text-danger-800 text-sm">
                        <strong>Can't remember your password?</strong> You can reset all your data, 
                        but this will permanently delete your account and all saved settings.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </ModalBody>
        
        <ModalFooter className="gap-2">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button 
                variant="light" 
                onPress={handleClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
              {showReset && onReset && (
                <Button 
                  color="danger" 
                  variant="light"
                  onPress={onReset}
                  isDisabled={isLoading}
                >
                  Reset All Data
                </Button>
              )}
            </div>
            <Button 
              color="primary" 
              onPress={handleSubmit}
              isLoading={isLoading}
              isDisabled={!password || (mode === 'create' && !confirmPassword)}
            >
              {mode === 'unlock' ? 'Unlock' : 'Create Password'}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 