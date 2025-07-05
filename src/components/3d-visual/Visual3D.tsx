import React, { useEffect, useRef } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { audioContext } from '../../lib/utils';
import './visual-3d-lightweight';

interface Visual3DElement extends HTMLElement {
  inputNode?: AudioNode;
  outputNode?: AudioNode;
}

interface Visual3DProps {
  opacity?: number;
  blur?: boolean;
}

const Visual3D: React.FC<Visual3DProps> = ({ opacity = 0.3, blur = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<any>(null);
  const { audioStreamer } = useLiveAPIContext();
  const audioStreamRef = useRef<any>(null);
  const performanceRef = useRef({ lastFpsCheck: Date.now(), frames: 0 });

  // Log when props change
  useEffect(() => {
    console.log(`Visual3D props changed - opacity: ${opacity}, blur: ${blur}`);
  }, [opacity, blur]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Visual3D unmounting, cleaning up...');
      // Clean up audio connections
      if (audioStreamRef.current?.analyserNode && audioStreamer) {
        try {
          audioStreamer.gainNode.disconnect(audioStreamRef.current.analyserNode);
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      // Clean up visual element
      if (visualRef.current?.element?.parentNode) {
        visualRef.current.element.parentNode.removeChild(visualRef.current.element);
      }
    };
  }, [audioStreamer]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | null = null;

    // Initialize the 3D visualization
    const initVisualization = async () => {
      try {
        // Get the shared audio context used by the AudioStreamer
        const audioCtx = await audioContext({ id: "audio-out" });
        
        // Create the lightweight 3D visual element
        const visualElement = document.createElement('gdm-live-audio-visuals-3d-lightweight') as Visual3DElement;
        
        // Create audio nodes for input and output analysis
        const inputNode = audioCtx.createGain();
        const outputNode = audioCtx.createGain();
        
        // Create analysers for the 3D visualization
        const analyserInput = audioCtx.createAnalyser();
        const analyserOutput = audioCtx.createAnalyser();
        
        analyserInput.fftSize = 256;
        analyserOutput.fftSize = 256;
        analyserInput.smoothingTimeConstant = 0.8;
        analyserOutput.smoothingTimeConstant = 0.8;
        
        inputNode.connect(analyserInput);
        outputNode.connect(analyserOutput);
        
        // Set the audio nodes on the visual element
        visualElement.inputNode = inputNode;
        visualElement.outputNode = outputNode;
        
        // Store reference for cleanup
        visualRef.current = {
          element: visualElement,
          audioContext: audioCtx,
          inputNode,
          outputNode,
          analyserInput,
          analyserOutput
        };
        
        // Add to DOM
        containerRef.current?.appendChild(visualElement);
        
        // Setup cleanup
        cleanup = () => {
          if (visualRef.current?.element.parentNode) {
            visualRef.current.element.parentNode.removeChild(visualRef.current.element);
          }
          visualRef.current = null;
        };

        // Performance monitoring
        const monitorPerformance = () => {
          performanceRef.current.frames++;
          const now = Date.now();
          if (now - performanceRef.current.lastFpsCheck > 5000) { // Check every 5 seconds
            const fps = performanceRef.current.frames / 5;
            if (fps < 20) {
              console.warn('3D Visualization FPS is low:', fps, 'Consider reducing quality');
            }
            performanceRef.current.frames = 0;
            performanceRef.current.lastFpsCheck = now;
          }
        };
        
        // Add performance monitoring
        visualRef.current.monitorPerformance = monitorPerformance;
        
      } catch (error) {
        console.error('Error initializing 3D visualization:', error);
      }
    };

    initVisualization();

    return cleanup || (() => {});
  }, []);

  // Connect to the existing AudioStreamer for output audio analysis
  useEffect(() => {
    if (!visualRef.current?.audioContext || !audioStreamer) return;

    const connectToAudioStream = async () => {
      try {
        // Connect to the AudioStreamer's gainNode to analyze the output audio
        const analyserNode = visualRef.current.audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        
        // Connect the AudioStreamer's gainNode to our analyser
        audioStreamer.gainNode.connect(analyserNode);
        
        // Also connect to the 3D visualization's output node
        if (visualRef.current?.outputNode) {
          audioStreamer.gainNode.connect(visualRef.current.outputNode);
          visualRef.current.analyserOutput = analyserNode;
        }
        
        audioStreamRef.current = { analyserNode };
        
        console.log('3D visualization connected to audio stream');
        
      } catch (error) {
        console.error('Error connecting to audio stream:', error);
      }
    };

    connectToAudioStream();

    return () => {
      if (audioStreamRef.current?.analyserNode && audioStreamer) {
        try {
          audioStreamer.gainNode.disconnect(audioStreamRef.current.analyserNode);
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    };
  }, [visualRef.current?.audioContext, audioStreamer]);

  // Handle microphone input for input visualization
  useEffect(() => {
    if (!visualRef.current) return;

    let mediaStream: MediaStream | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;

    const setupMicrophoneInput = async () => {
      try {
        // Request microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (visualRef.current?.audioContext && visualRef.current?.inputNode) {
          sourceNode = visualRef.current.audioContext.createMediaStreamSource(mediaStream);
          if (sourceNode) {
            sourceNode.connect(visualRef.current.inputNode);
          }
        }
      } catch (error) {
        console.log('Microphone access denied or not available for 3D visualization');
      }
    };

    setupMicrophoneInput();

    return () => {
      if (sourceNode) {
        sourceNode.disconnect();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: opacity,
        filter: blur ? 'blur(0.5px)' : 'none', // Reduced blur for better performance
        background: 'radial-gradient(circle at center, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%)'
      }}
    />
  );
};

export default Visual3D; 