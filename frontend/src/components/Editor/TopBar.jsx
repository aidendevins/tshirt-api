import React from 'react';

export default function TopBar({ 
  onUndo, onRedo, canUndo, canRedo, 
  onSave, onCancel, isGenerating, 
  zoom, setZoom, currentStep
}) {
  return (
    <div className="h-12 bg-[#2c2c2c] border-b border-white/10 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="hover:bg-white/10 p-2 rounded">
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="h-6 w-px bg-white/10"></div>
        <div className="flex items-center gap-2">
          <button onClick={onUndo} disabled={!canUndo} className="hover:bg-white/10 p-1.5 rounded disabled:opacity-30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="hover:bg-white/10 p-1.5 rounded disabled:opacity-30">
             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
             </svg>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-white/70">
            {currentStep === 'design' ? 'Design Editor' : 'Product Options'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 mr-4 bg-black/20 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="text-white/70 hover:text-white px-1">-</button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="text-white/70 hover:text-white px-1">+</button>
        </div>
        
        <button 
            onClick={onSave} 
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
            {isGenerating ? 'Processing...' : 'Next'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
      </div>
    </div>
  );
}

