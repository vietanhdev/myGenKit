import React, { useEffect, useRef, useState } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import './visual-3d.ts';
import { GdmLiveAudioVisuals3D } from './visual-3d';

const FullVisual3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<GdmLiveAudioVisuals3D | null>(null);
  const { audioStreamer } = useLiveAPIContext();
  
  // State to track square size for 1:1 aspect ratio that covers the parent
  const [squareSize, setSquareSize] = useState(0);

  // Monitor parent container size and calculate square size to cover the parent
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSquareSize = () => {
      const parentElement = containerRef.current?.parentElement;
      if (!parentElement) return;
      
      const parentRect = parentElement.getBoundingClientRect();
      const parentWidth = parentRect.width;
      const parentHeight = parentRect.height;
      
      // Use the larger dimension to ensure the square covers the entire parent area
      const newSquareSize = Math.max(parentWidth, parentHeight);
      setSquareSize(newSquareSize);
    };
    
    // Initial size calculation
    updateSquareSize();
    
    // Create ResizeObserver to monitor parent size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSquareSize();
    });
    
    // Observe the parent container
    const parentElement = containerRef.current?.parentElement;
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }
    
    // Listen for window resize as well
    window.addEventListener('resize', updateSquareSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSquareSize);
    };
  }, []);

  // Initialize the full 3D visualization
  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | null = null;

    const initVisualization = async () => {
      try {
        // Create the full 3D visual element
        const visualElement = document.createElement('gdm-live-audio-visuals-3d') as GdmLiveAudioVisuals3D;
        
        // Store reference for cleanup
        visualRef.current = visualElement;
        
        // Make the visual element a square that covers the container
        visualElement.style.width = `${squareSize}px`;
        visualElement.style.height = `${squareSize}px`;
        visualElement.style.position = 'absolute';
        visualElement.style.top = '50%';
        visualElement.style.left = '50%';
        visualElement.style.transform = 'translate(-50%, -50%)';
        
        // Add to DOM
        containerRef.current?.appendChild(visualElement);
        
        // Setup cleanup
        cleanup = () => {
          if (visualRef.current?.parentNode) {
            visualRef.current.parentNode.removeChild(visualRef.current);
          }
          visualRef.current = null;
        };

        // Setup resize handling for sidebar changes
        const handleResize = () => {
          // Trigger resize event for the 3D visualization
          window.dispatchEvent(new Event('resize'));
        };

        // Listen for sidebar changes
        window.addEventListener('sidebar-width-change', handleResize);
        window.addEventListener('sidebar-toggle', handleResize);
        
        // Add ResizeObserver to monitor container size changes
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.target === containerRef.current) {
              handleResize();
            }
          }
        });
        
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        console.log('Full 3D visualization initialized');
        
        // Cleanup listeners
        const originalCleanup = cleanup;
        cleanup = () => {
          window.removeEventListener('sidebar-width-change', handleResize);
          window.removeEventListener('sidebar-toggle', handleResize);
          resizeObserver.disconnect();
          if (originalCleanup) originalCleanup();
        };
        
      } catch (error) {
        console.error('Error initializing full 3D visualization:', error);
      }
    };

    initVisualization();

    return cleanup || (() => {});
  }, [squareSize]);

  // Update visual element size when square size changes
  useEffect(() => {
    if (visualRef.current && squareSize > 0) {
      visualRef.current.style.width = `${squareSize}px`;
      visualRef.current.style.height = `${squareSize}px`;
    }
  }, [squareSize]);

  // Connect to the existing AudioStreamer
  useEffect(() => {
    if (!visualRef.current || !audioStreamer) return;

    const connectToAudioStream = async () => {
      try {
        // Create audio context and nodes for the visualization
        const audioCtx = audioStreamer.context;
        
        // Create input and output nodes
        const inputNode = audioCtx.createGain();
        const outputNode = audioCtx.createGain();
        
        // Connect the AudioStreamer's gainNode to our output node
        audioStreamer.gainNode.connect(outputNode);
        
        // Set the audio nodes on the visual element
        if (visualRef.current) {
          visualRef.current.inputNode = inputNode;
          visualRef.current.outputNode = outputNode;
        }
        
        console.log('Full 3D visualization connected to audio stream');
        
      } catch (error) {
        console.error('Error connecting full 3D visualization to audio stream:', error);
      }
    };

    const handleGainNodeRecreated = (newGainNode: GainNode) => {
      console.log('Full 3D visualization reconnecting to new gainNode');
      
      // Reconnect to the new gainNode
      connectToAudioStream();
    };

    // Listen for gainNode recreation events
    audioStreamer.on('gainNodeRecreated', handleGainNodeRecreated);

    connectToAudioStream();

    return () => {
      audioStreamer.off('gainNodeRecreated', handleGainNodeRecreated);
      
      // Cleanup audio connections
      if (visualRef.current) {
        try {
          if (visualRef.current.outputNode && audioStreamer) {
            audioStreamer.gainNode.disconnect(visualRef.current.outputNode);
          }
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    };
  }, [audioStreamer]);

  // Handle microphone input
  useEffect(() => {
    if (!visualRef.current || !audioStreamer) return;

    let mediaStream: MediaStream | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;

    const setupMicrophoneInput = async () => {
      try {
        // Clean up existing connection
        if (sourceNode) {
          sourceNode.disconnect();
          sourceNode = null;
        }
        
        // Request microphone access if we don't have a stream yet
        if (!mediaStream) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        if (visualRef.current?.inputNode && audioStreamer && mediaStream) {
          sourceNode = audioStreamer.context.createMediaStreamSource(mediaStream);
          if (sourceNode && visualRef.current.inputNode) {
            sourceNode.connect(visualRef.current.inputNode);
            console.log('Microphone connected to full 3D visualization');
          }
        }
      } catch (error) {
        console.log('Microphone access denied or not available for full 3D visualization');
      }
    };

    const handleGainNodeRecreated = (newGainNode: GainNode) => {
      console.log('Full 3D visualization reconnecting microphone to new gainNode');
      
      // Reconnect microphone
      setupMicrophoneInput();
    };

    // Listen for gainNode recreation events
    audioStreamer.on('gainNodeRecreated', handleGainNodeRecreated);

    setupMicrophoneInput();

    return () => {
      audioStreamer.off('gainNodeRecreated', handleGainNodeRecreated);
      
      if (sourceNode) {
        sourceNode.disconnect();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStreamer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('FullVisual3D unmounting, cleaning up...');
      if (visualRef.current?.parentNode) {
        visualRef.current.parentNode.removeChild(visualRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, rgba(16, 12, 20, 0.9) 0%, rgba(16, 12, 20, 0.95) 100%)',
        overflow: 'hidden'
      }}
    />
  );
};

export default FullVisual3D;