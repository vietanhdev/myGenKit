import React from 'react';
import { Button, useDisclosure } from '@heroui/react';
import { UserSettingsDialogFull } from './UserSettingsDialogFull';

interface UserSettingsButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'light' | 'bordered' | 'flat' | 'faded' | 'shadow' | 'ghost';
}

export const UserSettingsButton: React.FC<UserSettingsButtonProps> = ({
  className = "hover:bg-default-100",
  size = "sm",
  variant = "light"
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        isIconOnly
        variant={variant}
        onPress={onOpen}
        className={className}
        size={size}
        aria-label="Open settings"
      >
        <span className="material-symbols-outlined">settings</span>
      </Button>
      
      <UserSettingsDialogFull
        isOpen={isOpen}
        onClose={onClose}
        forceApiKey={false}
      />
    </>
  );
}; 