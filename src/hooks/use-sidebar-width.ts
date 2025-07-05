import { useState, useEffect } from 'react';

export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Get initial width from localStorage
    const savedWidth = localStorage.getItem('sidebar-width');
    return savedWidth ? parseInt(savedWidth, 10) : Math.floor(window.innerWidth * 0.5);
  });
  
  // Initial open state - check both localStorage and DOM
  const [isOpen, setIsOpen] = useState(() => {
    try {
      // Try to detect from DOM first
      const sidebarElement = document.querySelector('[class*="sidebar"]') as HTMLElement;
      if (sidebarElement) {
        return sidebarElement.style.width !== '4rem' && !sidebarElement.classList.contains('w-16');
      }
      
      // Fallback to localStorage width check
      const savedWidth = localStorage.getItem('sidebar-width');
      return savedWidth ? parseInt(savedWidth, 10) > 64 : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // Listen for sidebar width and toggle changes
    const handleSidebarWidthChange = (e: CustomEvent) => {
      setSidebarWidth(e.detail.width);
      setIsOpen(e.detail.isOpen);
    };

    const handleSidebarToggle = (e: CustomEvent) => {
      setIsOpen(e.detail.isOpen);
    };

    window.addEventListener('sidebar-width-change', handleSidebarWidthChange as EventListener);
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);

    return () => {
      window.removeEventListener('sidebar-width-change', handleSidebarWidthChange as EventListener);
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  // Calculate effective sidebar width (collapsed sidebar is 4rem = 64px)
  const effectiveSidebarWidth = isOpen ? sidebarWidth : 64;

  return {
    sidebarWidth: effectiveSidebarWidth,
    isOpen
  };
} 