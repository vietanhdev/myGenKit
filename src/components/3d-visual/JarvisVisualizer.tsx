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

  // Color schemes for different JARVIS modes
  const colorSchemes = {
    blue: { primary: '#00bfff', secondary: '#0080ff', accent: '#40e0ff' },
    cyan: { primary: '#00ffff', secondary: '#20b2aa', accent: '#afeeee' },
    green: { primary: '#00ff41', secondary: '#32cd32', accent: '#98fb98' },
    purple: { primary: '#8a2be2', secondary: '#9932cc', accent: '#da70d6' },
    gold: { primary: '#ffd700', secondary: '#ffb347', accent: '#fff8dc' }
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
      const amplitude = audioData[dataIndex] / 255;
      const angle = i * segmentAngle;
      
      // Outer arc
      const outerRadius = radius + amplitude * 30;
      const startAngle = angle - segmentAngle * 0.4;
      const endAngle = angle + segmentAngle * 0.4;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.strokeStyle = `${currentScheme.primary}${Math.floor(amplitude * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Inner pulsing arcs
      if (amplitude > 0.1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 20, startAngle, endAngle);
        ctx.strokeStyle = `${currentScheme.accent}${Math.floor(amplitude * 128).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [currentScheme]);

  // Draw data streams
  const drawDataStreams = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, audioData: Uint8Array, time: number) => {
    const streams = 6;
    for (let i = 0; i < streams; i++) {
      const x = (i / streams) * width;
      const dataIndex = Math.floor((i / streams) * audioData.length);
      const amplitude = audioData[dataIndex] / 255;
      
      // Vertical data streams
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, height - amplitude * height * 0.8);
      ctx.strokeStyle = `${currentScheme.secondary}${Math.floor(amplitude * 200).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Flowing particles
      const particleY = height - (time * 0.1 + i * 100) % height;
      if (amplitude > 0.2) {
        ctx.beginPath();
        ctx.arc(x, particleY, 2, 0, Math.PI * 2);
        ctx.fillStyle = currentScheme.accent;
        ctx.fill();
      }
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
    if (!canvas || !analyserRef.current || !dataArrayRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get audio data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now();
    
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Apply glow effect
    ctx.shadowColor = currentScheme.primary;
    ctx.shadowBlur = 10;
    
    // Draw main circular visualizer
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.15;
    
    drawCircularArcs(ctx, centerX, centerY, baseRadius, dataArrayRef.current, time);
    
    // Draw secondary arcs
    if (intensity !== 'low') {
      drawCircularArcs(ctx, centerX, centerY, baseRadius * 1.5, dataArrayRef.current, time);
    }
    
    if (intensity === 'high') {
      drawCircularArcs(ctx, centerX, centerY, baseRadius * 2, dataArrayRef.current, time);
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw data streams
    drawDataStreams(ctx, width, height, dataArrayRef.current, time);
    
    // Draw HUD elements
    drawHUDElements(ctx, width, height, dataArrayRef.current, time);
    
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
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