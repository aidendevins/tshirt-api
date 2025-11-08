import { useState, useEffect, useRef } from 'react';
import { getCreatorSession } from '../utils/session';

// Print area restriction constants
const PRINT_AREA_CONFIG = {
  x: 0.312,
  y: 0.265,
  width: 0.374,
  height: 0.46
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function ProductDesigner({ onSave, onCancel }) {
  // Canvas state
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [canvasImageUrl, setCanvasImageUrl] = useState('');
  const fileInputRef = useRef(null);
  
  // Design state
  const [designImage, setDesignImage] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  
  // History state
  const [designHistory, setDesignHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // View state
  const [currentView, setCurrentView] = useState('template');
  const [tshirtImages, setTshirtImages] = useState({
    template: null,
    realistic: null,
    person: null,
    designOnly: null
  });
  
  // Text state
  const [textElement, setTextElement] = useState(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('Arial Black');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(60);
  const [textWarpStyle, setTextWarpStyle] = useState('none');
  
  // Sprites state
  const [sprites, setSprites] = useState([]);
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
  const [availableColors, setAvailableColors] = useState(['white', 'black']);
  const [availableSizes, setAvailableSizes] = useState(['S', 'M', 'L', 'XL']);
  
  // Cached images - captured when user clicks "Next"
  const [cachedViewImages, setCachedViewImages] = useState(null);
  
  const fonts = ['Arial Black', 'Impact', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Comic Sans MS'];
  const warpStyles = ['none', 'arc', 'wave', 'circle'];
  const colors = ['white', 'black', 'gray', 'red', 'blue', 'navy', 'green'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableEmojis = ['🔥', '⚡', '💎', '⭐', '🌟', '💫', '✨', '🎨', '🎭', '🎪', '🎸', '🎤', '🎧', '🎮', '🏀', '⚽', '🏆', '👑', '💀', '🦋', '🌈', '☀️', '🌙'];
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    setCtx(context);
    
    canvas.width = 660;
    canvas.height = 660;
    
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
      loadImage('https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front.png?v=1761178014'),
      loadImage('https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_realistic.png?v=1761181061'),
      loadImage('https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608'),
      loadImage('https://cdn.shopify.com/s/files/1/0916/8266/8909/files/Blank_Image.png?v=1761257355')
    ]).then(([template, realistic, person, designOnly]) => {
      setTshirtImages({ template, realistic, person, designOnly });
    });
    
    drawCanvas();
  }, []);
  
  // Redraw canvas when state changes
  useEffect(() => {
    if (ctx && tshirtImages.template) {
      drawCanvas();
    }
  }, [designImage, textElement, sprites, currentView, ctx, tshirtImages, isDesignSelected, isTextSelected]);
  
  // Redraw canvas when returning to design step
  useEffect(() => {
    if (currentStep === 'design' && ctx && tshirtImages.template) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        drawCanvas();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);
  
  // Save state for undo
  const saveState = () => {
    const state = {
      designImage: designImage ? { ...designImage, img: designImage.img } : null,
      textElement: textElement ? { ...textElement } : null,
      sprites: sprites.map(s => ({ ...s }))
    };
    setUndoStack([...undoStack, state]);
    setRedoStack([]);
  };
  
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const newUndoStack = [...undoStack];
    const prevState = newUndoStack.pop();
    
    const currentState = {
      designImage: designImage ? { ...designImage, img: designImage.img } : null,
      textElement: textElement ? { ...textElement } : null,
      sprites: sprites.map(s => ({ ...s }))
    };
    
    setRedoStack([...redoStack, currentState]);
    setUndoStack(newUndoStack);
    
    setDesignImage(prevState.designImage);
    setTextElement(prevState.textElement);
    setSprites(prevState.sprites);
  };
  
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop();
    
    const currentState = {
      designImage: designImage ? { ...designImage, img: designImage.img } : null,
      textElement: textElement ? { ...textElement } : null,
      sprites: sprites.map(s => ({ ...s }))
    };
    
    setUndoStack([...undoStack, currentState]);
    setRedoStack(newRedoStack);
    
    setDesignImage(nextState.designImage);
    setTextElement(nextState.textElement);
    setSprites(nextState.sprites);
  };
  
  const drawCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    if (currentView === 'design-only' && designImage) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      if (designImage.img.complete) {
        const padding = 40;
        const availableWidth = w - (padding * 2);
        const availableHeight = h - (padding * 2);
        
        const scale = Math.min(availableWidth / designImage.img.naturalWidth, availableHeight / designImage.img.naturalHeight);
        const imgW = designImage.img.naturalWidth * scale;
        const imgH = designImage.img.naturalHeight * scale;
        const imgX = (w - imgW) / 2;
        const imgY = (h - imgH) / 2;
        
        ctx.drawImage(designImage.img, imgX, imgY, imgW, imgH);
      }
    } else {
      const tshirtImg = currentView === 'template' ? tshirtImages.template :
                        currentView === 'realistic' ? tshirtImages.realistic :
                        currentView === 'person' ? tshirtImages.person :
                        tshirtImages.template;
      
      if (tshirtImg) {
        ctx.drawImage(tshirtImg, 0, 0, w, h);
      }
    }
    
    const printAreaX = w * PRINT_AREA_CONFIG.x;
    const printAreaY = w * PRINT_AREA_CONFIG.y;
    const printAreaWidth = w * PRINT_AREA_CONFIG.width;
    const printAreaHeight = w * PRINT_AREA_CONFIG.height;
    
    if (currentView !== 'design-only') {
      if (currentView === 'template') {
        ctx.strokeStyle = 'rgba(200,200,200,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(printAreaX, printAreaY, printAreaWidth, printAreaHeight);
        ctx.setLineDash([]);
        
        if (!designImage) {
          ctx.fillStyle = 'rgba(150,150,150,0.5)';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Your design will appear here', w / 2, printAreaY + printAreaHeight / 2 - 10);
          ctx.fillText('(drag to reposition, resize with corners)', w / 2, printAreaY + printAreaHeight / 2 + 10);
        }
      }
      
      if (designImage) {
        ctx.drawImage(designImage.img, designImage.x, designImage.y, designImage.width, designImage.height);
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
      
      if (designImage && isDesignSelected) {
        drawDesignHandles();
      }
    }
    
    // Update canvas image URL for display
    if (canvasRef.current) {
      try {
        setCanvasImageUrl(canvasRef.current.toDataURL('image/png'));
      } catch (e) {
        console.error('Error converting canvas to data URL:', e);
      }
    }
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
      ctx.fillText(text.text, text.x, text.y);
    }
  };
  
  const drawArcText = (text, cx, cy, fontSize) => {
    const radius = 100;
    const angleRange = Math.PI;
    const startAngle = -Math.PI / 2 - angleRange / 2;
    
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + (angleRange / text.length) * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  };
  
  const drawWaveText = (text, cx, cy, fontSize) => {
    const amplitude = 20;
    const frequency = 0.5;
    const charWidth = fontSize * 0.6;
    const totalWidth = text.length * charWidth;
    
    for (let i = 0; i < text.length; i++) {
      const x = cx - totalWidth / 2 + i * charWidth;
      const y = cy + Math.sin(i * frequency) * amplitude;
      ctx.fillText(text[i], x, y);
    }
  };
  
  const drawCircleText = (text, cx, cy, fontSize) => {
    const radius = 80;
    const angleStep = (Math.PI * 2) / text.length;
    
    for (let i = 0; i < text.length; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  };
  
  const getTextBoundingBox = () => {
    if (!textElement || !ctx) return { x: 0, y: 0, width: 0, height: 0 };
    
    ctx.font = `${textElement.size}px ${textElement.font}`;
    const metrics = ctx.measureText(textElement.text);
    const width = metrics.width;
    const height = textElement.size;
    
    return {
      x: textElement.x - width / 2,
      y: textElement.y - height / 2,
      width,
      height
    };
  };
  
  const drawDesignHandles = () => {
    if (!designImage || !ctx) return;
    
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(designImage.x, designImage.y, designImage.width, designImage.height);
    
    const handles = [
      { x: designImage.x, y: designImage.y },
      { x: designImage.x + designImage.width, y: designImage.y },
      { x: designImage.x, y: designImage.y + designImage.height },
      { x: designImage.x + designImage.width, y: designImage.y + designImage.height }
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
    if (!designImage) return false;
    return x >= designImage.x && 
           x <= designImage.x + designImage.width &&
           y >= designImage.y && 
           y <= designImage.y + designImage.height;
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
    if (!designImage) return null;
    
    const handles = [
      { x: designImage.x, y: designImage.y, corner: 'tl' },
      { x: designImage.x + designImage.width, y: designImage.y, corner: 'tr' },
      { x: designImage.x, y: designImage.y + designImage.height, corner: 'bl' },
      { x: designImage.x + designImage.width, y: designImage.y + designImage.height, corner: 'br' }
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
    
    const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
    const printAreaHeight = canvas.height * PRINT_AREA_CONFIG.height;
    
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
    if (currentView === 'design-only') return;
    if (!designImage && !textElement && sprites.length === 0) return;
    
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
          x: designImage.x, 
          y: designImage.y, 
          width: designImage.width, 
          height: designImage.height 
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
        x: designImage.x, 
        y: designImage.y, 
        width: designImage.width, 
        height: designImage.height 
      });
    } else {
      setIsDesignSelected(false);
      setIsTextSelected(false);
      setSprites(sprites.map(s => ({ ...s, isSelected: false })));
    }
  };
  
  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    
    if (isDragging && isDesignSelected && designImage) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const constrained = constrainToPrintArea(
        startDimensions.x + dx,
        startDimensions.y + dy,
        designImage.width,
        designImage.height
      );
      
      setDesignImage({
        ...designImage,
        x: constrained.x,
        y: constrained.y
      });
    } else if (isResizing && designImage) {
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
      
      setDesignImage({
        ...designImage,
        x: constrained.x,
        y: constrained.y,
        width: constrained.width,
        height: constrained.height
      });
    } else if (isTextDragging && textElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      setTextElement({
        ...textElement,
        x: startDimensions.x + dx,
        y: startDimensions.y + dy
      });
    } else if (isTextResizing && textElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const sizeChange = Math.max(dx, dy);
      const newSize = Math.max(20, Math.min(120, textElement.size + sizeChange / 2));
      
      setTextElement({
        ...textElement,
        size: newSize
      });
    } else if (isDragging && selectedLayer && selectedLayer.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const sprite = sprites[spriteIndex];
      
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const newSprites = [...sprites];
      newSprites[spriteIndex] = {
        ...sprite,
        x: startDimensions.x + dx,
        y: startDimensions.y + dy
      };
      setSprites(newSprites);
    } else if (isSpriteResizing && selectedLayer && selectedLayer.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const sprite = sprites[spriteIndex];
      
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const sizeChange = Math.max(dx, dy);
      const newSize = Math.max(20, sprite.size + sizeChange);
      
      const newSprites = [...sprites];
      newSprites[spriteIndex] = {
        ...sprite,
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
        const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
        const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
        
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
        
        setDesignImage(newDesignImage);
        
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
    const newText = {
      text: textInput,
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: fontSize,
      font: textFont,
      color: textColor,
      warpStyle: textWarpStyle
    };
    
    setTextElement(newText);
    setShowTextEditor(false);
    setTextInput('');
    setIsTextSelected(true);
  };
  
  const handleAddSprite = (emoji) => {
    saveState();
    const canvas = canvasRef.current;
    const newSprite = {
      emoji,
      x: canvas.width / 2,
      y: canvas.height / 2,
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
      const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
      const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
      const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
      const printAreaHeight = canvas.height * PRINT_AREA_CONFIG.height;
      
      const newDesign = {
        img,
        url: item.url || item.image,
        x: printAreaX,
        y: printAreaY,
        width: printAreaWidth,
        height: printAreaHeight
      };
      
      setDesignImage(newDesign);
      setCurrentHistoryIndex(index);
      if (item.prompt) {
        setPrompt(item.prompt);
      }
    };
    img.src = item.url || item.image;
  };
  
  // Helper function to draw a specific view directly on canvas without changing state
  const drawCanvasView = (view) => {
    if (!ctx || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    // Draw based on view type
    if (view === 'design-only' && designImage) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      if (designImage.img.complete) {
        const padding = 40;
        const availableWidth = w - (padding * 2);
        const availableHeight = h - (padding * 2);
        
        const scale = Math.min(availableWidth / designImage.img.naturalWidth, availableHeight / designImage.img.naturalHeight);
        const imgW = designImage.img.naturalWidth * scale;
        const imgH = designImage.img.naturalHeight * scale;
        const imgX = (w - imgW) / 2;
        const imgY = (h - imgH) / 2;
        
        ctx.drawImage(designImage.img, imgX, imgY, imgW, imgH);
      }
    } else {
      // Draw t-shirt background
      const tshirtImg = view === 'template' ? tshirtImages.template :
                        view === 'realistic' ? tshirtImages.realistic :
                        view === 'person' ? tshirtImages.person :
                        tshirtImages.template;
      
      if (tshirtImg) {
        ctx.drawImage(tshirtImg, 0, 0, w, h);
      }
      
      // Draw design on the shirt
      if (designImage) {
        ctx.drawImage(designImage.img, designImage.x, designImage.y, designImage.width, designImage.height);
      }
      
      // Draw sprites (no selection handles)
      sprites.forEach((sprite) => {
        ctx.font = `${sprite.size}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(sprite.emoji, sprite.x, sprite.y);
      });
      
      // Draw text (no selection handles)
      if (textElement) {
        ctx.font = `${textElement.size}px ${textElement.font}`;
        ctx.fillStyle = textElement.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (textElement.warpStyle === 'arc') {
          drawArcText(textElement.text, textElement.x, textElement.y, textElement.size);
        } else if (textElement.warpStyle === 'wave') {
          drawWaveText(textElement.text, textElement.x, textElement.y, textElement.size);
        } else if (textElement.warpStyle === 'circle') {
          drawCircleText(textElement.text, textElement.x, textElement.y, textElement.size);
        } else {
          ctx.fillText(textElement.text, textElement.x, textElement.y);
        }
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
    if (!designImage) {
      setError('Please create a design first');
      return;
    }
    
    try {
      // Show loading state
      setIsGenerating(true);
      setError('');
      
      console.log('📸 Capturing all 4 views in background...');
      
      // Capture each view directly without changing UI state
      const templateImage = drawCanvasView('template');
      console.log('✓ Template captured');
      
      const realisticImage = drawCanvasView('realistic');
      console.log('✓ Realistic captured');
      
      const designOnlyImage = drawCanvasView('design-only');
      console.log('✓ Design-only captured');
      
      const modelImage = drawCanvasView('person');
      console.log('✓ Model captured');
      
      // Verify all images were captured
      if (!templateImage || !realisticImage || !designOnlyImage || !modelImage) {
        throw new Error('Failed to capture one or more views');
      }
      
      // Store all captured images
      setCachedViewImages({
        template: templateImage,
        realistic: realisticImage,
        designOnly: designOnlyImage,
        model: modelImage
      });
      
      console.log('✅ All 4 views captured and cached!');
      
      // Reset canvas back to template view (redraw with current state)
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
      
      // Get creator session data
      const creatorSession = getCreatorSession();
      if (!creatorSession) {
        setError('Session expired. Please log in again.');
        setIsGenerating(false);
        return;
      }
      
      // Use the cached images that were captured when user clicked "Next"
      console.log('🚀 Launching product with cached images...');
      const designData = {
        images: [
          { data: cachedViewImages.template, view: 'template' },
          { data: cachedViewImages.realistic, view: 'realistic' },
          { data: cachedViewImages.designOnly, view: 'design-only' },
          { data: cachedViewImages.model, view: 'model' }
        ],
        title: productTitle,
        description: productDescription,
        price: parseFloat(productPrice),
        availableColors,
        availableSizes,
        timestamp: new Date().toISOString()
      };
      
      // Call backend API to create product
      const response = await fetch(`${API_BASE_URL}/api/shopify/create-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productData: designData,
          creatorId: creatorSession.uid
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }
      
      const result = await response.json();
      
      // Call the original onSave callback with result
      if (onSave) {
        onSave(result);
      }
      
    } catch (error) {
      console.error('Error creating product:', error);
      setError(error.message || 'Failed to create product. Please try again.');
      setIsGenerating(false);
    }
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
                  onClick={() => setCurrentView('template')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'template' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.template && <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front.png?v=1761178014" alt="Template" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Template</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('realistic')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'realistic' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.realistic && <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_realistic.png?v=1761181061" alt="Realistic" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Realistic</p>
                </button>
                
                <button
                  onClick={() => designImage && setCurrentView('design-only')}
                  disabled={!designImage}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'design-only' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  } ${!designImage ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {designImage ? <img src={designImage.url} alt="Design" className="w-full h-full object-contain" /> : <span className="text-white/40 text-xs">No design</span>}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Design Only</p>
                </button>
                
                <button
                  onClick={() => setCurrentView('person')}
                  className={`glass-card p-2 rounded-xl transition-all hover:shadow-glow ${
                    currentView === 'person' ? 'ring-2 ring-purple-bright shadow-glow' : ''
                  }`}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {tshirtImages.person && <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608" alt="Person" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs text-white/80 text-center mt-2">Model</p>
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

              <div className="mb-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full glass-button py-3 flex items-center justify-between"
                >
                  <span>Design History ({designHistory.length})</span>
                  <svg 
                    className={`w-5 h-5 transition-transform ${showHistory ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showHistory && designHistory.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {designHistory.map((item, index) => (
                      <div 
                        key={item.timestamp} 
                        className={`glass-card p-3 rounded-lg hover:shadow-glow transition-all cursor-pointer ${
                          currentHistoryIndex === index ? 'ring-2 ring-purple-bright' : ''
                        }`}
                        onClick={() => handleLoadFromHistory(item, index)}
                      >
                        <p className="text-sm text-white/80 truncate mb-2">{item.prompt}</p>
                        <img src={item.image} alt="History" className="w-full h-20 object-cover rounded" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                isPreviewExpanded ? 'w-96 h-96' : 'w-32 h-32'
              }`}
            >
              <div className="relative w-full h-full bg-white/5">
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
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <p className="text-xs text-white/60">Full Preview</p>
                </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setCurrentView('template')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'template' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front.png?v=1761178014" 
                        alt="Template" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Template</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('realistic')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'realistic' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_realistic.png?v=1761181061" 
                        alt="Realistic" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Realistic</span>
                    </button>
                    
                    <button
                      onClick={() => designImage && setCurrentView('design-only')}
                      disabled={!designImage}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'design-only' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      } ${!designImage ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <img 
                        src={designImage?.url || "https://cdn.shopify.com/s/files/1/0916/8266/8909/files/Blank_Image.png?v=1761257355"} 
                        alt="Design Only" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Design Only</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('person')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'person' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608" 
                        alt="Model" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Model</span>
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

                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Available Colors</h3>
                  <p className="text-white/60 text-sm mb-4">Select which colors customers can choose from</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {colors.map(color => (
                      <label key={color} className="flex items-center gap-3 glass-card px-4 py-3 rounded-lg cursor-pointer hover:shadow-glow transition-all">
                        <input
                          type="checkbox"
                          checked={availableColors.includes(color)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailableColors([...availableColors, color]);
                            } else {
                              setAvailableColors(availableColors.filter(c => c !== color));
                            }
                          }}
                          className="w-4 h-4 text-purple-bright rounded focus:ring-purple-bright"
                        />
                        <span className="text-white/80 capitalize">{color}</span>
                      </label>
                    ))}
                  </div>
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
    </div>
  );
}