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

    // Gradient blobs configuration - Purple and Blue shades only
    const blobs = [
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2, // Slower movement
        vy: (Math.random() - 0.5) * 0.2,
        radius: 400, // Larger for more coverage
        color: { r: 147, g: 51, b: 234 }, // Purple
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 500,
        color: { r: 99, g: 102, b: 241 }, // Indigo
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 450,
        color: { r: 59, g: 130, b: 246 }, // Blue
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: 350,
        color: { r: 168, g: 85, b: 247 }, // Purple-pink
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 400,
        color: { r: 79, g: 70, b: 229 }, // Deep purple
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        radius: 380,
        color: { r: 96, g: 165, b: 250 }, // Sky blue
        pulsePhase: Math.random() * Math.PI * 2,
      },
    ];

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw each blob
      blobs.forEach((blob) => {
        // Update position with slower movement
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

        // Enhanced pulse effect - slower and more pronounced
        const pulseFactor = 1 + Math.sin(time * 0.0005 + blob.pulsePhase) * 0.2;
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
        const opacity = isDarkMode ? 0.12 : 0.08; // Slightly reduced for more subtlety

        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${opacity * 0.6})`);
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
        filter: 'blur(40px)', // Add blur at the canvas level
      }}
    />
  );
}

// Alternative CSS-only version for better performance on lower-end devices
export function AnimatedGradientCSS() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Gradient orbs - Purple and Blue shades only */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob" />
      <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 left-20 w-[600px] h-[600px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob animation-delay-4000" />
      <div className="absolute bottom-20 -right-40 w-[500px] h-[500px] bg-violet-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob animation-delay-6000" />
      <div className="absolute left-1/3 top-1/3 w-[550px] h-[550px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob animation-delay-8000" />
      <div className="absolute right-1/3 bottom-1/3 w-[650px] h-[650px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-30 animate-blob animation-delay-10000" />
    </div>
  );
} 