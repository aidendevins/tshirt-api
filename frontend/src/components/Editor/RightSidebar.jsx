import React, { useRef, useEffect } from 'react';

export default function RightSidebar({
    selectedLayerId, layers, updateLayer,
    currentView, setCurrentView,
    canvasSettings, setCanvasSettings,
    shouldFocusText, setShouldFocusText
}) {
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    const textInputRef = useRef(null);

    useEffect(() => {
        if (shouldFocusText && selectedLayer?.type === 'text' && textInputRef.current) {
            textInputRef.current.focus();
            textInputRef.current.select();
            setShouldFocusText(false);
        }
    }, [shouldFocusText, selectedLayer, setShouldFocusText]);

    return (
        <div className="w-72 bg-[#2c2c2c] border-l border-white/10 flex flex-col z-40">
            {/* Views Switcher - Always visible */}
            <div className="p-4 border-b border-white/10">
                <p className="text-xs font-semibold text-white/40 uppercase mb-3">Product View</p>
                <div className="grid grid-cols-2 gap-2">
                    {['front', 'back', 'leftSleeve', 'rightSleeve', 'neckLabel'].map(view => (
                        <button
                            key={view}
                            onClick={() => setCurrentView(view)}
                            className={`px-3 py-2 rounded text-xs capitalize transition-colors ${currentView === view ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                        >
                            {view.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {selectedLayer ? (
                    <div className="space-y-6">
                        {/* Layer Header */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">{selectedLayer.type.toUpperCase()}</h3>
                            <button className="text-white/40 hover:text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                        </div>

                        {/* Transform */}
                        <div>
                            <p className="text-xs font-semibold text-white/40 uppercase mb-3">Transform</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-transparent focus-within:border-purple-500">
                                    <span className="text-xs text-white/40">X</span>
                                    <input
                                        type="number"
                                        value={Math.round(selectedLayer.x)}
                                        onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                                        className="w-full bg-transparent text-white text-xs outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-transparent focus-within:border-purple-500">
                                    <span className="text-xs text-white/40">Y</span>
                                    <input
                                        type="number"
                                        value={Math.round(selectedLayer.y)}
                                        onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                                        className="w-full bg-transparent text-white text-xs outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-transparent focus-within:border-purple-500">
                                    <span className="text-xs text-white/40">W</span>
                                    <input
                                        type="number"
                                        value={Math.round(selectedLayer.width)}
                                        onChange={(e) => updateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                                        className="w-full bg-transparent text-white text-xs outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-transparent focus-within:border-purple-500">
                                    <span className="text-xs text-white/40">H</span>
                                    <input
                                        type="number"
                                        value={Math.round(selectedLayer.height)}
                                        onChange={(e) => updateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                                        className="w-full bg-transparent text-white text-xs outline-none"
                                    />
                                </div>
                            </div>
                        </div>



                        {/* Specific Properties */}
                        {/* Specific Properties */}
                        {selectedLayer.type === 'text' && (
                            <div>
                                <p className="text-xs font-semibold text-white/40 uppercase mb-3">Typography</p>
                                <textarea
                                    ref={textInputRef}
                                    value={selectedLayer.text}
                                    onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                                    className="w-full bg-black/20 rounded border border-white/10 p-2 text-sm text-white resize-y min-h-[80px] mb-3 focus:border-purple-500 outline-none"
                                />
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedLayer.font}
                                            onChange={(e) => updateLayer(selectedLayer.id, { font: e.target.value })}
                                            className="flex-1 bg-black/20 rounded px-2 py-1.5 text-xs text-white outline-none"
                                        >
                                            {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Impact'].map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 w-20">
                                            <input
                                                type="number"
                                                value={Math.round(selectedLayer.size)}
                                                onChange={(e) => updateLayer(selectedLayer.id, { size: Number(e.target.value) })}
                                                className="w-full bg-transparent text-white text-xs outline-none text-center"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })}
                                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${selectedLayer.bold ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            B
                                        </button>
                                        <button
                                            onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })}
                                            className={`flex-1 py-1.5 rounded text-xs italic transition-colors ${selectedLayer.italic ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            I
                                        </button>
                                        <div className="w-[1px] bg-white/10 mx-1"></div>
                                        <button
                                            onClick={() => updateLayer(selectedLayer.id, { align: 'left' })}
                                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${selectedLayer.align === 'left' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
                                        </button>
                                        <button
                                            onClick={() => updateLayer(selectedLayer.id, { align: 'center' })}
                                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${selectedLayer.align === 'center' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>
                                        </button>
                                        <button
                                            onClick={() => updateLayer(selectedLayer.id, { align: 'right' })}
                                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${selectedLayer.align === 'right' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={selectedLayer.color}
                                            onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                        />
                                        <div className="flex-1 bg-black/20 rounded px-2 py-1.5 flex items-center justify-between">
                                            <span className="text-xs text-white/40">Color</span>
                                            <span className="text-xs text-white">{selectedLayer.color}</span>
                                        </div>
                                    </div>

                                    {/* Curved Text Controls */}
                                    <div className="pt-2 border-t border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-white/40 uppercase">Curved text</p>
                                            <button
                                                onClick={() => updateLayer(selectedLayer.id, { isCurved: !selectedLayer.isCurved })}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${selectedLayer.isCurved ? 'bg-green-600' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${selectedLayer.isCurved ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {selectedLayer.isCurved && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => updateLayer(selectedLayer.id, { curveType: 'archDown' })}
                                                        className={`p-2 rounded flex flex-col items-center gap-1 transition-colors ${selectedLayer.curveType === 'archDown' ? 'bg-white/10 border border-white/20' : 'bg-black/20 border border-transparent hover:bg-white/5'}`}
                                                    >
                                                        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" className="text-white">
                                                            <path d="M1 9C1 9 5 1 10 1C15 1 19 9 19 9" strokeWidth="1.5" strokeLinecap="round" />
                                                        </svg>
                                                        <span className="text-[10px] text-white/60">Arch Down</span>
                                                    </button>
                                                    <button
                                                        onClick={() => updateLayer(selectedLayer.id, { curveType: 'archUp' })}
                                                        className={`p-2 rounded flex flex-col items-center gap-1 transition-colors ${selectedLayer.curveType === 'archUp' ? 'bg-white/10 border border-white/20' : 'bg-black/20 border border-transparent hover:bg-white/5'}`}
                                                    >
                                                        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" className="text-white">
                                                            <path d="M1 1C1 1 5 9 10 9C15 9 19 1 19 1" strokeWidth="1.5" strokeLinecap="round" />
                                                        </svg>
                                                        <span className="text-[10px] text-white/60">Arch Up</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-white/40 w-10">Curve</span>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={selectedLayer.curveStrength || 0}
                                                        onChange={(e) => updateLayer(selectedLayer.id, { curveStrength: Number(e.target.value) })}
                                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <div className="flex items-center bg-white/5 rounded px-1.5 py-1 min-w-[40px]">
                                                        <span className="text-xs text-white">{selectedLayer.curveStrength || 0}</span>
                                                        <span className="text-[10px] text-white/40 ml-0.5">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Opacity */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-white/40 uppercase">Opacity</p>
                                <span className="text-xs text-white">{Math.round((selectedLayer.opacity || 1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={selectedLayer.opacity || 1}
                                onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-white/30">
                        <p className="text-sm">Select an element to edit properties</p>
                    </div>
                )}
            </div>
        </div >
    );
}

