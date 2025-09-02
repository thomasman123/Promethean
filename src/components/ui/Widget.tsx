"use client";

import React, { useState, useRef, useEffect } from 'react';

interface WidgetProps {
  id: string;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export function Widget({
  id,
  children,
  onDelete,
  onResize,
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 200,
  minHeight = 150,
  className = ''
}: WidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: initialWidth, height: initialHeight });
  const widgetRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      
      const newWidth = Math.max(minWidth, startPos.current.width + deltaX);
      const newHeight = Math.max(minHeight, startPos.current.height + deltaY);
      
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (onResize) {
        onResize(id, dimensions.width, dimensions.height);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dimensions.width, dimensions.height, id, minWidth, minHeight, onResize]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div
      ref={widgetRef}
      className={`relative group ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete button */}
      {isHovered && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Delete widget"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      )}

      {/* Widget content */}
      <div className="w-full h-full">
        {children}
      </div>

      {/* Resize handle */}
      <div
        className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity ${
          isResizing ? 'opacity-100' : ''
        }`}
        onMouseDown={handleResizeStart}
      >
        <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22 22H20V20H22V22M22 18H20V16H22V18M18 22H16V20H18V22M18 18H16V16H18V18M14 22H12V20H14V22M22 14H20V12H22V14Z"/>
        </svg>
      </div>
    </div>
  );
}

/* Grid Container for widgets */
interface WidgetGridProps {
  children: React.ReactNode;
  className?: string;
}

export function WidgetGrid({ children, className = '' }: WidgetGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min ${className}`}>
      {children}
    </div>
  );
} 