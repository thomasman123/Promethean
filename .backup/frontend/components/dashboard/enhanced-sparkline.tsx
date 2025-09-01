"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

export function EnhancedSparkline({
  data,
  width = 100,
  height = 32,
  color = "hsl(var(--primary))",
  fillColor = "hsl(var(--primary) / 0.1)",
  strokeWidth = 2,
  animate = true,
  className
}: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (svgRef.current) {
      observer.observe(svgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!animate || !isVisible || !pathRef.current) return;

    const path = pathRef.current;
    const length = path.getTotalLength();
    
    // Set up animation
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    
    // Trigger animation
    const animation = path.animate([
      { strokeDashoffset: length },
      { strokeDashoffset: 0 }
    ], {
      duration: 1200,
      easing: 'ease-out',
      fill: 'forwards'
    });

    return () => animation.cancel();
  }, [animate, isVisible]);

  if (!data || data.length === 0) {
    return (
      <div 
        className={cn("sparkline-container flex items-center justify-center", className)}
        style={{ width, height }}
      >
        <div className="text-xs text-muted-foreground">No data</div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create path points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  
  // Create area fill path
  const areaPoints = [
    `${0},${height}`,
    ...points,
    `${width},${height}`
  ];
  const areaData = `M ${areaPoints.join(' L ')} Z`;

  return (
    <div className={cn("sparkline-container", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id={`sparkline-gradient-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaData}
          fill={`url(#sparkline-gradient-${Math.random()})`}
          opacity={isVisible ? 1 : 0}
          style={{
            transition: 'opacity 300ms ease-out'
          }}
        />

        {/* Line */}
        <path
          ref={pathRef}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}
        />

        {/* Data points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
              opacity={isVisible ? (index === data.length - 1 ? 1 : 0.6) : 0}
              style={{
                transition: `opacity 300ms ease-out ${index * 50}ms`,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
              }}
            />
          );
        })}

        {/* Highlight last point */}
        {data.length > 0 && (
          <circle
            cx={(data.length - 1) / (data.length - 1) * width}
            cy={height - ((data[data.length - 1] - min) / range) * height}
            r="3"
            fill={color}
            opacity={isVisible ? 1 : 0}
            style={{
              transition: 'opacity 400ms ease-out 800ms',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
          />
        )}
      </svg>
    </div>
  );
}

// Simplified sparkline for smaller spaces
export function MiniSparkline({
  data,
  trend,
  className
}: {
  data: number[];
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const trendColors = {
    up: "hsl(var(--success))",
    down: "hsl(var(--destructive))",
    neutral: "hsl(var(--muted-foreground))"
  };

  return (
    <EnhancedSparkline
      data={data}
      width={60}
      height={20}
      color={trendColors[trend || 'neutral']}
      strokeWidth={1.5}
      className={cn("opacity-80 hover:opacity-100 transition-opacity", className)}
    />
  );
} 