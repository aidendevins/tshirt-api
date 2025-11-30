import React, { useState, useRef } from 'react';
import { Reorder } from 'framer-motion';

const IMAGE_STYLES = [
    'Realistic Photo', 'Anime/Manga', 'Comic Book', 'Sketch/Hand-drawn',
    'Minimalist/Flat', 'Abstract/Geometric', 'Retro/Vintage',
    'Grunge/Distressed', 'Watercolor/Painted', 'Sticker-like'
];

const TEXT_STYLES = [
    'Bold statement', 'Script/Handwritten', 'Block letters',
    'Stencil/Graffiti', 'Curved/Arched', 'Circular/Radial'
];

const COLOR_TREATMENTS = [
    'Keep original colors', 'Black & white', 'Monochrome (single color + shades)',
    'Duotone (2 colors)', 'Vibrant/Saturated', 'Pastel/Soft',
    'Neon/Bright', 'Earthy/Muted', 'Custom palette'
];

const EFFECTS_FILTERS = [
    'None', 'Glow/Neon outline', 'Drop shadow', 'Halftone/Dots',
    'Grain/Noise', 'Glitch effect', 'Chrome/Metallic'
];

const MOOD_VIBES = [
    'Playful/Fun', 'Serious/Professional', 'Dark/Edgy',
    'Cute/Wholesome', 'Energetic/Dynamic', 'Calm/Peaceful',
    'Bold/Aggressive', 'Dreamy/Ethereal'
];

