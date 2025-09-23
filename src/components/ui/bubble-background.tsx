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
        'fixed inset-0 overflow-hidden pointer-events-none',
        className,
      )}
      style={{ zIndex: -1 }}
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
        className="absolute inset-0 opacity-10"
        style={{ filter: 'url(#goo) blur(40px)' }}
      >
        <motion.div
          className="absolute rounded-full size-[80%] top-[10%] left-[10%] mix-blend-normal bg-[radial-gradient(circle_at_center,rgba(var(--first-color),0.05)_0%,rgba(var(--first-color),0)_50%)]"
          animate={{ y: [-50, 50, -50] }}
          transition={{ duration: 30, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 flex justify-center items-center origin-[calc(50%-400px)]"
          animate={{ rotate: 360 }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          <div className="rounded-full size-[80%] top-[10%] left-[10%] mix-blend-normal bg-[radial-gradient(circle_at_center,rgba(var(--second-color),0.04)_0%,rgba(var(--second-color),0)_50%)]" />
        </motion.div>
        <motion.div
          className="absolute inset-0 flex justify-center items-center origin-[calc(50%+400px)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
        >
          <div className="absolute rounded-full size-[80%] bg-[radial-gradient(circle_at_center,rgba(var(--third-color),0.04)_0%,rgba(var(--third-color),0)_50%)] mix-blend-normal top-[calc(50%+200px)] left-[calc(50%-500px)]" />
        </motion.div>
        <motion.div
          className="absolute rounded-full size-[80%] top-[10%] left-[10%] mix-blend-normal bg-[radial-gradient(circle_at_center,rgba(var(--fourth-color),0.03)_0%,rgba(var(--fourth-color),0)_50%)]"
          animate={{ x: [-50, 50, -50] }}
          transition={{ duration: 40, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 flex justify-center items-center origin-[calc(50%_-_800px)_calc(50%_+_200px)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, ease: 'linear', repeat: Infinity }}
        >
          <div className="absolute rounded-full size-[160%] mix-blend-normal bg-[radial-gradient(circle_at_center,rgba(var(--fifth-color),0.02)_0%,rgba(var(--fifth-color),0)_50%)] top-[calc(50%-80%)] left-[calc(50%-80%)]" />
        </motion.div>
        {interactive && (
          <motion.div
            className="absolute rounded-full size-full mix-blend-normal bg-[radial-gradient(circle_at_center,rgba(var(--sixth-color),0.1)_0%,rgba(var(--sixth-color),0)_50%)]"
            style={{
              x: springX,
              y: springY,
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
}

export { BubbleBackground, type BubbleBackgroundProps }; 