"use client"

import { useState, useEffect } from "react"
import { MeshGradient, DotOrbit } from "@paper-design/shaders-react"

export function PaperShadersBackground() {
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check initial dark mode state
    setIsDarkMode(document.documentElement.classList.contains('dark'))
    
    // Watch for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden transition-opacity duration-500" style={{ zIndex: 0 }}>
      {isDarkMode ? (
        // Dark mode: dark gradient with subtle dots
        <>
          <MeshGradient
            className="w-full h-full absolute inset-0"
            colors={["#000000", "#0a0a0a", "#1a1a1a", "#2a2a2a"]}
            speed={0.5}
            backgroundColor="#000000"
          />
          <div className="w-full h-full absolute inset-0 opacity-40">
            <DotOrbit
              className="w-full h-full"
              dotColor="#333333"
              orbitColor="#1a1a1a"
              speed={0.8}
              intensity={1.2}
            />
          </div>
        </>
      ) : (
        // Light mode: light gradient with bright subtle effects
        <>
          <MeshGradient
            className="w-full h-full absolute inset-0"
            colors={["#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4"]}
            speed={0.5}
            backgroundColor="#ffffff"
          />
          <div className="w-full h-full absolute inset-0 opacity-20">
            <DotOrbit
              className="w-full h-full"
              dotColor="#d4d4d4"
              orbitColor="#e5e5e5"
              speed={0.8}
              intensity={0.8}
            />
          </div>
        </>
      )}
      
      {/* Subtle lighting effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/3 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            isDarkMode ? 'bg-gray-800/10' : 'bg-gray-400/10'
          }`}
          style={{ animationDuration: '6s' }}
        />
        <div
          className={`absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full blur-2xl animate-pulse ${
            isDarkMode ? 'bg-white/5' : 'bg-gray-300/15'
          }`}
          style={{ animationDuration: '4s', animationDelay: '1s' }}
        />
        <div
          className={`absolute top-1/2 right-1/3 w-20 h-20 rounded-full blur-xl animate-pulse ${
            isDarkMode ? 'bg-gray-900/8' : 'bg-gray-500/8'
          }`}
          style={{ animationDuration: '8s', animationDelay: '0.5s' }}
        />
      </div>
    </div>
  )
}