export default function LeftSidebar({
    activeTab, setActiveTab,
    layers, selectedLayer, setSelectedLayer, onReorderLayers,
    onUploadImage, uploadedImages, removeUploadedImage,
    onAddText, onAddSprite,
    onExtractSprite, isGenerating,
    prompt, setPrompt, onGenerateAI,
    // AI Options
    textInGenPrompt, setTextInGenPrompt,
    textStyleOption, setTextStyleOption,
    customTextStyle, setCustomTextStyle,
    imageStyle, setImageStyle,
    customImageStyle, setCustomImageStyle,
    colorTreatment, setColorTreatment,
    customPaletteColors, setCustomPaletteColors,
    effectFilter, setEffectFilter,
    moodVibe, setMoodVibe,
    removeBackground, setRemoveBackground,
    // Sprites
    spritesLibrary = [], setSpritesLibrary
}) {

    const [showTextInGenDropdown, setShowTextInGenDropdown] = useState(false);
    const [showCustomTextStyleInput, setShowCustomTextStyleInput] = useState(false);
    const [showCustomImageStyleInput, setShowCustomImageStyleInput] = useState(false);
    const [showCustomPalette, setShowCustomPalette] = useState(false);
    
    // Sprite processing state
    const [showSpriteModal, setShowSpriteModal] = useState(false);
    const [uploadedSpriteImage, setUploadedSpriteImage] = useState(null);
    const [processingSprite, setProcessingSprite] = useState(false);
    const [processedSpriteImage, setProcessedSpriteImage] = useState(null);
    const spriteFileInputRef = useRef(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // Handle sprite image upload
    const handleSpriteUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            setUploadedSpriteImage(imageData);
            setShowSpriteModal(true);
            setProcessedSpriteImage(null);
            
            // Start processing immediately
            processSprite(imageData);
        };
        reader.readAsDataURL(file);
    };

    // Process sprite with backend
    const processSprite = async (imageData) => {
        setProcessingSprite(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/process-sprite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageData: imageData
                })
            });

            const result = await response.json();
            
            if (result.success && result.spriteImageUrl) {
                setProcessedSpriteImage(result.spriteImageUrl);
            } else {
                console.error('Sprite processing failed:', result.error);
                alert('Failed to process sprite: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error processing sprite:', error);
            alert('Error processing sprite. Please try again.');
        } finally {
            setProcessingSprite(false);
        }
    };

    // Accept processed sprite
    const handleAcceptSprite = () => {
        if (!processedSpriteImage) return;
        
        // Add to sprites library
        const newSprite = {
            id: Date.now().toString(),
            imageUrl: processedSpriteImage
        };
        
        if (setSpritesLibrary) {
            setSpritesLibrary([...spritesLibrary, newSprite]);
        }
        
        // Reset state
        setShowSpriteModal(false);
        setUploadedSpriteImage(null);
        setProcessedSpriteImage(null);
        setProcessingSprite(false);
        if (spriteFileInputRef.current) {
            spriteFileInputRef.current.value = '';
        }
    };

    // Cancel sprite processing
    const handleCancelSprite = () => {
        setShowSpriteModal(false);
        setUploadedSpriteImage(null);
        setProcessedSpriteImage(null);
        setProcessingSprite(false);
        if (spriteFileInputRef.current) {
            spriteFileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-80 bg-[#2c2c2c] border-r border-white/10 flex flex-col z-40">
            {/* Tab Header */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-purple-500 text-white' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Gen AI
                </button>
                <button
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'layers' ? 'border-purple-500 text-white' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Layers
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'assets' ? 'border-purple-500 text-white' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Assets
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'ai' && (
                    <div className="space-y-6">
                        {/* Uploads Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-white/40 uppercase">Reference Images</p>
                                <label className="text-[10px] text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1">
                                    <span>+ Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={onUploadImage} multiple />
                                </label>
                            </div>

                            <div className="space-y-3">
                                {uploadedImages.map((img, idx) => (
                                    <div key={idx} className="bg-[#151515] rounded-xl p-3 flex items-center gap-4 group border border-white/5 hover:border-white/10 transition-colors relative">
                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                                            <img src={img.data} className="w-full h-full object-cover" alt={img.name} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white truncate">Image {idx + 1}</h4>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {img.width ? `${img.width} × ${img.height}` : 'Dimensions N/A'}
                                            </p>
                                            <p className="text-[10px] text-white/30 truncate mt-0.5">{img.name}</p>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeUploadedImage(idx); }}
                                            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}

                                {uploadedImages.length === 0 && (
                                    <label className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-colors">
                                        <svg className="w-8 h-8 text-white/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-xs text-white/40">Click to upload reference images</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={onUploadImage} multiple />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-4 rounded-xl border border-white/10 space-y-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                ✨ AI Generator
                            </h3>

                            {/* Prompt */}
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Prompt</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white resize-none focus:ring-1 focus:ring-purple-500 outline-none"
                                    rows={3}
                                    placeholder="Describe what you want..."
                                />
                            </div>

                            {/* Text in Generation */}
                            <div className="bg-black/20 rounded-lg p-2">
                                <button onClick={() => setShowTextInGenDropdown(!showTextInGenDropdown)} className="w-full flex justify-between items-center text-xs text-white/80 font-medium">
                                    <span>Add Text to Generation</span>
                                    <svg className={`w-3 h-3 transition-transform ${showTextInGenDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showTextInGenDropdown && (
                                    <div className="mt-3 space-y-3">
                                        <input
                                            type="text"
                                            value={textInGenPrompt}
                                            onChange={(e) => setTextInGenPrompt(e.target.value)}
                                            placeholder='e.g. "DREAM BIG"'
                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none"
                                        />
                                        <div>
                                            <label className="block text-[10px] text-white/50 mb-1">Text Style</label>
                                            <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                                {TEXT_STYLES.map(style => (
                                                    <button key={style} onClick={() => { setTextStyleOption(style); setShowCustomTextStyleInput(false); }} className={`whitespace-nowrap px-2 py-1 rounded text-[10px] border ${textStyleOption === style ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-white/10 text-white/60 hover:border-white/30'}`}>{style}</button>
                                                ))}
                                                <button onClick={() => setShowCustomTextStyleInput(!showCustomTextStyleInput)} className={`whitespace-nowrap px-2 py-1 rounded text-[10px] border ${showCustomTextStyleInput ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-white/10 text-white/60 hover:border-white/30'}`}>Custom</button>
                                            </div>
                                            {showCustomTextStyleInput && (
                                                <input type="text" value={customTextStyle} onChange={(e) => setCustomTextStyle(e.target.value)} placeholder="Custom text style..." className="w-full mt-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Image Style */}
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Art Style</label>
                                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                    {IMAGE_STYLES.map(style => (
                                        <button key={style} onClick={() => { setImageStyle(style); setShowCustomImageStyleInput(false); }} className={`whitespace-nowrap px-2 py-1 rounded text-[10px] border ${imageStyle === style ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-white/10 text-white/60 hover:border-white/30'}`}>{style}</button>
                                    ))}
                                    <button onClick={() => { setImageStyle('Custom'); setShowCustomImageStyleInput(true); }} className={`whitespace-nowrap px-2 py-1 rounded text-[10px] border ${imageStyle === 'Custom' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-white/10 text-white/60 hover:border-white/30'}`}>Custom</button>
                                </div>
                                {showCustomImageStyleInput && (
                                    <input type="text" value={customImageStyle} onChange={(e) => setCustomImageStyle(e.target.value)} placeholder="Custom art style..." className="w-full mt-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" />
                                )}
                            </div>

                            {/* Color Treatment */}
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Color Treatment</label>
                                <select value={colorTreatment} onChange={(e) => { setColorTreatment(e.target.value); setShowCustomPalette(e.target.value === 'Custom palette'); }} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                    {COLOR_TREATMENTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {showCustomPalette && (
                                    <div className="flex gap-1 mt-2">
                                        {customPaletteColors.map((c, i) => (
                                            <input key={i} type="color" value={c} onChange={(e) => { const n = [...customPaletteColors]; n[i] = e.target.value; setCustomPaletteColors(n); }} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Effects */}
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Effects</label>
                                <select value={effectFilter} onChange={(e) => setEffectFilter(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                    {EFFECTS_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            {/* Mood */}
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Mood</label>
                                <select value={moodVibe} onChange={(e) => setMoodVibe(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                                    {MOOD_VIBES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            {/* Remove Background Toggle */}
                            <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                <span className="text-xs text-white/80 font-medium">Keep Main Object Only</span>
                                <button
                                    onClick={() => setRemoveBackground(!removeBackground)}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${removeBackground ? 'bg-purple-500' : 'bg-white/20'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${removeBackground ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <button
                                onClick={onGenerateAI}
                                disabled={isGenerating}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-lg shadow-purple-900/20"
                            >
                                {isGenerating ? 'Generating...' : 'Generate Design'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'layers' && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-white/40 uppercase mb-2">All Layers</p>
                        <Reorder.Group axis="y" values={layers.map(l => l.id)} onReorder={(newOrder) => {
                            // newOrder is array of IDs. We need to pass this back to parent.
                            // But wait, parent expects full layer order for the view.
                            // The 'layers' prop is reversed (top on top).
                            // So if we reorder here, we are reordering the visual stack (top to bottom).
                            // We need to reverse it back to get the z-index order (bottom to top) before saving.
                            const zIndexOrder = [...newOrder].reverse();
                            onReorderLayers(zIndexOrder);
                        }}>
                            {layers.map((layer) => (
                                <Reorder.Item key={layer.id} value={layer.id} className="relative">
                                    <div
                                        onClick={() => setSelectedLayer(layer.id)}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedLayer === layer.id ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-[#2c2c2c] hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 mr-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                        </div>
                                        <div className="w-8 h-8 bg-black/30 rounded flex items-center justify-center overflow-hidden pointer-events-none">
                                            {layer.type === 'image' && <img src={layer.preview} className="w-full h-full object-cover" />}
                                            {layer.type === 'text' && <span className="text-xs font-serif">T</span>}
                                            {layer.type === 'sprite' && (
                                                layer.preview ? (
                                                    <img src={layer.preview} className="w-full h-full object-contain" alt="Sprite" />
                                                ) : (
                                                    <span className="text-lg">{layer.content}</span>
                                                )
                                            )}
                                        </div>
                                        <span className="text-sm truncate flex-1 pointer-events-none">{layer.name}</span>
                                        <button className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </button>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                        {layers.length === 0 && <div className="text-center py-8 text-white/30 text-sm">No layers yet</div>}
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold text-white/40 uppercase mb-3">Stickers</p>
                            <div className="grid grid-cols-4 gap-2">
                                {['🔥', '⚡', '💎', '⭐', '🌟', '💫', '✨', '🎨'].map(emoji => (
                                    <button key={emoji} onClick={() => onAddSprite({ type: 'emoji', content: emoji })} className="aspect-square flex items-center justify-center text-2xl hover:bg-white/10 rounded">
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-white/40 uppercase mb-3">Sprites</p>
                            <label className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-colors mb-3">
                                <svg className="w-6 h-6 text-white/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs text-white/40">Upload Image</span>
                                <input 
                                    ref={spriteFileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleSpriteUpload} 
                                />
                            </label>
                            
                            {spritesLibrary && spritesLibrary.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {spritesLibrary.map((sprite) => (
                                        <button 
                                            key={sprite.id} 
                                            onClick={() => onAddSprite({ type: 'image', src: sprite.imageUrl })} 
                                            className="aspect-square bg-white/5 rounded flex items-center justify-center hover:bg-white/10 overflow-hidden border border-white/10"
                                        >
                                            <img 
                                                src={sprite.imageUrl} 
                                                alt="Sprite" 
                                                className="w-full h-full object-contain"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-white/40 uppercase mb-3">Text</p>
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => onAddText()} className="aspect-square bg-white/5 rounded flex items-center justify-center hover:bg-white/10">
                                    <span className="font-serif text-xl">T</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sprite Processing Modal */}
            {showSpriteModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#2c2c2c] rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Process Sprite</h3>
                            <button
                                onClick={handleCancelSprite}
                                className="text-white/50 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Original Image */}
                        {uploadedSpriteImage && (
                            <div className="mb-4">
                                <p className="text-xs text-white/60 mb-2">Original Image</p>
                                <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center">
                                    <img 
                                        src={uploadedSpriteImage} 
                                        alt="Uploaded" 
                                        className="max-w-full max-h-48 object-contain rounded"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Loading or Processed Result */}
                        <div className="mb-4">
                            <p className="text-xs text-white/60 mb-2">
                                {processingSprite ? 'Processing...' : 'Processed Sprite'}
                            </p>
                            <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                                {processingSprite ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                                        <p className="text-sm text-white/60">Removing background...</p>
                                    </div>
                                ) : processedSpriteImage ? (
                                    <img 
                                        src={processedSpriteImage} 
                                        alt="Processed Sprite" 
                                        className="max-w-full max-h-48 object-contain rounded"
                                    />
                                ) : (
                                    <p className="text-sm text-white/40">Processing will start shortly...</p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelSprite}
                                className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcceptSprite}
                                disabled={!processedSpriteImage || processingSprite}
                                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
