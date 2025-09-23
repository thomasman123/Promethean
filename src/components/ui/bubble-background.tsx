'use client';

import * as React from 'react';
import {
  motion,
  type SpringOptions,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { cn } from '@/lib/utils';

type BubbleBackgroundProps = React.ComponentProps<'div'> & {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: {
    first: string;
    second: string;
    third: string;
    fourth: string;
    fifth: string;
    sixth: string;
  };
};

function BubbleBackground({
  ref,
  className,
  children,
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors = {
    first: '220,38,38', // red-600
    second: '239,68,68', // red-500
    third: '248,113,113', // red-400
    fourth: '252,165,165', // red-300
    fifth: '254,202,202', // red-200
    sixth: '220,38,38', // red-600
  },
  ...props
}: BubbleBackgroundProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, transition);
  const springY = useSpring(mouseY, transition);

  React.useEffect(() => {
    if (!interactive) return;
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = currentContainer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    currentContainer?.addEventListener('mousemove', handleMouseMove);
    return () =>
      currentContainer?.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      data-slot="bubble-background"
      className={cn(
        'fixed inset-0 overflow-hidden pointer-events-none bg-red-500/20',
        className,
      )}
      style={{ zIndex: 999 }}
      {...props}
    >
      <style>
        {`
          :root {
            --first-color: ${colors.first};
            --second-color: ${colors.second};
            --third-color: ${colors.third};
            --fourth-color: ${colors.fourth};
            --fifth-color: ${colors.fifth};
            --sixth-color: ${colors.sixth};
          }
        `}
      </style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-0 left-0 w-0 h-0"
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div
        className="absolute inset-0 opacity-50"
      >
        <div className="absolute rounded-full w-64 h-64 top-[10%] left-[10%] bg-red-500/30" />
        <div className="absolute rounded-full w-48 h-48 top-[60%] right-[20%] bg-red-400/25" />
        <div className="absolute rounded-full w-56 h-56 bottom-[20%] left-[50%] bg-red-600/20" />
      </div>
      {children}
    </div>
  );
}

export { BubbleBackground, type BubbleBackgroundProps }; 