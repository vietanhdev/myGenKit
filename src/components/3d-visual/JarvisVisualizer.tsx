import React, { useEffect, useRef, useCallback } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import './jarvis-visualizer.scss';

interface JarvisVisualizerProps {
  opacity?: number;
  intensity?: 'low' | 'medium' | 'high';
  color?: 'blue' | 'cyan' | 'green' | 'purple' | 'gold';
}

const JarvisVisualizer: React.FC<JarvisVisualizerProps> = ({ 
  opacity = 0.7, 
  intensity = 'medium',
  color = 'blue'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { audioStreamer } = useLiveAPIContext();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

  // Color schemes for different JARVIS modes - brighter and more vibrant
  const colorSchemes = {
    blue: { primary: '#00d4ff', secondary: '#0099ff', accent: '#66e6ff' },
    cyan: { primary: '#00ffff', secondary: '#33cccc', accent: '#ccffff' },
    green: { primary: '#00ff55', secondary: '#44ff44', accent: '#aaffaa' },
    purple: { primary: '#aa44ff', secondary: '#bb55ff', accent: '#ddaaff' },
    gold: { primary: '#ffdd00', secondary: '#ffcc33', accent: '#ffeeaa' }
  };

  const currentScheme = colorSchemes[color];

  // Update visualization when color scheme changes
  useEffect(() => {
    // Force a visual update when color changes
    console.log(`JARVIS color scheme changed to: ${color}`);
  }, [color]);

  // Update visualization when intensity changes
  useEffect(() => {
    console.log(`JARVIS intensity changed to: ${intensity}`);
  }, [intensity]);

  // Setup audio analyzer
  useEffect(() => {
    if (!audioStreamer) return;

    const analyser = audioStreamer.context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    try {
      audioStreamer.gainNode.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch (error) {
      console.warn('Could not connect audio analyzer:', error);
    }

    return () => {
      try {
        if (analyserRef.current) {
          audioStreamer.gainNode.disconnect(analyserRef.current);
        }
      } catch (error) {
        // Ignore disconnect errors
      }
    };
  }, [audioStreamer]);

  // Draw JARVIS-style circular elements
  const drawCircularArcs = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, audioData: Uint8Array, time: number) => {
    const segments = 32;
    const segmentAngle = (Math.PI * 2) / segments;
    
          for (let i = 0; i < segments; i++) {
        const dataIndex = Math.floor((i / segments) * audioData.length);
        // More stable light - base at 70%, only vary 20-30%
        const baseLevel = 0.7;
        const audioInfluence = (audioData[dataIndex] / 255) * 0.3; // Max 30% variation
        const amplitude = Math.min(1.0, baseLevel + audioInfluence);
        const angle = i * segmentAngle;
        
        // Outer arc - brighter and more stable
        const outerRadius = radius + amplitude * 25; // Reduced radius variation
        const startAngle = angle - segmentAngle * 0.4;
        const endAngle = angle + segmentAngle * 0.4;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        // Much brighter with higher minimum opacity
        const primaryOpacity = Math.floor((0.8 + amplitude * 0.2) * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = `${currentScheme.primary}${primaryOpacity}`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner pulsing arcs - brighter and more stable
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 20, startAngle, endAngle);
        const accentOpacity = Math.floor((0.6 + amplitude * 0.4) * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = `${currentScheme.accent}${accentOpacity}`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
  }, [currentScheme]);

  // Draw data streams
  const drawDataStreams = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, audioData: Uint8Array, time: number) => {
    const streams = 6;
          for (let i = 0; i < streams; i++) {
        const x = (i / streams) * width;
        const dataIndex = Math.floor((i / streams) * audioData.length);
        // More stable data streams - base at 65%, only vary 25%
        const baseLevel = 0.65;
        const audioInfluence = (audioData[dataIndex] / 255) * 0.25; // Max 25% variation
        const amplitude = Math.min(1.0, baseLevel + audioInfluence);
        
        // Vertical data streams - brighter and more stable
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - amplitude * height * 0.75); // Slightly reduced height variation
        const streamOpacity = Math.floor((0.7 + amplitude * 0.3) * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = `${currentScheme.secondary}${streamOpacity}`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Flowing particles - brighter and more consistent
        const particleY = height - (time * 0.08 + i * 100) % height; // Slightly slower flow
        ctx.beginPath();
        ctx.arc(x, particleY, 2, 0, Math.PI * 2);
        const particleOpacity = Math.floor((0.75 + amplitude * 0.25) * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = `${currentScheme.accent}${particleOpacity}`;
        ctx.fill();
      }
  }, [currentScheme]);

  // Draw HUD elements
  const drawHUDElements = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, audioData: Uint8Array, time: number) => {
    // Corner brackets
    const cornerSize = 30;
    ctx.strokeStyle = `${currentScheme.primary}80`;
    ctx.lineWidth = 2;
    
    // Top-left
    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize);
    ctx.lineTo(20, 20);
    ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, 20);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 20, 20 + cornerSize);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(20, height - 20 - cornerSize);
    ctx.lineTo(20, height - 20);
    ctx.lineTo(20 + cornerSize, height - 20);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(width - 20, height - 20 - cornerSize);
    ctx.stroke();
    
    // Center scanner line
    const scannerY = (Math.sin(time * 0.005) * 0.5 + 0.5) * height;
    ctx.beginPath();
    ctx.moveTo(0, scannerY);
    ctx.lineTo(width, scannerY);
    ctx.strokeStyle = `${currentScheme.accent}30`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [currentScheme]);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create baseline audio data if no audio analyzer available
    const mockAudioData = new Uint8Array(128);
    for (let i = 0; i < mockAudioData.length; i++) {
      // Generate stable baseline activity with minimal variation
      mockAudioData[i] = Math.floor(180 + Math.sin(Date.now() * 0.0005 + i * 0.05) * 15);
    }

    // Get audio data or use baseline
    const audioData = analyserRef.current && dataArrayRef.current ? 
      (() => {
        analyserRef.current!.getByteFrequencyData(dataArrayRef.current!);
        return dataArrayRef.current!;
      })() : 
      mockAudioData;
    
    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now();
    
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Apply stronger glow effect for brighter appearance
    ctx.shadowColor = currentScheme.primary;
    ctx.shadowBlur = 15;
    
    // Draw main circular visualizer
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.15;
    
    drawCircularArcs(ctx, centerX, centerY, baseRadius, audioData, time);
    
    // Draw secondary arcs
    if (intensity !== 'low') {
      drawCircularArcs(ctx, centerX, centerY, baseRadius * 1.5, audioData, time);
    }
    
    if (intensity === 'high') {
      drawCircularArcs(ctx, centerX, centerY, baseRadius * 2, audioData, time);
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw data streams
    drawDataStreams(ctx, width, height, audioData, time);
    
    // Draw HUD elements
    drawHUDElements(ctx, width, height, audioData, time);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [intensity, drawCircularArcs, drawDataStreams, drawHUDElements, currentScheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('JARVIS Visualizer unmounting, cleaning up...');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, []);

  // Setup canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      // Size canvas to container size (which is positioned to the right of sidebar)
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      } else {
        // Fallback to right half of screen
        canvas.width = window.innerWidth * 0.5;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    
    // Listen for window resize and sidebar changes
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('sidebar-width-change', resizeCanvas);
    window.addEventListener('sidebar-toggle', resizeCanvas);
    
    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    const container = canvas.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('sidebar-width-change', resizeCanvas);
      window.removeEventListener('sidebar-toggle', resizeCanvas);
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <div 
      className="jarvis-visualizer-container"
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className="jarvis-canvas"
      />
    </div>
  );
};

export default JarvisVisualizer; 