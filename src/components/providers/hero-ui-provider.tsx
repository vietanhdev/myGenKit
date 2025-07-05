import React, { useEffect } from 'react';
import { HeroUIProvider } from '@heroui/react';

interface HeroUIProviderWrapperProps {
  children: React.ReactNode;
}

export const HeroUIProviderWrapper: React.FC<HeroUIProviderWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Set dark theme as default
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  );
}; 