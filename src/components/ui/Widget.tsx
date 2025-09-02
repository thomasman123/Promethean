"use client";

import React, { useState, useRef, useEffect } from 'react';

interface WidgetProps {
  id: string;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  initialWidth?: number | string;
  initialHeight?: number | string;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  gridBased?: boolean;
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
  className = '',
  gridBased = false
}: WidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ 
    width: typeof initialWidth === 'number' ? initialWidth : 0, 
    height: typeof initialHeight === 'number' ? initialHeight : 0 
  });
  const widgetRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // For grid-based widgets, we don't handle resize the same way
  const handleResizeStart = (e: React.MouseEvent) => {
    if (gridBased) return; // Grid-based widgets will have different resize logic
    
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
    if (!isResizing || gridBased) return;

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
  }, [isResizing, dimensions.width, dimensions.height, id, minWidth, minHeight, onResize, gridBased]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
    setIsMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  // For grid-based widgets, use full width/height
  const style = gridBased 
    ? { width: '100%', height: '100%' }
    : { width: dimensions.width, height: dimensions.height };

  return (
    <div
      ref={widgetRef}
      className={`relative group bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl transition-all duration-200 ${className}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Three-dot menu button */}
      {isHovered && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={toggleMenu}
            className="p-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            aria-label="Widget options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div 
              ref={menuRef}
              className="absolute top-full right-0 mt-1 min-w-[120px] bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-30"
            >
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Widget content */}
      <div className="w-full h-full p-4">
        {children}
      </div>

      {/* Resize handle - only show for non-grid widgets */}
      {!gridBased && (
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity ${
            isResizing ? 'opacity-100' : ''
          }`}
          onMouseDown={handleResizeStart}
        >
          <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 22H20V20H22V22M22 18H20V16H22V18M18 22H16V20H18V22M18 18H16V16H18V18M14 22H12V20H14V22M22 14H20V12H22V14Z"/>
          </svg>
        </div>
      )}
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