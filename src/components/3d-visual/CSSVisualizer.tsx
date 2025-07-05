import React, { useEffect, useRef } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import './css-visualizer.scss';

interface CSSVisualizerProps {
  opacity?: number;
}

const CSSVisualizer: React.FC<CSSVisualizerProps> = ({ opacity = 0.2 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);
  const { audioStreamer } = useLiveAPIContext();
  const animationRef = useRef<number>();

  // Log when opacity changes
  useEffect(() => {
    console.log(`CSS Visualizer opacity changed to: ${opacity}`);
  }, [opacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('CSS Visualizer unmounting, cleaning up...');
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
    const analyser = audioStreamer.context.createAnalyser();
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connect to audio stream
    audioStreamer.gainNode.connect(analyser);

    const animate = () => {
      if (!isActive) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Update bars based on frequency data
      barsRef.current.forEach((bar, index) => {
        const dataIndex = Math.floor((index / barsRef.current.length) * bufferLength);
        const value = dataArray[dataIndex] || 0;
        const height = Math.max(2, (value / 255) * 100);
        bar.style.height = `${height}%`;
        bar.style.opacity = `${0.3 + (value / 255) * 0.7}`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isActive = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try {
        audioStreamer.gainNode.disconnect(analyser);
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
        opacity: opacity,
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