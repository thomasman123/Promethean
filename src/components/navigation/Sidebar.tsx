"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Icons - using inline SVGs for now
const Icons = {
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  user: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  team: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  credit: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  shield: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  monitor: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  tag: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  settings: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Icons.home, href: '/' },
    { id: 'account', label: 'Account', icon: Icons.user, href: '/account' },
    { id: 'team', label: 'Team', icon: Icons.team, href: '/team' },
    { id: 'subscription', label: 'Subscription Plans', icon: Icons.credit, href: '/subscription' },
    { id: 'compute', label: 'Buy Compute Packs', icon: Icons.shield, href: '/compute' },
    { id: 'statistics', label: 'Usage Statistics', icon: Icons.chart, href: '/statistics' },
    { id: 'billing', label: 'Billing', icon: Icons.monitor, href: '/billing' },
    { id: 'promo', label: 'Promo', icon: Icons.tag, href: '/promo' },
  ];

  return (
    <div 
      className={`
        fixed left-0 top-0 h-screen bg-white z-50
        transition-all duration-300 ease-out
        ${isHovered ? 'w-64' : 'w-16'}
        ${isHovered ? 'shadow-xl' : 'shadow-none'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
          {/* Sword Icon Placeholder */}
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.47 2.53a.75.75 0 010 1.06l-7.72 7.72-2.04-2.04 7.72-7.72a.75.75 0 011.06 0l.98.98zM8.71 10.29l2.04 2.04-6.37 6.37a4.5 4.5 0 01-1.85 1.14l-.59.17a.75.75 0 01-.92-.92l.17-.59a4.5 4.5 0 011.14-1.85l6.37-6.37zM21 12a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h4.5A.75.75 0 0121 12zm-9 6a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5H12z"/>
          </svg>
        </div>
        {isHovered && (
          <span className="ml-3 font-semibold text-gray-900 animate-fadeIn">
            Krea AI
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    relative flex items-center h-12 
                    transition-all duration-200
                    ${isActive 
                      ? 'text-gray-900' 
                      : 'text-gray-500 hover:text-gray-900'
                    }
                    ${isHovered ? 'px-4' : 'px-0'}
                  `}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-gray-900" />
                  )}
                  
                  {/* Icon Container - Always Centered */}
                  <div className={`
                    flex items-center justify-center
                    ${isHovered ? 'w-8' : 'w-16'}
                  `}>
                    {item.icon}
                  </div>
                  
                  {/* Label */}
                  {isHovered && (
                    <span className="ml-3 text-sm font-medium animate-fadeIn">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Badge */}
                  {item.badge && isHovered && (
                    <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full animate-fadeIn">
                      {item.badge}
                    </span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {!isHovered && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none hover:opacity-100 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100">
        <Link
          href="/settings"
          className={`
            flex items-center h-10 text-gray-500 hover:text-gray-900
            transition-all duration-200
            ${isHovered ? '' : 'justify-center'}
          `}
        >
          <div className={`
            flex items-center justify-center
            ${isHovered ? 'w-8' : 'w-8'}
          `}>
            {Icons.settings}
          </div>
          {isHovered && (
            <span className="ml-3 text-sm font-medium animate-fadeIn">
              Settings
            </span>
          )}
        </Link>
      </div>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
} 