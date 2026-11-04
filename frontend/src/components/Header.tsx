import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
      <div className="flex items-center gap-space-sm">
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
          <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
          <span className="font-label-md text-label-md text-on-surface font-medium">Production Cluster:</span>
          <span className="font-code-sm text-code-sm text-primary font-medium">multi-cloud-mesh-prod</span>
        </div>
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container">
          <span className="material-symbols-outlined text-secondary text-[16px]">public</span>
          <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">global-wan</span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low text-on-surface-variant express-api-pill">
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          <span className="font-code-sm text-code-sm">Express API: http://localhost:3000</span>
          <span className="inline-block w-2 h-2 rounded-full bg-tertiary-container"></span>
        </div>
        <button className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface text-on-surface-variant hover:text-on-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors">
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="font-label-md text-label-md">Search</span>
          <kbd className="px-space-xs py-0.5 text-[10px] font-code-sm bg-surface-container text-on-surface-variant rounded">⌘K</kbd>
        </button>
        <div className="relative flex items-center justify-center">
          <button className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
        </div>
        <div className="flex items-center gap-space-sm pl-space-sm">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="font-label-md text-label-md font-medium text-on-surface leading-tight">Admin Engineer</span>
            <span className="font-code-sm text-code-sm text-secondary leading-tight">mesh-admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

