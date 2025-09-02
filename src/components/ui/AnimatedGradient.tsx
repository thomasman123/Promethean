"use client";

import React, { useEffect, useRef } from 'react';

export function AnimatedGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Just two gradient blobs - top left and bottom right
    const blobs = [
      {
        x: canvas.width * 0.1, // Top left area
        y: canvas.height * 0.1,
        vx: (Math.random() - 0.5) * 0.1, // Very slow movement
        vy: (Math.random() - 0.5) * 0.1,
        radius: 600,
        color: { r: 99, g: 102, b: 241 }, // Indigo
        pulsePhase: 0,
      },
      {
        x: canvas.width * 0.9, // Bottom right area
        y: canvas.height * 0.9,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: 600,
        color: { r: 147, g: 51, b: 234 }, // Purple
        pulsePhase: Math.PI, // Opposite phase for variety
      },
    ];

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw each blob
      blobs.forEach((blob, index) => {
        // Gentle movement within a constrained area
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Keep blobs in their respective corners with soft boundaries
        const margin = 200;
        if (index === 0) { // Top left blob
          if (blob.x < margin || blob.x > canvas.width * 0.4) blob.vx *= -1;
          if (blob.y < margin || blob.y > canvas.height * 0.4) blob.vy *= -1;
        } else { // Bottom right blob
          if (blob.x < canvas.width * 0.6 || blob.x > canvas.width - margin) blob.vx *= -1;
          if (blob.y < canvas.height * 0.6 || blob.y > canvas.height - margin) blob.vy *= -1;
        }

        // Subtle pulse effect
        const pulseFactor = 1 + Math.sin(time * 0.0003 + blob.pulsePhase) * 0.05;
        const currentRadius = blob.radius * pulseFactor;

        // Create radial gradient
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          currentRadius
        );

        // Very subtle opacity
        const isDarkMode = document.documentElement.classList.contains('dark');
        const opacity = isDarkMode ? 0.06 : 0.03;

        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      time += 16;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 0,
        opacity: 1,
        filter: 'blur(100px)',
      }}
    />
  );
}

// Alternative CSS-only version for better performance on lower-end devices
export function AnimatedGradientCSS() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Just two gradient orbs - top left and bottom right */}
      <div className="absolute -top-48 -left-48 w-[800px] h-[800px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.07] dark:opacity-[0.12] animate-blob-slow" />
      <div className="absolute -bottom-48 -right-48 w-[800px] h-[800px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.07] dark:opacity-[0.12] animate-blob-slow animation-delay-5000" />
    </div>
  );
} 