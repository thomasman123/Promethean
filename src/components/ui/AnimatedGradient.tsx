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

    // Gradient blobs configuration
    const blobs = [
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 300,
        color: { r: 147, g: 51, b: 234 }, // Purple
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 400,
        color: { r: 59, g: 130, b: 246 }, // Blue
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 350,
        color: { r: 236, g: 72, b: 153 }, // Pink
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 300,
        color: { r: 16, g: 185, b: 129 }, // Green
        pulsePhase: Math.random() * Math.PI * 2,
      },
    ];

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw each blob
      blobs.forEach((blob) => {
        // Update position
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce off edges with smooth transition
        if (blob.x - blob.radius < 0 || blob.x + blob.radius > canvas.width) {
          blob.vx *= -1;
          blob.x = Math.max(blob.radius, Math.min(canvas.width - blob.radius, blob.x));
        }
        if (blob.y - blob.radius < 0 || blob.y + blob.radius > canvas.height) {
          blob.vy *= -1;
          blob.y = Math.max(blob.radius, Math.min(canvas.height - blob.radius, blob.y));
        }

        // Pulse effect
        const pulseFactor = 1 + Math.sin(time * 0.001 + blob.pulsePhase) * 0.1;
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

        // Determine opacity based on theme
        const isDarkMode = document.documentElement.classList.contains('dark');
        const opacity = isDarkMode ? 0.15 : 0.1;

        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      time += 16; // Approximate 60fps
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
      }}
    />
  );
}

// Alternative CSS-only version for better performance on lower-end devices
export function AnimatedGradientCSS() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Gradient orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-6000" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-8000" />
    </div>
  );
} 