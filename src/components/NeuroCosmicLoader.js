import React, { useState, useEffect, useRef } from 'react';
import './NeuroCosmicLoader.css';

function NeuroCosmicLoader({ 
  onLoadingComplete, 
  duration = 10000,
  progress = 0,
  message = "SuperMind is awakening..."
}) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(1); // 1: Neural, 2: Cosmic, 3: Constellation
  const [loadingText, setLoadingText] = useState(message);
  const animationRef = useRef(null);
  const nodesRef = useRef([]);
  const particlesRef = useRef([]);
  const cardsRef = useRef([]);
  const startTimeRef = useRef(Date.now());

  // Neural Network Phase
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes for neural network
    const initializeNodes = () => {
      nodesRef.current = [];
      const nodeCount = 15;
      
      for (let i = 0; i < nodeCount; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 4 + 2,
          opacity: Math.random() * 0.5 + 0.5,
          pulsePhase: Math.random() * Math.PI * 2,
          connections: []
        });
      }
    };

    // Initialize particles for cosmic effect
    const initializeParticles = () => {
      particlesRef.current = [];
      const particleCount = 100;
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          hue: Math.random() * 60 + 270, // Purple range
          spiralPhase: Math.random() * Math.PI * 2,
          spiralRadius: Math.random() * 100 + 50
        });
      }
    };

    // Initialize floating cards
    const initializeCards = () => {
      cardsRef.current = [];
      const cardCount = 8;
      
      for (let i = 0; i < cardCount; i++) {
        cardsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          targetX: (canvas.width / 2) + Math.cos(i * Math.PI * 2 / cardCount) * 150,
          targetY: (canvas.height / 2) + Math.sin(i * Math.PI * 2 / cardCount) * 150,
          width: 60,
          height: 80,
          rotation: Math.random() * Math.PI * 2,
          targetRotation: 0,
          opacity: 0,
          scale: 0.1
        });
      }
    };

    initializeNodes();
    initializeParticles();
    initializeCards();

    const animate = (timestamp) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (phase === 1) {
        // Neural Network Phase
        drawNeuralNetwork(ctx, timestamp);
      } else if (phase === 2) {
        // Cosmic Mind Phase
        drawCosmicEffect(ctx, timestamp);
      } else if (phase === 3) {
        // Floating Card Constellation Phase
        drawCardConstellation(ctx, timestamp);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawNeuralNetwork = (ctx, timestamp) => {
      const time = timestamp * 0.001;

      // Update and draw nodes
      nodesRef.current.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Pulse effect
        const pulse = Math.sin(time * 3 + node.pulsePhase) * 0.3 + 0.7;

        // Draw node
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * pulse);
        gradient.addColorStop(0, `rgba(161, 0, 255, ${node.opacity * pulse})`);
        gradient.addColorStop(1, `rgba(161, 0, 255, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby nodes
        nodesRef.current.forEach((otherNode, j) => {
          if (i !== j) {
            const dx = otherNode.x - node.x;
            const dy = otherNode.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
              const opacity = Math.max(0, 1 - distance / 150) * 0.3;
              ctx.strokeStyle = `rgba(161, 0, 255, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.stroke();

              // Add energy pulse along connection
              const progress = (Math.sin(time * 2 + distance * 0.01) + 1) / 2;
              const pulseX = node.x + dx * progress;
              const pulseY = node.y + dy * progress;
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 2})`;
              ctx.beginPath();
              ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      });
    };

    const drawCosmicEffect = (ctx, timestamp) => {
      const time = timestamp * 0.001;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Spiral motion
        particle.spiralPhase += 0.02;
        const spiralX = Math.cos(particle.spiralPhase) * particle.spiralRadius;
        const spiralY = Math.sin(particle.spiralPhase) * particle.spiralRadius;
        
        particle.x = centerX + spiralX + Math.sin(time + particle.spiralPhase) * 20;
        particle.y = centerY + spiralY + Math.cos(time + particle.spiralPhase) * 20;

        // Draw particle with galaxy effect
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 3);
        gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${particle.opacity})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, ${particle.opacity * 0.5})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 30%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw trailing effect
        ctx.strokeStyle = `hsla(${particle.hue}, 100%, 60%, ${particle.opacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - spiralX * 0.1, particle.y - spiralY * 0.1);
        ctx.stroke();
      });

      // Draw central vortex
      const vortexGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
      vortexGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      vortexGradient.addColorStop(0.3, 'rgba(161, 0, 255, 0.6)');
      vortexGradient.addColorStop(1, 'rgba(20, 5, 28, 0)');

      ctx.fillStyle = vortexGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCardConstellation = (ctx, timestamp) => {
      const time = timestamp * 0.001;

      // Update and draw floating cards
      cardsRef.current.forEach((card, i) => {
        // Animate to constellation positions
        card.x += (card.targetX - card.x) * 0.05;
        card.y += (card.targetY - card.y) * 0.05;
        card.rotation += (card.targetRotation - card.rotation) * 0.1;
        card.opacity = Math.min(1, card.opacity + 0.02);
        card.scale = Math.min(1, card.scale + 0.02);

        // Floating animation
        const float = Math.sin(time + i) * 5;
        const drawX = card.x;
        const drawY = card.y + float;

        // Draw card with glow effect
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(card.rotation);
        ctx.scale(card.scale, card.scale);
        ctx.globalAlpha = card.opacity;

        // Card glow
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, card.width);
        glowGradient.addColorStop(0, 'rgba(161, 0, 255, 0.8)');
        glowGradient.addColorStop(1, 'rgba(161, 0, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.fillRect(-card.width/2 - 10, -card.height/2 - 10, card.width + 20, card.height + 20);

        // Card body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(161, 0, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillRect(-card.width/2, -card.height/2, card.width, card.height);
        ctx.strokeRect(-card.width/2, -card.height/2, card.width, card.height);

        // Card content mockup
        ctx.fillStyle = 'rgba(161, 0, 255, 0.6)';
        ctx.fillRect(-card.width/2 + 5, -card.height/2 + 5, card.width - 10, card.height * 0.6);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-card.width/2 + 5, card.height/2 - 15, card.width - 10, 3);
        ctx.fillRect(-card.width/2 + 5, card.height/2 - 8, card.width * 0.7, 3);

        ctx.restore();
      });

      // Draw constellation connections
      ctx.strokeStyle = 'rgba(161, 0, 255, 0.3)';
      ctx.lineWidth = 1;
      cardsRef.current.forEach((card, i) => {
        const nextCard = cardsRef.current[(i + 1) % cardsRef.current.length];
        ctx.beginPath();
        ctx.moveTo(card.x, card.y);
        ctx.lineTo(nextCard.x, nextCard.y);
        ctx.stroke();
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);

  // Update loading text when message prop changes
  useEffect(() => {
    setLoadingText(message);
  }, [message]);

  // Phase transitions and loading text updates
  useEffect(() => {
    // Phase transitions with dynamic timing
    const phaseTimer1 = setTimeout(() => setPhase(2), duration * 0.4); // Neural → Cosmic
    const phaseTimer2 = setTimeout(() => setPhase(3), duration * 0.7); // Cosmic → Constellation
    
    const completeTimer = setTimeout(() => {
      if (onLoadingComplete) {
        onLoadingComplete();
      }
    }, duration);

    return () => {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(completeTimer);
    };
  }, [onLoadingComplete, duration]);

  return (
    <div className="neuro-cosmic-loader">
      <canvas ref={canvasRef} className="loader-canvas" />
      
      {/* SuperMind Logo */}
      <div className="loader-logo">
        <img src="./assets/logo.png" alt="SuperMind" />
        <div className="logo-glow"></div>
      </div>

      {/* Loading Text */}
      <div className="loader-text">
        <h2>{loadingText}</h2>
        <div className="text-glow"></div>
      </div>

      {/* Progress Indicator */}
      <div className="loader-progress">
        <div className="progress-orb"></div>
        <div className="progress-trail"></div>
        <div 
          className="progress-fill" 
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            transition: 'width 0.5s ease-out'
          }}
        ></div>
      </div>

      {/* Progress Percentage */}
      <div className="progress-text">
        {Math.round(Math.min(progress, 100))}%
      </div>

      {/* Phase Indicator */}
      <div className="phase-indicator">
        <div className={`phase-dot ${phase >= 1 ? 'active' : ''}`}></div>
        <div className={`phase-dot ${phase >= 2 ? 'active' : ''}`}></div>
        <div className={`phase-dot ${phase >= 3 ? 'active' : ''}`}></div>
      </div>
    </div>
  );
};

export default NeuroCosmicLoader;
