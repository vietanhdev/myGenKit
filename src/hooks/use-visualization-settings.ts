import { useState, useEffect, useCallback } from 'react';
import { VisualizationConfig } from '../components/settings-dialog/VisualizationSettings';

const STORAGE_KEY = 'mygenkit-visualization-settings';

const defaultConfig: VisualizationConfig = {
  type: '3d-sphere'
};

export function useVisualizationSettings() {
  const [config, setConfig] = useState<VisualizationConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        
        // Migration: Handle deprecated and renamed visualization types
        if (parsedConfig.type === '3d-full') {
          // Migrate '3d-full' to '3d-sphere'
          const migratedConfig = { type: '3d-sphere' as const };
          setConfig(migratedConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
        } else if (parsedConfig.type === 'jarvis' || parsedConfig.type === '3d-light') {
          // Migrate deprecated types to 3DSphere (default)
          const migratedConfig = { type: '3d-sphere' as const };
          setConfig(migratedConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
        } else if (parsedConfig.enabled === false) {
          // Migrate old enabled=false to type='none'
          const migratedConfig = { type: 'none' as const };
          setConfig(migratedConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
        } else if (parsedConfig.type === 'css' || parsedConfig.type === '3d-sphere' || parsedConfig.type === 'none') {
          // Valid type, use it
          const validConfig = { type: parsedConfig.type };
          setConfig(validConfig);
        } else {
          // Unknown type, use defaults (3DSphere)
          setConfig(defaultConfig);
        }
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.warn('Failed to load visualization settings:', error);
      // Keep default config
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever config changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save visualization settings:', error);
    }
  }, [config, isLoaded]);

  const updateConfig = useCallback((newConfig: VisualizationConfig) => {
    setConfig(newConfig);
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return {
    config,
    updateConfig,
    resetToDefaults,
    isLoaded
  };
} 