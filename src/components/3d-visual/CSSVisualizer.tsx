import React, { useEffect, useRef } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import './css-visualizer.scss';

const CSSVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);
  const { audioStreamer } = useLiveAPIContext();
  const animationRef = useRef<number>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create visual bars
    const bars: HTMLDivElement[] = [];
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement('div');
      bar.className = 'css-visualizer-bar';
      bar.style.left = `${(i / 20) * 100}%`;
      bar.style.backgroundColor = `hsl(${i * 18}, 70%, 50%)`;
      containerRef.current.appendChild(bar);
      bars.push(bar);
    }
    barsRef.current = bars;

    return () => {
      bars.forEach(bar => bar.remove());
      barsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!audioStreamer || barsRef.current.length === 0) return;

    let isActive = true;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;

    const connectToAudioStream = () => {
      try {
        analyser = audioStreamer.context.createAnalyser();
        analyser.fftSize = 64;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Connect to audio stream
        audioStreamer.gainNode.connect(analyser);
      } catch (error) {
        console.error('Error connecting CSS visualizer to audio stream:', error);
      }
    };

    const handleGainNodeRecreated = (newGainNode: GainNode) => {
      // Reconnect to the new gainNode
      connectToAudioStream();
    };

    const animate = () => {
      if (!isActive || !analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Update bars based on frequency data
      barsRef.current.forEach((bar, index) => {
        const dataIndex = Math.floor((index / barsRef.current.length) * dataArray.length);
        const value = dataArray[dataIndex] || 0;
        const height = Math.max(2, (value / 255) * 100);
        bar.style.height = `${height}%`;
        bar.style.opacity = `${0.3 + (value / 255) * 0.7}`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Listen for gainNode recreation events
    audioStreamer.on('gainNodeRecreated', handleGainNodeRecreated);

    connectToAudioStream();
    animate();

    return () => {
      isActive = false;
      audioStreamer.off('gainNodeRecreated', handleGainNodeRecreated);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try {
        if (analyser) {
          audioStreamer.gainNode.disconnect(analyser);
        }
      } catch (e) {
        // Ignore disconnect errors
      }
    };
  }, [audioStreamer]);

  return (
    <div 
      ref={containerRef}
      className="css-visualizer-container"
      style={{
        opacity: 0.3,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, rgba(5, 5, 5, 0.9) 0%, rgba(5, 5, 5, 0.95) 100%)'
      }}
    />
  );
};

export default CSSVisualizer; 