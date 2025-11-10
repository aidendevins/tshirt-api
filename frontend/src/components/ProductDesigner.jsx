import { useState, useEffect, useRef } from 'react';
import { getCreatorSession, setPrintifyVariants, getPrintifyVariants } from '../utils/session';
import tFrontImg from '../assets/t-front.png';
import tBackImg from '../assets/t-back.png';
import tSleeveImg from '../assets/t-sleeve.png';
import tNeckLabelImg from '../assets/t-necklabel.png';
import tFrontRealisticImg from '../assets/t-front-realistic.png';
import tBackRealisticImg from '../assets/t-realistic-back.png';
import tSleeveRealisticImg from '../assets/t-sleeve-realistic.png';
import tNeckRealisticImg from '../assets/t-neck-realistic.png';

// Print area restriction constants
const PRINT_AREA_CONFIG = {
  'front': {
    x: 0.332,
    y: 0.228,
    width: 0.344,
    height: 0.453
  },
  'back': {
    x: 0.332,
    y: 0.161,
    width: 0.344,
    height: 0.453
  },
  'leftSleeve': {
    x: 0.423,
    y: 0.434,
    width: 0.163,
    height: 0.173
  },
  'rightSleeve': {
    x: 0.423,
    y: 0.434,
    width: 0.163,
    height: 0.173
  },
  'neckLabel': {
    x: 0.365,
    y: 0.308,
    width: 0.278,
    height: 0.295
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function ProductDesigner({ onSave, onCancel }) {
  // Canvas state
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [previewCtx, setPreviewCtx] = useState(null);
  const [canvasImageUrl, setCanvasImageUrl] = useState('');
  const [designOnlyImageUrl, setDesignOnlyImageUrl] = useState('');
  const fileInputRef = useRef(null);
  
  // Design state - separate design for each view
  const [designImages, setDesignImages] = useState({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neckLabel: null
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  
  // History state
  const [designHistory, setDesignHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // View state
  const [currentView, setCurrentView] = useState('front');
  const [tshirtImages, setTshirtImages] = useState({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neckLabel: null
  });
  
  // Text state - separate text for each view
  const [textElements, setTextElements] = useState({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neckLabel: null
  });
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('Arial Black');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(60);
  const [textWarpStyle, setTextWarpStyle] = useState('none');
  
  // Sprites state - separate sprites for each view
  const [spritesPerView, setSpritesPerView] = useState({
    front: [],
    back: [],
    leftSleeve: [],
    rightSleeve: [],
    neckLabel: []
  });
  const [showSpritePanel, setShowSpritePanel] = useState(false);
  
  // Control state
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Selection state
  const [isDesignSelected, setIsDesignSelected] = useState(false);
  const [isTextSelected, setIsTextSelected] = useState(false);
  
  // Text dragging/resizing
  const [isTextDragging, setIsTextDragging] = useState(false);
  const [isTextResizing, setIsTextResizing] = useState(false);
  const [textResizeHandle, setTextResizeHandle] = useState(null);
  
  // Sprite resizing
  const [isSpriteResizing, setIsSpriteResizing] = useState(false);
  const [spriteResizeHandle, setSpriteResizeHandle] = useState(null);
  
  // UI state
  const [activeToolbarItem, setActiveToolbarItem] = useState(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  // Product options
  const [currentStep, setCurrentStep] = useState('design');
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('29.99');
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState(['S', 'M', 'L', 'XL']);
  
  // Dynamic colors from Printify variants
  const [printifyColors, setPrintifyColors] = useState([]);
  const [colorSearchTerm, setColorSearchTerm] = useState('');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  
  // Cached images - captured when user clicks "Next"
  const [cachedViewImages, setCachedViewImages] = useState(null);
  
  // Mockup carousel state
  const [showMockupCarousel, setShowMockupCarousel] = useState(false);
  const [mockupImages, setMockupImages] = useState([]);
  const [printifyProductId, setPrintifyProductId] = useState(null);
  const [currentMockupIndex, setCurrentMockupIndex] = useState(0);
  
  // Current view's text and sprites (convenience accessors)
  const textElement = textElements[currentView];
  const sprites = spritesPerView[currentView];
  
  // Helper functions to update current view's text and sprites
  const setTextElement = (newText) => {
    setTextElements({
      ...textElements,
      [currentView]: newText
    });
  };
  
  const setSprites = (newSprites) => {
    setSpritesPerView({
      ...spritesPerView,
      [currentView]: newSprites
    });
  };
  
  const fonts = ['Arial Black', 'Impact', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Comic Sans MS'];
  const warpStyles = ['none', 'arc', 'wave', 'circle'];
  const colors = ['white', 'black', 'gray', 'red', 'blue', 'navy', 'green'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableEmojis = ['🔥', '⚡', '💎', '⭐', '🌟', '💫', '✨', '🎨', '🎭', '🎪', '🎸', '🎤', '🎧', '🎮', '🏀', '⚽', '🏆', '👑', '💀', '🦋', '🌈', '☀️', '🌙'];
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!canvas || !previewCanvas) return;
    
    const context = canvas.getContext('2d');
    const previewContext = previewCanvas.getContext('2d');
    setCtx(context);
    setPreviewCtx(previewContext);
    
    canvas.width = 660;
    canvas.height = 660;
    previewCanvas.width = 660;
    previewCanvas.height = 660;
    
    // Load t-shirt template images
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };
    
    Promise.all([
      loadImage(tFrontImg),
      loadImage(tBackImg),
      loadImage(tSleeveImg),
      loadImage(tSleeveImg),  // Use same image for both sleeves
      loadImage(tNeckLabelImg)
    ]).then(([front, back, leftSleeve, rightSleeve, neckLabel]) => {
      setTshirtImages({ front, back, leftSleeve, rightSleeve, neckLabel });
    });
  }, []);
  
  // Redraw canvas when state changes
  useEffect(() => {
    if (ctx && previewCtx && tshirtImages.front) {
      drawCanvas();
    }
  }, [designImages, textElements, spritesPerView, currentView, ctx, previewCtx, tshirtImages, isDesignSelected, isTextSelected]);
  
  // Redraw canvas when returning to design step
  useEffect(() => {
    if (currentStep === 'design' && ctx && previewCtx && tshirtImages.front) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        drawCanvas();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [currentStep, ctx, previewCtx, tshirtImages]);
  
  // Handle keyboard events for deleting selected elements
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle delete/backspace when in design step and not in an input field
      if (currentStep !== 'design') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        
        // Delete selected text
        if (isTextSelected && textElement) {
          saveState();
          setTextElement(null);
          setIsTextSelected(false);
          return;
        }
        
        // Delete selected design image
        if (isDesignSelected && designImages[currentView]) {
          saveState();
          setDesignImages({
            ...designImages,
            [currentView]: null
          });
          setIsDesignSelected(false);
          return;
        }
        
        // Delete selected sprite
        if (selectedLayer && selectedLayer.startsWith('sprite-')) {
          const spriteIndex = parseInt(selectedLayer.split('-')[1]);
          if (spriteIndex >= 0 && spriteIndex < sprites.length) {
            saveState();
            const newSprites = sprites.filter((_, idx) => idx !== spriteIndex);
            setSprites(newSprites);
            setSelectedLayer(null);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isTextSelected, isDesignSelected, selectedLayer, textElement, designImages, sprites, currentView]);
  
  // Load colors from Printify variants when moving to options step
  useEffect(() => {
    if (currentStep === 'options') {
      const variantsData = getPrintifyVariants();
      if (variantsData && variantsData.variants) {
        // Extract unique colors from variants
        const uniqueColors = [...new Set(
          variantsData.variants.map(variant => variant.options.color)
        )].sort();
        
        console.log('📊 Extracted unique colors from Printify variants:', uniqueColors.length);
        setPrintifyColors(uniqueColors);
      }
    }
  }, [currentStep]);
  
  // Save state for undo
  const saveState = () => {
    const state = {
      designImages: { ...designImages },
      textElements: { ...textElements },
      spritesPerView: {
        front: [...spritesPerView.front],
        back: [...spritesPerView.back],
        leftSleeve: [...spritesPerView.leftSleeve],
        rightSleeve: [...spritesPerView.rightSleeve],
        neckLabel: [...spritesPerView.neckLabel]
      }
    };
    setUndoStack([...undoStack, state]);
    setRedoStack([]);
  };
  
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const newUndoStack = [...undoStack];
    const prevState = newUndoStack.pop();
    
    const currentState = {
      designImages: { ...designImages },
      textElements: { ...textElements },
      spritesPerView: {
        front: [...spritesPerView.front],
        back: [...spritesPerView.back],
        leftSleeve: [...spritesPerView.leftSleeve],
        rightSleeve: [...spritesPerView.rightSleeve],
        neckLabel: [...spritesPerView.neckLabel]
      }
    };
    
    setRedoStack([...redoStack, currentState]);
    setUndoStack(newUndoStack);
    
    setDesignImages(prevState.designImages);
    setTextElements(prevState.textElements);
    setSpritesPerView(prevState.spritesPerView);
  };
  
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop();
    
    const currentState = {
      designImages: { ...designImages },
      textElements: { ...textElements },
      spritesPerView: {
        front: [...spritesPerView.front],
        back: [...spritesPerView.back],
        leftSleeve: [...spritesPerView.leftSleeve],
        rightSleeve: [...spritesPerView.rightSleeve],
        neckLabel: [...spritesPerView.neckLabel]
      }
    };
    
    setUndoStack([...undoStack, currentState]);
    setRedoStack(newRedoStack);
    
    setDesignImages(nextState.designImages);
    setTextElements(nextState.textElements);
    setSpritesPerView(nextState.spritesPerView);
  };
  
  const drawCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    // Draw t-shirt background based on current view
    const tshirtImg = currentView === 'front' ? tshirtImages.front :
                      currentView === 'back' ? tshirtImages.back :
                      currentView === 'leftSleeve' ? tshirtImages.leftSleeve :
                      currentView === 'rightSleeve' ? tshirtImages.rightSleeve :
                      currentView === 'neckLabel' ? tshirtImages.neckLabel :
                      tshirtImages.front;
    
    if (tshirtImg) {
      ctx.drawImage(tshirtImg, 0, 0, w, h);
    }
    
    const printAreaX = w * PRINT_AREA_CONFIG[currentView].x;
    const printAreaY = h * PRINT_AREA_CONFIG[currentView].y;
    const printAreaWidth = w * PRINT_AREA_CONFIG[currentView].width;
    const printAreaHeight = h * PRINT_AREA_CONFIG[currentView].height;
    
    // Get the design for the current view
    const currentDesignImage = designImages[currentView];
    
    // Draw print area guides on all views
    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(printAreaX, printAreaY, printAreaWidth, printAreaHeight);
    ctx.setLineDash([]);
    
    if (!currentDesignImage) {
      ctx.fillStyle = 'rgba(150,150,150,0.5)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Your design will', w / 2 + 2, printAreaY + printAreaHeight / 2 - 10);
      ctx.fillText('appear here', w / 2 + 2, printAreaY + printAreaHeight / 2 + 10);
    }
    
    if (currentDesignImage) {
      ctx.drawImage(currentDesignImage.img, currentDesignImage.x, currentDesignImage.y, currentDesignImage.width, currentDesignImage.height);
    }
    
    sprites.forEach((sprite) => {
      ctx.font = `${sprite.size}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sprite.emoji, sprite.x, sprite.y);
      
      if (sprite.isSelected) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(sprite.x, sprite.y, sprite.width || sprite.size, sprite.height || sprite.size);
        drawSpriteHandles(sprite);
      }
    });
    
    if (textElement) {
      drawText(textElement);
      if (isTextSelected) {
        drawTextHandles();
      }
    }
    
    if (currentDesignImage && isDesignSelected) {
      drawDesignHandles();
    }
    
    // Update canvas image URL for display
    if (canvasRef.current) {
      try {
        setCanvasImageUrl(canvasRef.current.toDataURL('image/png'));
      } catch (e) {
        console.error('Error converting canvas to data URL:', e);
      }
    }
    
    // Update preview with design-only rendering
    updatePreviewCanvas();
  };
  
  const updatePreviewCanvas = () => {
    if (!previewCtx || !previewCanvasRef.current) return;
    
    const canvas = previewCanvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear with transparent background
    previewCtx.clearRect(0, 0, w, h);
    
    // Get the design for the current view
    const currentDesignImage = designImages[currentView];
    
    // Draw only the design elements (no t-shirt template)
    if (currentDesignImage) {
      previewCtx.drawImage(currentDesignImage.img, currentDesignImage.x, currentDesignImage.y, currentDesignImage.width, currentDesignImage.height);
    }
    
    // Draw sprites
    sprites.forEach((sprite) => {
      previewCtx.font = `${sprite.size}px Arial`;
      previewCtx.textAlign = 'left';
      previewCtx.textBaseline = 'top';
      previewCtx.fillText(sprite.emoji, sprite.x, sprite.y);
    });
    
    // Draw text
    if (textElement) {
      drawTextOnPreview(textElement);
    }
    
    // Update design-only image URL
    if (previewCanvasRef.current) {
      try {
        setDesignOnlyImageUrl(previewCanvasRef.current.toDataURL('image/png'));
      } catch (e) {
        console.error('Error converting preview canvas to data URL:', e);
      }
    }
  };
  
  const drawTextOnPreview = (text) => {
    if (!previewCtx) return;
    
    previewCtx.font = `${text.size}px ${text.font}`;
    previewCtx.fillStyle = text.color;
    previewCtx.textAlign = 'center';
    previewCtx.textBaseline = 'middle';
    
    if (text.warpStyle === 'arc') {
      drawArcTextOnPreview(text.text, text.x, text.y, text.size);
    } else if (text.warpStyle === 'wave') {
      drawWaveTextOnPreview(text.text, text.x, text.y, text.size);
    } else if (text.warpStyle === 'circle') {
      drawCircleTextOnPreview(text.text, text.x, text.y, text.size);
    } else {
      // Use text's maxWidth if available, otherwise use print area width
      const canvas = previewCanvasRef.current;
      const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
      const maxWidth = text.maxWidth || printAreaWidth;
      
      // Wrap text if needed
      const lines = wrapText(text.text, maxWidth, previewCtx);
      const lineHeight = text.size * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = text.y - (totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line centered
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        previewCtx.fillText(line, text.x, y);
      });
    }
  };
  
  const drawArcTextOnPreview = (text, cx, cy, fontSize) => {
    const radius = 100;
    const angleRange = Math.PI;
    const startAngle = -Math.PI / 2 - angleRange / 2;
    
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + (angleRange / text.length) * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      previewCtx.save();
      previewCtx.translate(x, y);
      previewCtx.rotate(angle + Math.PI / 2);
      previewCtx.fillText(text[i], 0, 0);
      previewCtx.restore();
    }
  };
  
  const drawWaveTextOnPreview = (text, cx, cy, fontSize) => {
    const amplitude = 20;
    const frequency = 0.5;
    const spacing = fontSize * 0.6;
    const startX = cx - (text.length * spacing) / 2;
    
    for (let i = 0; i < text.length; i++) {
      const x = startX + i * spacing;
      const y = cy + Math.sin(i * frequency) * amplitude;
      previewCtx.fillText(text[i], x, y);
    }
  };
  
  const drawCircleTextOnPreview = (text, cx, cy, fontSize) => {
    const radius = 80;
    const angleStep = (2 * Math.PI) / text.length;
    
    for (let i = 0; i < text.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      previewCtx.save();
      previewCtx.translate(x, y);
      previewCtx.rotate(angle + Math.PI / 2);
      previewCtx.fillText(text[i], 0, 0);
      previewCtx.restore();
    }
  };
  
  // Helper function to wrap text into multiple lines
  const wrapText = (text, maxWidth, context) => {
    const words = text.split(' ');
    if (words.length === 0) return [''];
    
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = context.measureText(testLine);
      
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const drawText = (text) => {
    if (!ctx) return;
    
    ctx.font = `${text.size}px ${text.font}`;
    ctx.fillStyle = text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (text.warpStyle === 'arc') {
      drawArcText(text.text, text.x, text.y, text.size);
    } else if (text.warpStyle === 'wave') {
      drawWaveText(text.text, text.x, text.y, text.size);
    } else if (text.warpStyle === 'circle') {
      drawCircleText(text.text, text.x, text.y, text.size);
    } else {
      // Use text's maxWidth if available, otherwise use print area width
      const canvas = canvasRef.current;
      const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
      const maxWidth = text.maxWidth || printAreaWidth;
      
      // Wrap text if needed
      const lines = wrapText(text.text, maxWidth, ctx);
      const lineHeight = text.size * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = text.y - (totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line centered
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        ctx.fillText(line, text.x, y);
      });
    }
  };
  
  const drawArcText = (text, cx, cy, fontSize, context = ctx) => {
    const radius = 100;
    const angleRange = Math.PI;
    const startAngle = -Math.PI / 2 - angleRange / 2;
    
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + (angleRange / text.length) * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      context.save();
      context.translate(x, y);
      context.rotate(angle + Math.PI / 2);
      context.fillText(text[i], 0, 0);
      context.restore();
    }
  };
  
  const drawWaveText = (text, cx, cy, fontSize, context = ctx) => {
    const amplitude = 20;
    const frequency = 0.5;
    const charWidth = fontSize * 0.6;
    const totalWidth = text.length * charWidth;
    
    for (let i = 0; i < text.length; i++) {
      const x = cx - totalWidth / 2 + i * charWidth;
      const y = cy + Math.sin(i * frequency) * amplitude;
      context.fillText(text[i], x, y);
    }
  };
  
  const drawCircleText = (text, cx, cy, fontSize, context = ctx) => {
    const radius = 80;
    const angleStep = (Math.PI * 2) / text.length;
    
    for (let i = 0; i < text.length; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      context.save();
      context.translate(x, y);
      context.rotate(angle + Math.PI / 2);
      context.fillText(text[i], 0, 0);
      context.restore();
    }
  };
  
  const getTextBoundingBox = () => {
    if (!textElement || !ctx) return { x: 0, y: 0, width: 0, height: 0 };
    
    // Use stored box dimensions if available (for resizing stability)
    if (textElement.boxWidth && textElement.boxHeight) {
      return {
        x: textElement.x - textElement.boxWidth / 2,
        y: textElement.y - textElement.boxHeight / 2,
        width: textElement.boxWidth,
        height: textElement.boxHeight
      };
    }
    
    // Otherwise calculate from wrapped text (for backward compatibility)
    ctx.font = `${textElement.size}px ${textElement.font}`;
    
    const canvas = canvasRef.current;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
    const maxWidth = textElement.maxWidth || printAreaWidth;
    
    const lines = wrapText(textElement.text, maxWidth, ctx);
    const lineHeight = textElement.size * 1.2;
    
    let actualMaxWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      if (metrics.width > actualMaxWidth) {
        actualMaxWidth = metrics.width;
      }
    });
    
    const width = Math.min(actualMaxWidth, maxWidth);
    const height = lines.length * lineHeight;
    
    return {
      x: textElement.x - width / 2,
      y: textElement.y - height / 2,
      width,
      height
    };
  };
  
  const drawDesignHandles = () => {
    const currentDesignImage = designImages[currentView];
    if (!currentDesignImage || !ctx) return;
    
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(currentDesignImage.x, currentDesignImage.y, currentDesignImage.width, currentDesignImage.height);
    
    const handles = [
      { x: currentDesignImage.x, y: currentDesignImage.y },
      { x: currentDesignImage.x + currentDesignImage.width, y: currentDesignImage.y },
      { x: currentDesignImage.x, y: currentDesignImage.y + currentDesignImage.height },
      { x: currentDesignImage.x + currentDesignImage.width, y: currentDesignImage.y + currentDesignImage.height }
    ];
    
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };
  
  const drawTextHandles = () => {
    if (!textElement || !ctx) return;
    
    const textBox = getTextBoundingBox();
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);
    
    const handles = [
      { x: textBox.x, y: textBox.y },
      { x: textBox.x + textBox.width, y: textBox.y },
      { x: textBox.x, y: textBox.y + textBox.height },
      { x: textBox.x + textBox.width, y: textBox.y + textBox.height }
    ];
    
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };
  
  const drawSpriteHandles = (sprite) => {
    if (!ctx) return;
    
    const w = sprite.width || sprite.size;
    const h = sprite.height || sprite.size;
    
    const handles = [
      { x: sprite.x, y: sprite.y },
      { x: sprite.x + w, y: sprite.y },
      { x: sprite.x, y: sprite.y + h },
      { x: sprite.x + w, y: sprite.y + h }
    ];
    
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };
  
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Get the target element (the overlay div)
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate mouse position relative to the overlay
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Scale to canvas coordinates (canvas is 660x660)
    const scaleX = 660 / rect.width;
    const scaleY = 660 / rect.height;
    
    return {
      x: mouseX * scaleX,
      y: mouseY * scaleY
    };
  };
  
  const isPointInDesign = (x, y) => {
    const currentDesignImage = designImages[currentView];
    if (!currentDesignImage) return false;
    return x >= currentDesignImage.x && 
           x <= currentDesignImage.x + currentDesignImage.width &&
           y >= currentDesignImage.y && 
           y <= currentDesignImage.y + currentDesignImage.height;
  };
  
  const isPointInText = (x, y) => {
    if (!textElement) return false;
    const box = getTextBoundingBox();
    return x >= box.x && x <= box.x + box.width &&
           y >= box.y && y <= box.y + box.height;
  };
  
  const isPointInSprite = (sprite, x, y) => {
    const w = sprite.width || sprite.size;
    const h = sprite.height || sprite.size;
    return x >= sprite.x && x <= sprite.x + w &&
           y >= sprite.y && y <= sprite.y + h;
  };
  
  const getHandleAtPoint = (x, y) => {
    const currentDesignImage = designImages[currentView];
    if (!currentDesignImage) return null;
    
    const handles = [
      { x: currentDesignImage.x, y: currentDesignImage.y, corner: 'tl' },
      { x: currentDesignImage.x + currentDesignImage.width, y: currentDesignImage.y, corner: 'tr' },
      { x: currentDesignImage.x, y: currentDesignImage.y + currentDesignImage.height, corner: 'bl' },
      { x: currentDesignImage.x + currentDesignImage.width, y: currentDesignImage.y + currentDesignImage.height, corner: 'br' }
    ];
    
    for (let handle of handles) {
      const dist = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (dist < 12) return handle.corner;
    }
    return null;
  };
  
  const getTextHandleAtPoint = (x, y) => {
    if (!textElement) return null;
    
    const box = getTextBoundingBox();
    const handles = [
      { x: box.x, y: box.y, corner: 'tl' },
      { x: box.x + box.width, y: box.y, corner: 'tr' },
      { x: box.x, y: box.y + box.height, corner: 'bl' },
      { x: box.x + box.width, y: box.y + box.height, corner: 'br' }
    ];
    
    for (let handle of handles) {
      const dist = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (dist < 12) return handle.corner;
    }
    return null;
  };
  
  const getSpriteHandleAtPoint = (sprite, x, y) => {
    const w = sprite.width || sprite.size;
    const h = sprite.height || sprite.size;
    const handles = [
      { x: sprite.x, y: sprite.y, corner: 'tl' },
      { x: sprite.x + w, y: sprite.y, corner: 'tr' },
      { x: sprite.x, y: sprite.y + h, corner: 'bl' },
      { x: sprite.x + w, y: sprite.y + h, corner: 'br' }
    ];
    
    for (let handle of handles) {
      const dist = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (dist < 12) return handle.corner;
    }
    return null;
  };
  
  const constrainToPrintArea = (x, y, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x, y, width, height };
    
    const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
    const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
    
    const aspectRatio = width / height;
    let newWidth = width;
    let newHeight = height;
    
    if (newWidth > printAreaWidth) {
      newWidth = printAreaWidth;
      newHeight = newWidth / aspectRatio;
    }
    
    if (newHeight > printAreaHeight) {
      newHeight = printAreaHeight;
      newWidth = newHeight * aspectRatio;
    }
    
    let newX = Math.max(printAreaX, Math.min(x, printAreaX + printAreaWidth - newWidth));
    let newY = Math.max(printAreaY, Math.min(y, printAreaY + printAreaHeight - newHeight));
    
    return { x: newX, y: newY, width: newWidth, height: newHeight };
  };
  
  const handleMouseDown = (e) => {
    const currentDesignImage = designImages[currentView];
    if (!currentDesignImage && !textElement && sprites.length === 0) return;
    
    const pos = getMousePos(e);
    
    for (let i = sprites.length - 1; i >= 0; i--) {
      const sprite = sprites[i];
      
      if (sprite.isSelected) {
        const spriteHandle = getSpriteHandleAtPoint(sprite, pos.x, pos.y);
        if (spriteHandle) {
          saveState();
          setIsSpriteResizing(true);
          setSpriteResizeHandle(spriteHandle);
          setDragStart({ x: pos.x, y: pos.y });
          setStartDimensions({ 
            x: sprite.x, 
            y: sprite.y, 
            width: sprite.width || sprite.size, 
            height: sprite.height || sprite.size 
          });
          setSelectedLayer('sprite-' + i);
          return;
        }
      }
      
      if (isPointInSprite(sprite, pos.x, pos.y)) {
        saveState();
        setIsDesignSelected(false);
        setIsTextSelected(false);
        setSprites(sprites.map((s, idx) => ({ ...s, isSelected: idx === i })));
        setIsDragging(true);
        setDragStart({ x: pos.x, y: pos.y });
        setStartDimensions({ x: sprite.x, y: sprite.y, width: 0, height: 0 });
        setSelectedLayer('sprite-' + i);
        return;
      }
    }
    
    if (isTextSelected) {
      const textHandle = getTextHandleAtPoint(pos.x, pos.y);
      if (textHandle) {
        saveState();
        setIsTextResizing(true);
        setTextResizeHandle(textHandle);
        setDragStart({ x: pos.x, y: pos.y });
        const box = getTextBoundingBox();
        setStartDimensions({ x: box.x, y: box.y, width: box.width, height: box.height });
        return;
      }
    }
    
    if (isPointInText(pos.x, pos.y)) {
      saveState();
      setIsDesignSelected(false);
      setIsTextSelected(true);
      setSprites(sprites.map(s => ({ ...s, isSelected: false })));
      setIsTextDragging(true);
      setDragStart({ x: pos.x, y: pos.y });
      setStartDimensions({ x: textElement.x, y: textElement.y, width: 0, height: 0 });
      return;
    }
    
    if (isDesignSelected) {
      const handle = getHandleAtPoint(pos.x, pos.y);
      if (handle) {
        saveState();
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({ x: pos.x, y: pos.y });
        setStartDimensions({ 
          x: currentDesignImage.x, 
          y: currentDesignImage.y, 
          width: currentDesignImage.width, 
          height: currentDesignImage.height 
        });
        return;
      }
    }
    
    if (isPointInDesign(pos.x, pos.y)) {
      saveState();
      setIsDesignSelected(true);
      setIsTextSelected(false);
      setSprites(sprites.map(s => ({ ...s, isSelected: false })));
      setIsDragging(true);
      setDragStart({ x: pos.x, y: pos.y });
      setStartDimensions({ 
        x: currentDesignImage.x, 
        y: currentDesignImage.y, 
        width: currentDesignImage.width, 
        height: currentDesignImage.height 
      });
    } else {
      setIsDesignSelected(false);
      setIsTextSelected(false);
      setSprites(sprites.map(s => ({ ...s, isSelected: false })));
    }
  };
  
  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    const currentDesignImage = designImages[currentView];
    
    if (isDragging && isDesignSelected && currentDesignImage) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const constrained = constrainToPrintArea(
        startDimensions.x + dx,
        startDimensions.y + dy,
        currentDesignImage.width,
        currentDesignImage.height
      );
      
      setDesignImages({
        ...designImages,
        [currentView]: {
          ...currentDesignImage,
          x: constrained.x,
          y: constrained.y
        }
      });
    } else if (isResizing && currentDesignImage) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      let newWidth = startDimensions.width;
      let newHeight = startDimensions.height;
      
      const aspectRatio = startDimensions.width / startDimensions.height;
      
      if (resizeHandle === 'br') {
        newWidth = startDimensions.width + dx;
        newHeight = newWidth / aspectRatio;
      } else if (resizeHandle === 'bl') {
        newWidth = startDimensions.width - dx;
        newHeight = newWidth / aspectRatio;
        newX = startDimensions.x + dx;
      } else if (resizeHandle === 'tr') {
        newWidth = startDimensions.width + dx;
        newHeight = newWidth / aspectRatio;
        newY = startDimensions.y + startDimensions.height - newHeight;
      } else if (resizeHandle === 'tl') {
        newWidth = startDimensions.width - dx;
        newHeight = newWidth / aspectRatio;
        newX = startDimensions.x + dx;
        newY = startDimensions.y + startDimensions.height - newHeight;
      }
      
      const constrained = constrainToPrintArea(newX, newY, newWidth, newHeight);
      
      setDesignImages({
        ...designImages,
        [currentView]: {
          ...currentDesignImage,
          x: constrained.x,
          y: constrained.y,
          width: constrained.width,
          height: constrained.height
        }
      });
    } else if (isTextDragging && textElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      // Use box dimensions if available, otherwise calculate from wrapped text
      let textWidth, textHeight;
      
      if (textElement.boxWidth && textElement.boxHeight) {
        textWidth = textElement.boxWidth;
        textHeight = textElement.boxHeight;
      } else {
        ctx.font = `${textElement.size}px ${textElement.font}`;
        const canvas = canvasRef.current;
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
        const maxWidth = textElement.maxWidth || printAreaWidth;
        
        const lines = wrapText(textElement.text, maxWidth, ctx);
        const lineHeight = textElement.size * 1.2;
        
        let actualMaxWidth = 0;
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          if (metrics.width > actualMaxWidth) {
            actualMaxWidth = metrics.width;
          }
        });
        
        textWidth = Math.min(actualMaxWidth, maxWidth);
        textHeight = lines.length * lineHeight;
      }
      
      // Convert center position to top-left for constraint checking
      const newCenterX = startDimensions.x + dx;
      const newCenterY = startDimensions.y + dy;
      const topLeftX = newCenterX - textWidth / 2;
      const topLeftY = newCenterY - textHeight / 2;
      
      // Constrain the top-left corner
      const constrained = constrainToPrintArea(
        topLeftX,
        topLeftY,
        textWidth,
        textHeight
      );
      
      // Convert back from top-left to center position
      const constrainedCenterX = constrained.x + constrained.width / 2;
      const constrainedCenterY = constrained.y + constrained.height / 2;
      
      setTextElement({
        ...textElement,
        x: constrainedCenterX,
        y: constrainedCenterY
      });
    } else if (isTextResizing && textElement) {
      const canvas = canvasRef.current;
      const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
      const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
      const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
      const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
      
      // STEP 1: Define anchor point (opposite corner that MUST stay absolutely fixed)
      let anchorX, anchorY;
      
      if (textResizeHandle === 'br') {
        // Dragging bottom-right, anchor is top-left
        anchorX = startDimensions.x;
        anchorY = startDimensions.y;
      } else if (textResizeHandle === 'bl') {
        // Dragging bottom-left, anchor is top-right
        anchorX = startDimensions.x + startDimensions.width;
        anchorY = startDimensions.y;
      } else if (textResizeHandle === 'tr') {
        // Dragging top-right, anchor is bottom-left
        anchorX = startDimensions.x;
        anchorY = startDimensions.y + startDimensions.height;
      } else if (textResizeHandle === 'tl') {
        // Dragging top-left, anchor is bottom-right
        anchorX = startDimensions.x + startDimensions.width;
        anchorY = startDimensions.y + startDimensions.height;
      }
      
      // STEP 2: Calculate desired dimensions from anchor to cursor
      let desiredWidth, desiredHeight;
      
      if (textResizeHandle === 'br' || textResizeHandle === 'tr') {
        // Expanding right
        desiredWidth = pos.x - anchorX;
      } else {
        // Expanding left
        desiredWidth = anchorX - pos.x;
      }
      
      if (textResizeHandle === 'br' || textResizeHandle === 'bl') {
        // Expanding down
        desiredHeight = pos.y - anchorY;
      } else {
        // Expanding up
        desiredHeight = anchorY - pos.y;
      }
      
      // STEP 3: Constrain dimensions based on print area and anchor position
      const minHeight = 20 * 1.2;
      const minWidth = 50;
      
      let newBoxWidth = desiredWidth;
      let newBoxHeight = desiredHeight;
      
      // Apply minimum constraints
      newBoxWidth = Math.max(minWidth, newBoxWidth);
      newBoxHeight = Math.max(minHeight, newBoxHeight);
      
      // Apply maximum constraints based on print area and anchor position
      if (textResizeHandle === 'br') {
        // Anchor at top-left, can expand right and down
        const maxWidthFromAnchor = (printAreaX + printAreaWidth) - anchorX;
        const maxHeightFromAnchor = (printAreaY + printAreaHeight) - anchorY;
        newBoxWidth = Math.min(newBoxWidth, maxWidthFromAnchor);
        newBoxHeight = Math.min(newBoxHeight, maxHeightFromAnchor);
      } else if (textResizeHandle === 'bl') {
        // Anchor at top-right, can expand left and down
        const maxWidthFromAnchor = anchorX - printAreaX;
        const maxHeightFromAnchor = (printAreaY + printAreaHeight) - anchorY;
        newBoxWidth = Math.min(newBoxWidth, maxWidthFromAnchor);
        newBoxHeight = Math.min(newBoxHeight, maxHeightFromAnchor);
      } else if (textResizeHandle === 'tr') {
        // Anchor at bottom-left, can expand right and up
        const maxWidthFromAnchor = (printAreaX + printAreaWidth) - anchorX;
        const maxHeightFromAnchor = anchorY - printAreaY;
        newBoxWidth = Math.min(newBoxWidth, maxWidthFromAnchor);
        newBoxHeight = Math.min(newBoxHeight, maxHeightFromAnchor);
      } else if (textResizeHandle === 'tl') {
        // Anchor at bottom-right, can expand left and up
        const maxWidthFromAnchor = anchorX - printAreaX;
        const maxHeightFromAnchor = anchorY - printAreaY;
        newBoxWidth = Math.min(newBoxWidth, maxWidthFromAnchor);
        newBoxHeight = Math.min(newBoxHeight, maxHeightFromAnchor);
      }
      
      // Also apply absolute max constraints
      newBoxWidth = Math.min(newBoxWidth, printAreaWidth);
      newBoxHeight = Math.min(newBoxHeight, printAreaHeight);
      
      // STEP 4: Calculate final box position from anchor (anchor absolutely stays in place)
      let newBoxX, newBoxY;
      
      if (textResizeHandle === 'br') {
        newBoxX = anchorX;
        newBoxY = anchorY;
      } else if (textResizeHandle === 'bl') {
        newBoxX = anchorX - newBoxWidth;
        newBoxY = anchorY;
      } else if (textResizeHandle === 'tr') {
        newBoxX = anchorX;
        newBoxY = anchorY - newBoxHeight;
      } else if (textResizeHandle === 'tl') {
        newBoxX = anchorX - newBoxWidth;
        newBoxY = anchorY - newBoxHeight;
      }
      
      // STEP 5: Box dimensions are now FINAL - calculate font size to fit inside it
      // Font size should fill the height when text is wrapped at the box width
      let bestSize = 8;
      let low = 8;  // Allow very small text (no practical minimum)
      let high = 150;
      
      // Binary search for font size where wrapped text height equals box height
      for (let i = 0; i < 15; i++) {
        const testSize = (low + high) / 2;
        ctx.font = `${testSize}px ${textElement.font}`;
        const testLines = wrapText(textElement.text, newBoxWidth, ctx);
        const testLineHeight = testSize * 1.2;
        const testTotalHeight = testLines.length * testLineHeight;
        
        if (Math.abs(testTotalHeight - newBoxHeight) < 3) {
          bestSize = testSize;
          break;
        } else if (testTotalHeight < newBoxHeight) {
          low = testSize;
          bestSize = testSize;
        } else {
          high = testSize;
        }
      }
      
      // STEP 6: Final check - ensure text doesn't overflow the box
      ctx.font = `${bestSize}px ${textElement.font}`;
      const finalLines = wrapText(textElement.text, newBoxWidth, ctx);
      const finalLineHeight = bestSize * 1.2;
      const finalTotalHeight = finalLines.length * finalLineHeight;
      
      if (finalTotalHeight > newBoxHeight) {
        // Scale down proportionally to fit (allow any size needed)
        bestSize = bestSize * (newBoxHeight / finalTotalHeight);
        bestSize = Math.max(1, bestSize);  // Only enforce 1px absolute minimum
      }
      
      // STEP 7: Calculate center position from the FINAL box position
      const centerX = newBoxX + newBoxWidth / 2;
      const centerY = newBoxY + newBoxHeight / 2;
      
      setTextElement({
        ...textElement,
        x: centerX,
        y: centerY,
        size: bestSize,
        maxWidth: newBoxWidth,
        boxWidth: newBoxWidth,
        boxHeight: newBoxHeight
      });
    } else if (isDragging && selectedLayer && selectedLayer.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const sprite = sprites[spriteIndex];
      
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const spriteSize = sprite.size || 50;
      const constrained = constrainToPrintArea(
        startDimensions.x + dx,
        startDimensions.y + dy,
        spriteSize,
        spriteSize
      );
      
      const newSprites = [...sprites];
      newSprites[spriteIndex] = {
        ...sprite,
        x: constrained.x,
        y: constrained.y
      };
      setSprites(newSprites);
    } else if (isSpriteResizing && selectedLayer && selectedLayer.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const sprite = sprites[spriteIndex];
      
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      // Calculate new size based on which corner is being dragged
      let newSize;
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      if (spriteResizeHandle === 'br') {
        // Bottom-right: increase size, position stays
        newSize = Math.max(20, Math.max(startDimensions.width + dx, startDimensions.height + dy));
      } else if (spriteResizeHandle === 'bl') {
        // Bottom-left: increase size down and left
        const widthChange = -dx;
        newSize = Math.max(20, Math.max(startDimensions.width + widthChange, startDimensions.height + dy));
        newX = startDimensions.x - (newSize - startDimensions.width);
      } else if (spriteResizeHandle === 'tr') {
        // Top-right: increase size up and right
        const heightChange = -dy;
        newSize = Math.max(20, Math.max(startDimensions.width + dx, startDimensions.height + heightChange));
        newY = startDimensions.y - (newSize - startDimensions.height);
      } else if (spriteResizeHandle === 'tl') {
        // Top-left: increase size up and left
        const widthChange = -dx;
        const heightChange = -dy;
        newSize = Math.max(20, Math.max(startDimensions.width + widthChange, startDimensions.height + heightChange));
        newX = startDimensions.x - (newSize - startDimensions.width);
        newY = startDimensions.y - (newSize - startDimensions.height);
      } else {
        newSize = startDimensions.width;
      }
      
      // Check if new size would fit in print area
      const canvas = canvasRef.current;
      if (canvas) {
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
        const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
        const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
        const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
        
        // Ensure sprite stays within bounds
        if (newX + newSize > printAreaX + printAreaWidth) {
          newSize = printAreaX + printAreaWidth - newX;
        }
        if (newY + newSize > printAreaY + printAreaHeight) {
          newSize = printAreaY + printAreaHeight - newY;
        }
        if (newX < printAreaX) {
          newSize = newSize - (printAreaX - newX);
          newX = printAreaX;
        }
        if (newY < printAreaY) {
          newSize = newSize - (printAreaY - newY);
          newY = printAreaY;
        }
        // Also constrain to not exceed print area dimensions
        newSize = Math.min(newSize, printAreaWidth, printAreaHeight);
      }
      
      const newSprites = [...sprites];
      newSprites[spriteIndex] = {
        ...sprite,
        x: newX,
        y: newY,
        size: newSize,
        width: newSize,
        height: newSize
      };
      setSprites(newSprites);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsTextDragging(false);
    setIsTextResizing(false);
    setIsSpriteResizing(false);
    setResizeHandle(null);
    setTextResizeHandle(null);
    setSpriteResizeHandle(null);
  };
  
  const handleGenerateDesign = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0) {
      setError('Please enter a prompt or upload an image');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Get creator session for token tracking
      const creatorSession = getCreatorSession();
      
      const response = await fetch(`${API_BASE_URL}/api/generate-sd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'A t-shirt design',
          images: uploadedImages.map(img => img.data),  // Send array of base64 images
          creatorId: creatorSession?.uid  // Send creator ID for token tracking
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      
      // Load generated image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
        const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
        
        // Calculate height based on image aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const designWidth = printAreaWidth;
        const designHeight = designWidth / aspectRatio;
        
        // Constrain to fit within print area (maintains aspect ratio)
        const constrained = constrainToPrintArea(printAreaX, printAreaY, designWidth, designHeight);
        
        const newDesignImage = {
          img,
          url: data.imageUrl,
          x: constrained.x,
          y: constrained.y,
          width: constrained.width,
          height: constrained.height
        };
        
        setDesignImages({
          ...designImages,
          [currentView]: newDesignImage
        });
        
        // Add to history (keep max 5 items)
        const historyItem = {
          url: data.imageUrl,
          image: data.imageUrl,  // Store the URL string, not the Image object
          prompt: prompt,
          timestamp: Date.now()
        };
        
        setDesignHistory(prev => {
          const newHistory = [historyItem, ...prev];
          return newHistory.slice(0, 5);
        });
        
        setCurrentHistoryIndex(0);
      };
      img.src = data.imageUrl;
      
    } catch (err) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Validate all files are images
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('Please upload only image files');
      return;
    }
    
    // Limit to 5 images
    if (uploadedImages.length + files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    
    setUploadedFiles([...uploadedFiles, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        
        // Create a temporary image to test if it loads
        const testImg = new Image();
        testImg.onload = () => {
          // Add to uploaded images array with proper structure
          setUploadedImages(prev => [...prev, {
            data: imageData,
            name: file.name,
            width: testImg.width,
            height: testImg.height
          }]);
        };
        testImg.onerror = (err) => {
          console.error('Test image failed to load:', err);
          setError(`${file.name}: Browser cannot display this image format. Please use JPG, PNG, or WebP.`);
        };
        testImg.src = imageData;
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        setError(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const handleAddText = () => {
    if (!textInput.trim()) return;
    
    saveState();
    const canvas = canvasRef.current;
    
    // Place text in the center of the print area
    const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
    const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
    
    // Calculate initial dimensions for the text box
    ctx.font = `${fontSize}px ${textFont}`;
    const naturalWidth = ctx.measureText(textInput).width;
    const initialWidth = Math.min(Math.max(naturalWidth, 100), printAreaWidth);
    const initialHeight = Math.min(fontSize * 1.2, printAreaHeight);
    
    // Calculate font size that fits within the initial container
    let bestSize = fontSize;
    let low = 8;
    let high = 150;
    
    // Binary search for font size that fits the box
    for (let i = 0; i < 15; i++) {
      const testSize = (low + high) / 2;
      ctx.font = `${testSize}px ${textFont}`;
      const testLines = wrapText(textInput, initialWidth, ctx);
      const testLineHeight = testSize * 1.2;
      const testTotalHeight = testLines.length * testLineHeight;
      
      if (Math.abs(testTotalHeight - initialHeight) < 3) {
        bestSize = testSize;
        break;
      } else if (testTotalHeight < initialHeight) {
        low = testSize;
        bestSize = testSize;
      } else {
        high = testSize;
      }
    }
    
    // Final check - ensure text doesn't overflow
    ctx.font = `${bestSize}px ${textFont}`;
    const finalLines = wrapText(textInput, initialWidth, ctx);
    const finalLineHeight = bestSize * 1.2;
    const finalTotalHeight = finalLines.length * finalLineHeight;
    
    if (finalTotalHeight > initialHeight) {
      bestSize = bestSize * (initialHeight / finalTotalHeight);
      bestSize = Math.max(1, bestSize);
    }
    
    const newText = {
      text: textInput,
      x: printAreaX + printAreaWidth / 2,
      y: printAreaY + printAreaHeight / 2,
      size: bestSize,  // Use calculated size, not user's fontSize
      font: textFont,
      color: textColor,
      warpStyle: textWarpStyle,
      maxWidth: initialWidth,
      boxWidth: initialWidth,
      boxHeight: initialHeight
    };
    
    setTextElement(newText);
    setShowTextEditor(false);
    setTextInput('');
    setIsTextSelected(true);
  };
  
  const handleAddSprite = (emoji) => {
    saveState();
    const canvas = canvasRef.current;
    
    // Place sprite in the center of the print area
    const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
    const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
    
    const newSprite = {
      emoji,
      x: printAreaX + printAreaWidth / 2 - 30,
      y: printAreaY + printAreaHeight / 2 - 30,
      size: 60,
      width: 60,
      height: 60,
      isSelected: false
    };
    
    setSprites([...sprites, newSprite]);
    setShowSpritePanel(false);
  };
  
  const handleLoadFromHistory = (item, index) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      saveState();
      const canvas = canvasRef.current;
      const printAreaX = canvas.width * PRINT_AREA_CONFIG[currentView].x;
      const printAreaY = canvas.height * PRINT_AREA_CONFIG[currentView].y;
      const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[currentView].width;
      const printAreaHeight = canvas.height * PRINT_AREA_CONFIG[currentView].height;
      
      // Calculate dimensions based on image aspect ratio
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let designWidth = printAreaWidth;
      let designHeight = designWidth / aspectRatio;
      
      // If height exceeds print area, scale down based on height
      if (designHeight > printAreaHeight) {
        designHeight = printAreaHeight;
        designWidth = designHeight * aspectRatio;
      }
      
      // Center the design within the print area
      const designX = printAreaX + (printAreaWidth - designWidth) / 2;
      const designY = printAreaY + (printAreaHeight - designHeight) / 2;
      
      const newDesign = {
        img,
        url: item.url || item.image,
        x: designX,
        y: designY,
        width: designWidth,
        height: designHeight
      };
      
      setDesignImages({
        ...designImages,
        [currentView]: newDesign
      });
      setCurrentHistoryIndex(index);
      if (item.prompt) {
        setPrompt(item.prompt);
      }
    };
    img.src = item.url || item.image;
  };
  
  // Helper function to draw ONLY the design (no t-shirt template) for Printify
  // Scaled up to Printify's print area dimensions (3951x4800px @ 300dpi)
  const drawDesignOnlyView = (view) => {
    if (!canvasRef.current) return null;
    
    // Create a high-resolution canvas for Printify
    const printifyWidth = 4500;  // High-res width
    const printifyHeight = 5400; // High-res height  
    const scale = printifyWidth / 660; // Scale factor from editor canvas
    
    const hiResCanvas = document.createElement('canvas');
    hiResCanvas.width = printifyWidth;
    hiResCanvas.height = printifyHeight;
    const tempCtx = hiResCanvas.getContext('2d');
    
    // Clear canvas with transparent background
    tempCtx.clearRect(0, 0, printifyWidth, printifyHeight);
    
    // Get the print area for this view (scaled up)
    const printArea = PRINT_AREA_CONFIG[view];
    const printAreaX = printifyWidth * printArea.x;
    const printAreaY = printifyHeight * printArea.y;
    const printAreaWidth = printifyWidth * printArea.width;
    const printAreaHeight = printifyHeight * printArea.height;
    
    // Draw design on transparent canvas (use the design for this specific view, scaled up)
    const viewDesign = designImages[view];
    if (viewDesign) {
      tempCtx.drawImage(
        viewDesign.img, 
        viewDesign.x * scale, 
        viewDesign.y * scale, 
        viewDesign.width * scale, 
        viewDesign.height * scale
      );
    }
    
    // Draw sprites for this view (scaled up)
    const viewSprites = spritesPerView[view];
    viewSprites.forEach((sprite) => {
      tempCtx.font = `${sprite.size * scale}px Arial`;
      tempCtx.textAlign = 'left';
      tempCtx.textBaseline = 'top';
      tempCtx.fillText(sprite.emoji, sprite.x * scale, sprite.y * scale);
    });
    
    // Draw text for this view (scaled up)
    const viewText = textElements[view];
    if (viewText) {
      tempCtx.font = `${viewText.size * scale}px ${viewText.font}`;
      tempCtx.fillStyle = viewText.color;
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      
      if (viewText.warpStyle === 'arc') {
        // Scale coordinates and size for arc text
        drawArcText(viewText.text, viewText.x * scale, viewText.y * scale, viewText.size * scale, tempCtx);
      } else if (viewText.warpStyle === 'wave') {
        // Scale coordinates and size for wave text
        drawWaveText(viewText.text, viewText.x * scale, viewText.y * scale, viewText.size * scale, tempCtx);
      } else if (viewText.warpStyle === 'circle') {
        // Scale coordinates and size for circle text
        drawCircleText(viewText.text, viewText.x * scale, viewText.y * scale, viewText.size * scale, tempCtx);
      } else {
        // Use text's maxWidth if available, otherwise use print area width (scaled)
        const maxWidth = viewText.maxWidth ? viewText.maxWidth * scale : printAreaWidth;
        
        // Wrap text if needed
        const lines = wrapText(viewText.text, maxWidth, tempCtx);
        const lineHeight = viewText.size * scale * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = (viewText.y * scale) - (totalHeight / 2) + (lineHeight / 2);
        
        // Draw each line centered
        lines.forEach((line, index) => {
          const y = startY + (index * lineHeight);
          tempCtx.fillText(line, viewText.x * scale, y);
        });
      }
    }
    
    // Capture and return the high-resolution image
    try {
      return hiResCanvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error capturing design-only canvas:', e);
      return null;
    }
  };
  
  // Helper function to draw a specific view directly on canvas without changing state (with t-shirt)
  const drawCanvasView = (view) => {
    if (!ctx || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    // Draw t-shirt background
    const tshirtImg = view === 'front' ? tshirtImages.front :
                      view === 'back' ? tshirtImages.back :
                      view === 'leftSleeve' ? tshirtImages.leftSleeve :
                      view === 'rightSleeve' ? tshirtImages.rightSleeve :
                      view === 'neckLabel' ? tshirtImages.neckLabel :
                      tshirtImages.front;
    
    if (tshirtImg) {
      ctx.drawImage(tshirtImg, 0, 0, w, h);
    }
    
    // Draw design on the shirt (use the design for this specific view)
    const viewDesign = designImages[view];
    if (viewDesign) {
      ctx.drawImage(viewDesign.img, viewDesign.x, viewDesign.y, viewDesign.width, viewDesign.height);
    }
    
    // Draw sprites for this view (no selection handles)
    const viewSprites = spritesPerView[view];
    viewSprites.forEach((sprite) => {
      ctx.font = `${sprite.size}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sprite.emoji, sprite.x, sprite.y);
    });
    
    // Draw text for this view (no selection handles)
    const viewText = textElements[view];
    if (viewText) {
      ctx.font = `${viewText.size}px ${viewText.font}`;
      ctx.fillStyle = viewText.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (viewText.warpStyle === 'arc') {
        drawArcText(viewText.text, viewText.x, viewText.y, viewText.size);
      } else if (viewText.warpStyle === 'wave') {
        drawWaveText(viewText.text, viewText.x, viewText.y, viewText.size);
      } else if (viewText.warpStyle === 'circle') {
        drawCircleText(viewText.text, viewText.x, viewText.y, viewText.size);
      } else {
        // Use text's maxWidth if available, otherwise use print area width
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG[view].width;
        const maxWidth = viewText.maxWidth || printAreaWidth;
        
        // Wrap text if needed
        const lines = wrapText(viewText.text, maxWidth, ctx);
        const lineHeight = viewText.size * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = viewText.y - (totalHeight / 2) + (lineHeight / 2);
        
        // Draw each line centered
        lines.forEach((line, index) => {
          const y = startY + (index * lineHeight);
          ctx.fillText(line, viewText.x, y);
        });
      }
    }
    
    // Capture and return the image
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error capturing canvas:', e);
      return null;
    }
  };

  const handleNext = async () => {
    // Check if at least one view has a design
    const hasAnyDesign = Object.values(designImages).some(design => design !== null);
    if (!hasAnyDesign) {
      setError('Please create a design first');
      return;
    }
    
    try {
      // Show loading state
      setIsGenerating(true);
      setError('');
      
      console.log('📸 Capturing all 5 views in background...');
      
      // Capture each view directly without changing UI state
      const frontImage = drawCanvasView('front');
      console.log('✓ Front captured');
      
      const backImage = drawCanvasView('back');
      console.log('✓ Back captured');
      
      const leftSleeveImage = drawCanvasView('leftSleeve');
      console.log('✓ Left sleeve captured');
      
      const rightSleeveImage = drawCanvasView('rightSleeve');
      console.log('✓ Right sleeve captured');
      
      const neckLabelImage = drawCanvasView('neckLabel');
      console.log('✓ Neck label captured');
      
      // Verify all images were captured
      if (!frontImage || !backImage || !leftSleeveImage || !rightSleeveImage || !neckLabelImage) {
        throw new Error('Failed to capture one or more views');
      }
      
      // Store all captured images
      setCachedViewImages({
        front: frontImage,
        back: backImage,
        leftSleeve: leftSleeveImage,
        rightSleeve: rightSleeveImage,
        neckLabel: neckLabelImage
      });
      
      console.log('✅ All 5 views captured and cached!');
      
      // Fetch Printify variants from backend and store in session cookie
      console.log('🔄 Fetching Printify variants from backend...');
      console.log('📍 API URL:', `${API_BASE_URL}/api/printify/variants`);
      try {
        const response = await fetch(`${API_BASE_URL}/api/printify/variants`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const variantsData = await response.json();
          setPrintifyVariants(variantsData);
          console.log('✅ Printify variants fetched and stored in session cookie');
          console.log('📦 Variants data:', variantsData);
        } else {
          console.error('❌ Failed to fetch Printify variants:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error details:', errorText);
        }
      } catch (printifyError) {
        console.error('❌ Error fetching Printify variants:', printifyError);
        // Don't block the user from proceeding if Printify API fails
      }
      
      // Reset canvas back to front view (redraw with current state)
      drawCanvas();
      
      // Transition to options step
      setCurrentStep('options');
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Error capturing views:', error);
      setError('Failed to prepare images. Please try again.');
      setIsGenerating(false);
    }
  };
  
  const handleBack = () => {
    if (currentStep === 'options') {
      setCurrentStep('design');
      // Force canvas redraw when returning to design step
      setTimeout(() => {
        drawCanvas();
      }, 0);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleSaveProduct = async () => {
    // Validate required fields
    if (!productTitle.trim()) {
      setError('Please enter a product title');
      return;
    }
    
    if (!productPrice || parseFloat(productPrice) <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    if (availableColors.length === 0) {
      setError('Please select at least one color');
      return;
    }
    
    if (availableSizes.length === 0) {
      setError('Please select at least one size');
      return;
    }
    
    // Check if images were cached
    if (!cachedViewImages) {
      setError('Images not ready. Please go back and try again.');
      return;
    }
    
    try {
      // Show loading state
      setIsGenerating(true);
      setError('');
      setNotification('Step 1/4: Uploading designs to Printify...');
      
      // Get creator session data
      const creatorSession = getCreatorSession();
      if (!creatorSession) {
        setError('Session expired. Please log in again.');
        setIsGenerating(false);
        return;
      }
      
      // Step 1: Upload non-null designs to Printify (design-only, no t-shirt template)
      console.log('📤 Step 1: Uploading designs to Printify...');
      const uploadedImageIds = {};
      const editorImages = [];
      
      // First, capture design-only images (without t-shirt template) for Printify
      const viewsToUpload = ['front', 'back', 'leftSleeve', 'rightSleeve', 'neckLabel'];
      
      for (const view of viewsToUpload) {
        // Only upload if the design has actual content
        if (designImages[view] || textElements[view] || spritesPerView[view]?.length > 0) {
          console.log(`  Capturing and uploading ${view} design...`);
          
          // Capture design-only image (transparent background, no t-shirt)
          const designOnlyImage = drawDesignOnlyView(view);
          
          if (!designOnlyImage) {
            console.warn(`  ⚠️ Failed to capture ${view} design, skipping...`);
            continue;
          }
          
          // Keep the full canvas image (with t-shirt) for mockup carousel
          if (cachedViewImages && cachedViewImages[view]) {
            editorImages.push({ data: cachedViewImages[view], view });
          }
          
          try {
            const uploadResponse = await fetch(`${API_BASE_URL}/api/printify/upload-image`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData: designOnlyImage,  // Send design-only image
                fileName: `${productTitle}-${view}.png`,
                creatorId: creatorSession.uid
              })
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${view} design`);
            }
            
            const uploadResult = await uploadResponse.json();
            uploadedImageIds[view] = uploadResult.imageId;
            console.log(`  ✅ Uploaded ${view}: ${uploadResult.imageId}`);
          } catch (uploadError) {
            console.error(`Error uploading ${view}:`, uploadError);
            // Continue with other uploads
          }
        }
      }
      
      if (Object.keys(uploadedImageIds).length === 0) {
        throw new Error('No designs to upload. Please add at least one design.');
      }
      
      console.log('✅ All designs uploaded:', uploadedImageIds);
      
      // Step 2: Build variants from selected colors and sizes
      setNotification('Step 2/4: Building product variants...');
      console.log('🔧 Step 2: Building variants...');
      
      const variantsData = getPrintifyVariants();
      if (!variantsData || !variantsData.variants) {
        throw new Error('Variants data not available. Please refresh and try again.');
      }
      
      // Map selected colors and sizes to Printify variant IDs
      const selectedVariants = [];
      for (const color of availableColors) {
        for (const size of availableSizes) {
          // Find matching variant
          const variant = variantsData.variants.find(v => 
            v.options.color.toLowerCase() === color.toLowerCase() &&
            v.options.size === size
          );
          
          if (variant) {
            selectedVariants.push({
              id: variant.id,
              price: Math.round(parseFloat(productPrice) * 100), // Convert to cents
              is_enabled: true
            });
          }
        }
      }
      
      if (selectedVariants.length === 0) {
        throw new Error('No matching variants found. Please check your color and size selections.');
      }
      
      console.log(`✅ Built ${selectedVariants.length} variants`);
      
      // Step 3: Create Printify product
      setNotification('Step 3/4: Creating product in Printify...');
      console.log('🎨 Step 3: Creating Printify product...');
      
      const createProductResponse = await fetch(`${API_BASE_URL}/api/printify/create-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: productTitle,
          description: productDescription,
          uploadedImageIds: uploadedImageIds,
          variants: selectedVariants,
          blueprintId: 6,
          printProviderId: 99
        })
      });
      
      if (!createProductResponse.ok) {
        const errorData = await createProductResponse.json();
        throw new Error(errorData.error || 'Failed to create Printify product');
      }
      
      const createProductResult = await createProductResponse.json();
      const productId = createProductResult.productId;
      console.log(`✅ Printify product created: ${productId}`);
      
      // Step 4: Fetch product with mockups
      setNotification('Step 4/4: Generating mockups...');
      console.log('🖼️ Step 4: Fetching product with mockups...');
      
      const getProductResponse = await fetch(`${API_BASE_URL}/api/printify/product/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!getProductResponse.ok) {
        throw new Error('Failed to fetch product mockups');
      }
      
      const productData = await getProductResponse.json();
      console.log(`✅ Product fetched with ${productData.product.mockups?.length || 0} mockups`);
      
      // Combine editor images with mockups
      const allImages = [
        ...editorImages,
        ...(productData.product.mockups || []).map(mockup => ({ src: mockup.src, type: 'mockup' }))
      ];
      
      // Show mockup carousel
      setMockupImages(allImages);
      setPrintifyProductId(productId);
      setShowMockupCarousel(true);
      setIsGenerating(false);
      setNotification('');
      
    } catch (error) {
      console.error('Error creating product:', error);
      setError(error.message || 'Failed to create product. Please try again.');
      setIsGenerating(false);
      setNotification('');
    }
  };
  
  const handleApproveMockups = async () => {
    try {
      setIsGenerating(true);
      setNotification('Publishing to Shopify...');
      
      // Get creator session data
      const creatorSession = getCreatorSession();
      if (!creatorSession) {
        setError('Session expired. Please log in again.');
        setIsGenerating(false);
        return;
      }
      
      // Create product in Shopify using existing endpoint
      // This includes: mockup images + editor images, creator collection, metafields
      console.log('🚀 Creating product in Shopify...');
      
      // Prepare product data with all images (editor + mockups)
      const allImages = mockupImages.map(img => ({
        data: img.src || img.data,  // Mockups have 'src', editor images have 'data'
        view: img.view || (img.type === 'mockup' ? 'mockup' : 'editor')
      }));
      
      const productData = {
        images: allImages,
        title: productTitle,
        description: productDescription,
        price: parseFloat(productPrice),
        availableColors,
        availableSizes,
        timestamp: new Date().toISOString(),
        printifyProductId: printifyProductId  // Store for reference
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/shopify/create-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productData: productData,
          creatorId: creatorSession.uid
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create product in Shopify');
      }
      
      const result = await createResponse.json();
      console.log('✅ Product created in Shopify:', result);
      
      // Step 2: Link Printify product to Shopify product for auto-fulfillment
      setNotification('Linking to Printify for fulfillment...');
      console.log('🔗 Linking Printify product to Shopify...');
      
      try {
        const linkResponse = await fetch(`${API_BASE_URL}/api/printify/link-to-shopify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            printifyProductId: printifyProductId,
            shopifyProductId: result.product.id
          })
        });
        
        if (linkResponse.ok) {
          const linkResult = await linkResponse.json();
          console.log('✅ Printify product linked to Shopify:', linkResult);
        } else {
          console.warn('⚠️ Failed to link Printify product, but Shopify product was created');
        }
      } catch (linkError) {
        console.error('Error linking Printify product:', linkError);
        // Don't fail the whole flow if linking fails
      }
      
      setIsGenerating(false);
      setNotification('');
      
      // Call the original onSave callback with result
      if (onSave) {
        onSave(result);
      }
      
    } catch (error) {
      console.error('Error creating product in Shopify:', error);
      setError(error.message || 'Failed to create product. Please try again.');
      setIsGenerating(false);
      setNotification('');
    }
  };
  
  const handleRejectMockups = () => {
    setShowMockupCarousel(false);
    setMockupImages([]);
    setPrintifyProductId(null);
    setCurrentMockupIndex(0);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Keep canvas always rendered but hidden when not in use */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <canvas
          ref={canvasRef}
          width={660}
          height={660}
        />
        <canvas
          ref={previewCanvasRef}
          width={660}
          height={660}
        />
      </div>

      {currentStep === 'design' ? (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="w-10 h-10 glass-button rounded-lg flex items-center justify-center hover:shadow-glow transition-all disabled:opacity-30"
                  title="Undo"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="w-10 h-10 glass-button rounded-lg flex items-center justify-center hover:shadow-glow transition-all disabled:opacity-30"
                  title="Redo"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="glass-button px-6 py-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </span>
                </button>
                <button onClick={handleNext} disabled={isGenerating} className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="flex items-center gap-2">
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-20 flex h-screen">
            <div className="fixed left-0 top-20 bottom-0 w-20 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col items-center py-6 gap-4">
              <button
                onClick={() => document.getElementById('image-upload-input').click()}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  activeToolbarItem === 'upload' ? 'bg-purple-bright shadow-glow' : 'hover:bg-white/5'
                }`}
                title="Upload"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-xs text-white/60 mt-1">Upload</span>
              </button>

              <button
                onClick={() => setActiveToolbarItem('ai')}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  activeToolbarItem === 'ai' ? 'bg-purple-bright shadow-glow' : 'hover:bg-white/5'
                }`}
                title="AI"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs text-white/60 mt-1">AI</span>
              </button>

              <button
                onClick={() => {
                  setActiveToolbarItem('text');
                  setShowTextEditor(true);
                }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  activeToolbarItem === 'text' ? 'bg-purple-bright shadow-glow' : 'hover:bg-white/5'
                }`}
                title="Add Text"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="text-xs text-white/60 mt-1">Text</span>
              </button>

              <button
                onClick={() => {
                  setActiveToolbarItem('stickers');
                  setShowSpritePanel(true);
                }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  activeToolbarItem === 'stickers' ? 'bg-purple-bright shadow-glow' : 'hover:bg-white/5'
                }`}
                title="Stickers"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-white/60 mt-1">Stickers</span>
              </button>
            </div>

            <div className="flex-1 ml-20 mr-80 flex flex-col items-center justify-center p-8">
              <div className="glass-card p-4 rounded-2xl relative">
                {canvasImageUrl ? (
                  <>
                    <img
                      src={canvasImageUrl}
                      alt="Design Canvas"
                      className="rounded-lg shadow-2xl"
                      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                    />
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      style={{ top: '16px', left: '16px', right: '16px', bottom: '16px' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                  </>
                ) : (
                  <div className="w-[660px] h-[660px] flex items-center justify-center text-white/40">
                    Loading canvas...
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('front')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'front' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.front && <img src={tFrontImg} alt="Front" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Front</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('back')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'back' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.back && <img src={tBackImg} alt="Back" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Back</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('leftSleeve')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'leftSleeve' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.leftSleeve && <img src={tSleeveImg} alt="Left Sleeve" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Left Sleeve</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('rightSleeve')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'rightSleeve' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.rightSleeve && <img src={tSleeveImg} alt="Right Sleeve" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Right Sleeve</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('neckLabel')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'neckLabel' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.neckLabel && <img src={tNeckLabelImg} alt="Neck Label" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Neck Label</p>
                </button>
              </div>
            </div>

            <div className="fixed right-0 top-20 bottom-0 w-80 glass-card rounded-none border-r-0 border-t-0 border-b-0 p-6 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-6">Design Tools</h2>

              <div className="space-y-4 mb-6">
                {/* Uploaded Images Shelf - Above Upload Button */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="glass-card p-3 rounded-xl relative flex items-center gap-3 w-full">
                        <button
                          onClick={() => {
                            setUploadedImages(uploadedImages.filter((_, i) => i !== idx));
                            // Reset file input to allow re-uploading the same file
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-600 transition-colors z-10"
                          title="Remove image"
                        >
                          ×
                        </button>
                        
                        <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img 
                            src={img.data} 
                            alt={img.name || `Image ${idx + 1}`} 
                            className="max-w-full max-h-full object-contain" 
                          />
                        </div>
                        
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-bold text-white mb-1">Image {idx + 1}</p>
                          <p className="text-xs text-white/60">{img.width} × {img.height}</p>
                          <p className="text-xs text-white/60 truncate">{img.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-input"
                  />
                  <label
                    htmlFor="image-upload-input"
                    className="w-full glass-button py-3 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Images
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">AI Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your design..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright resize-none"
                    rows={4}
                  />
                </div>
                
                <button
                  onClick={handleGenerateDesign}
                  disabled={isGenerating}
                  className="w-full btn-primary py-3"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating...
                    </span>
                  ) : (
                    'Generate Design'
                  )}
                </button>
              </div>

              {designHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white/80 mb-3">Design History ({designHistory.length})</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    {designHistory.map((item, index) => (
                      <button
                        key={item.timestamp}
                        onClick={() => handleLoadFromHistory(item, index)}
                        className={`flex-shrink-0 glass-card p-1 rounded-lg overflow-hidden hover:shadow-glow transition-all ${
                          currentHistoryIndex === index ? 'ring-2 ring-purple-bright shadow-glow' : ''
                        }`}
                        title={item.prompt || 'Design'}
                      >
                        <img 
                          src={item.image} 
                          alt={`History ${index + 1}`} 
                          className="w-20 h-20 object-cover rounded"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {notification && (
                <div className="glass-card p-4 rounded-lg bg-green-500/20 border-green-500/30 mb-4">
                  <p className="text-sm text-green-300">{notification}</p>
                </div>
              )}

              {error && (
                <div className="glass-card p-4 rounded-lg bg-red-500/20 border-red-500/30 relative">
                  <button
                    onClick={() => setError('')}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-red-300 hover:text-red-200 transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-sm text-red-300 pr-6">{error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="fixed bottom-6 left-24 z-40">
            <div 
              className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${
                isPreviewExpanded ? 'h-[calc(100vh-8rem)]' : 'w-32 h-32'
              }`}
              style={isPreviewExpanded ? { aspectRatio: '1 / 1' } : {}}
            >
              <div className="relative w-full h-full bg-white/5 flex items-center justify-center">
                <button
                  onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                  className="absolute top-2 right-2 w-8 h-8 glass-button rounded-lg flex items-center justify-center z-10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isPreviewExpanded ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                </button>
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  {/* Realistic T-shirt background */}
                  <div className="relative w-full h-full">
                    <img
                      src={
                        currentView === 'front' ? tFrontRealisticImg :
                        currentView === 'back' ? tBackRealisticImg :
                        currentView === 'leftSleeve' || currentView === 'rightSleeve' ? tSleeveRealisticImg :
                        currentView === 'neckLabel' ? tNeckRealisticImg :
                        tFrontRealisticImg
                      }
                      alt={`${currentView} realistic`}
                      className="w-full h-full object-contain"
                    />
                    {/* Design overlay - positioned according to print area */}
                    {designOnlyImageUrl && (
                      <img
                        src={designOnlyImageUrl}
                        alt="Design Preview"
                        className="absolute pointer-events-none"
                        style={{
                          mixBlendMode: 'normal',
                          ...(currentView === 'neckLabel' ? {
                            // Position overlay specifically on the white neck label area
                            top: '14%',
                            left: '20%',
                            width: '65%',
                            height: '50%',
                            objectFit: 'contain',
                            transform: 'rotate(10deg)',
                            transformOrigin: 'center'
                          } : {
                            // Default positioning for other views
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          })
                        }}
                      />
                    )}
                  </div>
                </div>
                {!isPreviewExpanded && (
                  <div className="absolute bottom-2 left-2 right-2 text-center">
                  </div>
                )}
              </div>
            </div>
          </div>

          {showTextEditor && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="glass-card p-8 rounded-2xl max-w-md w-full mx-4">
                <h3 className="text-2xl font-bold text-white mb-6">Add Text</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Text</label>
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Enter your text..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Font</label>
                    <select
                      value={textFont}
                      onChange={(e) => setTextFont(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-bright"
                    >
                      {fonts.map(font => (
                        <option key={font} value={font} className="bg-purple-dark">{font}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Size: {fontSize}px</label>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Color</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Warp Style</label>
                    <select
                      value={textWarpStyle}
                      onChange={(e) => setTextWarpStyle(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-bright"
                    >
                      {warpStyles.map(style => (
                        <option key={style} value={style} className="bg-purple-dark">{style.charAt(0).toUpperCase() + style.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={handleAddText} className="flex-1 btn-primary py-3">
                      Add Text
                    </button>
                    <button 
                      onClick={() => setShowTextEditor(false)} 
                      className="flex-1 glass-button py-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSpritePanel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="glass-card p-8 rounded-2xl max-w-2xl w-full mx-4">
                <h3 className="text-2xl font-bold text-white mb-6">Add Sticker</h3>
                
                <div className="grid grid-cols-6 gap-4 mb-6 max-h-96 overflow-y-auto">
                  {availableEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddSprite(emoji)}
                      className="glass-card p-4 rounded-xl hover:shadow-glow transition-all text-4xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowSpritePanel(false)} 
                  className="w-full glass-button py-3"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Canvas Preview */}
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">Design Preview</h3>
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    {canvasImageUrl ? (
                      <img
                        src={canvasImageUrl}
                        alt="Design Preview"
                        className="w-full h-auto rounded-lg"
                        style={{ maxWidth: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-white/40">
                        Loading preview...
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Thumbnails */}
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">View Options</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setCurrentView('front')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'front' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tFrontImg} 
                        alt="Front" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Front</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('back')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'back' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tBackImg} 
                        alt="Back" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Back</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('leftSleeve')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'leftSleeve' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tSleeveImg} 
                        alt="Left Sleeve" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Left Sleeve</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('rightSleeve')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'rightSleeve' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tSleeveImg} 
                        alt="Right Sleeve" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Right Sleeve</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('neckLabel')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'neckLabel' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tNeckLabelImg} 
                        alt="Neck Label" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Neck Label</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Product Options */}
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-2xl font-bold text-white mb-6">Product Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Product Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="e.g., Awesome T-Shirt Design"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                      <textarea
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Describe your product..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright resize-none"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Price (USD) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="29.99"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative z-40">
                  <h3 className="text-lg font-bold text-white mb-2">Available Colors</h3>
                  <p className="text-white/60 text-sm mb-4">
                    Search and select colors ({printifyColors.length} available)
                  </p>
                  
                  {/* Selected Colors Tags */}
                  {availableColors.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <div 
                          key={color}
                          className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg bg-purple-mid/20 border-purple-bright/30"
                        >
                          <span className="text-white text-sm">{color}</span>
                          <button
                            onClick={() => setAvailableColors(availableColors.filter(c => c !== color))}
                            className="text-white/60 hover:text-white transition-colors"
                            aria-label={`Remove ${color}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Search Input with Dropdown */}
                  <div className="relative z-50">
                    <input
                      type="text"
                      value={colorSearchTerm}
                      onChange={(e) => {
                        setColorSearchTerm(e.target.value);
                        setShowColorDropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => colorSearchTerm.length > 0 && setShowColorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowColorDropdown(false), 200)}
                      placeholder="Search colors..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright transition-all"
                    />
                    
                    {/* Search Results Dropdown */}
                    {showColorDropdown && colorSearchTerm && printifyColors.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-purple-deep/95 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden max-h-64 overflow-y-auto custom-scrollbar shadow-2xl">
                        {printifyColors
                          .filter(color => 
                            color.toLowerCase().includes(colorSearchTerm.toLowerCase()) &&
                            !availableColors.includes(color)
                          )
                          .slice(0, 10)
                          .map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setAvailableColors([...availableColors, color]);
                                setColorSearchTerm('');
                                setShowColorDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left text-white hover:bg-purple-mid/20 transition-colors border-b border-white/5 last:border-b-0"
                            >
                              {color}
                            </button>
                          ))}
                        
                        {printifyColors.filter(color => 
                          color.toLowerCase().includes(colorSearchTerm.toLowerCase()) &&
                          !availableColors.includes(color)
                        ).length === 0 && (
                          <div className="px-4 py-3 text-white/40 text-sm text-center">
                            {availableColors.some(c => c.toLowerCase() === colorSearchTerm.toLowerCase()) 
                              ? 'Color already selected'
                              : 'No colors found'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Helper text */}
                  <p className="text-white/40 text-xs mt-2">
                    {availableColors.length === 0 
                      ? 'Start typing to search and add colors'
                      : `${availableColors.length} color${availableColors.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Available Sizes</h3>
                  <p className="text-white/60 text-sm mb-4">Select which sizes customers can choose from</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {sizes.map(size => (
                      <label key={size} className="flex items-center gap-2 glass-card px-4 py-3 rounded-lg cursor-pointer hover:shadow-glow transition-all">
                        <input
                          type="checkbox"
                          checked={availableSizes.includes(size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailableSizes([...availableSizes, size]);
                            } else {
                              setAvailableSizes(availableSizes.filter(s => s !== size));
                            }
                          }}
                          className="w-4 h-4 text-purple-bright rounded focus:ring-purple-bright"
                        />
                        <span className="text-white/80">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSaveProduct} 
                    disabled={isGenerating}
                    className="w-full py-4 btn-primary font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Launching...
                      </>
                    ) : (
                      <>
                        🚀 Launch Product
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleBack} 
                    className="w-full py-3 glass-button rounded-xl"
                  >
                    Back to Design
                  </button>
                </div>

                {error && (
                  <div className="glass-card p-4 rounded-lg bg-red-500/20 border-red-500/30 relative">
                    <button
                      onClick={() => setError('')}
                      className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-red-300 hover:text-red-200 transition-colors"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-sm text-red-300 pr-6">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mockup Carousel Modal */}
      {showMockupCarousel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto p-8">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Preview Your Product</h2>
                  <p className="text-white/60">Review the mockups and approve to publish to your Shopify store</p>
                </div>
                <button
                  onClick={handleRejectMockups}
                  className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image Counter */}
              <div className="text-center">
                <p className="text-white/80">
                  Image {currentMockupIndex + 1} of {mockupImages.length}
                </p>
              </div>

              {/* Main Image Display */}
              <div className="relative aspect-square max-h-[500px] flex items-center justify-center bg-white/5 rounded-2xl overflow-hidden">
                {mockupImages[currentMockupIndex] && (
                  <>
                    {mockupImages[currentMockupIndex].type === 'mockup' ? (
                      <img
                        src={mockupImages[currentMockupIndex].src}
                        alt={`Mockup ${currentMockupIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <img
                        src={mockupImages[currentMockupIndex].data}
                        alt={`${mockupImages[currentMockupIndex].view} view`}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </>
                )}

                {/* Navigation Arrows */}
                {mockupImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.max(0, currentMockupIndex - 1))}
                      disabled={currentMockupIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.min(mockupImages.length - 1, currentMockupIndex + 1))}
                      disabled={currentMockupIndex === mockupImages.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {mockupImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {mockupImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMockupIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                        currentMockupIndex === idx
                          ? 'ring-2 ring-purple-bright shadow-glow'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {img.type === 'mockup' ? (
                        <img src={img.src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <img src={img.data} alt={img.view} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleRejectMockups}
                  className="flex-1 py-4 glass-button rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveMockups}
                  disabled={isGenerating}
                  className="flex-1 py-4 btn-primary rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      ✅ Approve & Publish to Shopify
                    </>
                  )}
                </button>
              </div>

              {/* Notification */}
              {notification && (
                <div className="glass-card p-4 rounded-lg bg-blue-500/20 border-blue-500/30">
                  <p className="text-sm text-blue-300 text-center">{notification}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}