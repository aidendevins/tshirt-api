import { useState, useRef, useEffect } from 'react';
import tshirtBase from '../assets/t-front_800x800.png';
import { getCreatorSession } from '../utils/session';

// Print area restriction constants (as percentage of canvas size)
const PRINT_AREA_CONFIG = {
  x: 0.312,        // X position (20% from left)
  y: 0.265,        // Y position (33% from top)
  width: 0.374,    // Width (30% of canvas width)
  height: 0.46    // Height (40% of canvas height)
};

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function ProductDesigner({ onSave, onCancel }) {
  // Canvas state
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  
  // Design state
  const [designImage, setDesignImage] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);  // Array of uploaded images
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
  
  // T-shirt options
  const [tshirtColor, setTshirtColor] = useState('white');
  const [tshirtSize, setTshirtSize] = useState('M');
  
  // Multi-step flow
  const [currentStep, setCurrentStep] = useState('design'); // 'design' or 'options'
  
  // Product options state
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('29.99');
  const [availableColors, setAvailableColors] = useState(['white', 'black']);
  const [availableSizes, setAvailableSizes] = useState(['S', 'M', 'L', 'XL']);
  
  // Available emojis for sprites
  const availableEmojis = ['🔥', '⚡', '💎', '⭐', '🌟', '💫', '✨', '🎨', '🎭', '🎪', '🎸', '🎤', '🎧', '🎮', '🏀', '⚽', '🏆', '👑', '💀', '🦋', '🌈', '☀️', '🌙'];
  
  const fonts = ['Arial Black', 'Impact', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Comic Sans MS'];
  const warpStyles = ['none', 'arc', 'wave', 'circle'];
  const colors = ['white', 'black', 'gray', 'red', 'blue', 'navy', 'green'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  // Initialize canvas and load t-shirt images
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    setCtx(context);
    
    // Set canvas size
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
      setTshirtImages({
        template,
        realistic,
        person,
        designOnly
      });
    });
    
    drawCanvas();
  }, []);
  
  // Redraw canvas when state changes
  useEffect(() => {
    if (ctx && tshirtImages.template) {
      drawCanvas();
    }
  }, [designImage, textElement, sprites, tshirtColor, ctx, currentView, tshirtImages, isDesignSelected, isTextSelected]);
  
  const drawCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Draw background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    // Draw t-shirt template or design-only view
    if (currentView === 'design-only' && designImage) {
      // Design-only view: show ONLY the generated design image on white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // Draw the design image centered and scaled to fit with padding
      if (designImage.img.complete) {
        const padding = 40; // Add 40px padding
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
      // Normal view: show t-shirt template
      const tshirtImg = currentView === 'template' ? tshirtImages.template :
                        currentView === 'realistic' ? tshirtImages.realistic :
                        currentView === 'person' ? tshirtImages.person :
                        tshirtImages.template;
      
      if (tshirtImg) {
        // Fill entire canvas with t-shirt image (no margins)
        ctx.drawImage(tshirtImg, 0, 0, w, h);
      }
    }
    
    // Define print area (centered on the t-shirt chest area)
    const printAreaX = w * PRINT_AREA_CONFIG.x;
    const printAreaY = h * PRINT_AREA_CONFIG.y;
    const printAreaWidth = w * PRINT_AREA_CONFIG.width;
    const printAreaHeight = h * PRINT_AREA_CONFIG.height;
    
    // Only draw editing features if NOT in design-only view
    if (currentView !== 'design-only') {
      // Draw print area border (guide) - always visible on template view
      if (currentView === 'template') {
        ctx.strokeStyle = 'rgba(200,200,200,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(printAreaX, printAreaY, printAreaWidth, printAreaHeight);
        ctx.setLineDash([]);
        
        // Only show helper text before a design exists
        if (!designImage) {
          ctx.fillStyle = 'rgba(150,150,150,0.5)';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Your design will appear here', w / 2, printAreaY + printAreaHeight / 2 - 10);
          ctx.fillText('(drag to reposition, resize with corners)', w / 2, printAreaY + printAreaHeight / 2 + 10);
        }
      }
      
      // Draw design image
      if (designImage) {
        ctx.drawImage(
          designImage.img,
          designImage.x,
          designImage.y,
          designImage.width,
          designImage.height
        );
      }
      
      // Draw sprites
      sprites.forEach((sprite, index) => {
        ctx.font = `${sprite.size}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(sprite.emoji, sprite.x, sprite.y);
        
        // Draw selection border if selected
        if (sprite.isSelected) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(sprite.x, sprite.y, sprite.width || sprite.size, sprite.height || sprite.size);
          
          // Draw resize handles
          drawSpriteHandles(sprite);
        }
      });
      
      // Draw text
      if (textElement) {
        drawText(textElement);
        
        // Draw text selection handles
        if (isTextSelected) {
          drawTextHandles();
        }
      }
      
      // Draw design selection handles
      if (designImage && isDesignSelected) {
        drawDesignHandles();
      }
    }
  };
  
  const drawDesignHandles = () => {
    if (!designImage || !ctx) return;
    
    // Draw selection rectangle
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(designImage.x, designImage.y, designImage.width, designImage.height);
    
    // Draw corner handles
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
    
    // Draw selection rectangle
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);
    
    // Draw corner handles
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
  
  const getTextBoundingBox = () => {
    if (!textElement) return { x: 0, y: 0, width: 0, height: 0 };
    const measurementCtx = canvasRef.current?.getContext('2d');
    const fontPx = textElement.fontSize || 16;
    const fontFamily = textElement.font || 'Arial';
    const measuredWidth = measurementCtx ? (measurementCtx.font = `${fontPx}px ${fontFamily}`, measurementCtx.measureText(textElement.text).width) : (textElement.width || fontPx * textElement.text.length * 0.6);
    const width = textElement.width || measuredWidth;
    const height = textElement.height || fontPx;
    return { x: textElement.x, y: textElement.y, width, height };
  };
  
  const drawTshirtShape = (w, h) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillRect(w * 0.15, h * 0.1, w * 0.7, h * 0.8);
  };
  
  const getTshirtColorHex = (color) => {
    const colorMap = {
      white: '#FFFFFF',
      black: '#000000',
      gray: '#9CA3AF',
      red: '#EF4444',
      blue: '#3B82F6',
      navy: '#1E3A8A',
      green: '#10B981'
    };
    return colorMap[color] || '#FFFFFF';
  };
  
  const drawText = (textEl) => {
    if (!ctx) return;
    
    // Text is always centered in its bounding box
    ctx.font = `${textEl.fontSize}px ${textEl.font}`;
    ctx.fillStyle = textEl.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = textEl.text;
    const centerX = textEl.x + textEl.width / 2;
    const centerY = textEl.y + textEl.height / 2;
    
    // Draw text centered in the box
    if (textEl.warpStyle === 'none') {
      ctx.fillText(text, centerX, centerY);
    } else if (textEl.warpStyle === 'arc') {
      drawArcText(text, centerX, centerY, textEl.fontSize);
    } else if (textEl.warpStyle === 'wave') {
      drawWaveText(text, centerX, centerY, textEl.fontSize);
    } else if (textEl.warpStyle === 'circle') {
      drawCircleText(text, centerX, centerY, textEl.fontSize);
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
  
  // Mouse interaction helpers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
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
    
    // Maintain aspect ratio when constraining
    const aspectRatio = width / height;
    let newWidth = width;
    let newHeight = height;
    
    // If image is too wide, scale down maintaining aspect ratio
    if (newWidth > printAreaWidth) {
      newWidth = printAreaWidth;
      newHeight = newWidth / aspectRatio;
    }
    
    // If image is too tall (after width scaling), scale down further
    if (newHeight > printAreaHeight) {
      newHeight = printAreaHeight;
      newWidth = newHeight * aspectRatio;
    }
    
    // Constrain position
    let newX = Math.max(printAreaX, Math.min(x, printAreaX + printAreaWidth - newWidth));
    let newY = Math.max(printAreaY, Math.min(y, printAreaY + printAreaHeight - newHeight));
    
    return { x: newX, y: newY, width: newWidth, height: newHeight };
  };
  
  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (currentView === 'design-only') return;
    if (!designImage && !textElement && sprites.length === 0) return;
    
    const pos = getMousePos(e);
    
    // Check sprite interaction first
    for (let i = sprites.length - 1; i >= 0; i--) {
      const sprite = sprites[i];
      
      // Check if clicking on a resize handle of selected sprite
      if (sprite.isSelected) {
        const spriteHandle = getSpriteHandleAtPoint(sprite, pos.x, pos.y);
        if (spriteHandle) {
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
      
      // Check if clicking inside sprite
      if (isPointInSprite(sprite, pos.x, pos.y)) {
        setIsDesignSelected(false);
        setIsTextSelected(false);
        setSprites(sprites.map((s, idx) => ({ ...s, isSelected: idx === i })));
        setDragStart({ x: pos.x - sprite.x, y: pos.y - sprite.y });
        setIsDragging(true);
        setSelectedLayer('sprite-' + i);
        return;
      }
    }
    
    // Check text element interaction
    if (textElement) {
      const textHandle = getTextHandleAtPoint(pos.x, pos.y);
      
      if (textHandle && isTextSelected) {
        setIsTextResizing(true);
        setTextResizeHandle(textHandle);
        setDragStart({ x: pos.x, y: pos.y });
        const box = getTextBoundingBox();
        setStartDimensions({ x: box.x, y: box.y, width: box.width, height: box.height });
        return;
      } else if (isPointInText(pos.x, pos.y)) {
        if (!isTextSelected) {
          setIsTextSelected(true);
          setIsDesignSelected(false);
          setSprites(sprites.map(s => ({ ...s, isSelected: false })));
        } else {
          setIsTextDragging(true);
          const box = getTextBoundingBox();
          setDragStart({ x: pos.x - box.x, y: pos.y - box.y });
        }
        return;
      }
    }
    
    // Check design image interaction
    if (designImage) {
      const handle = getHandleAtPoint(pos.x, pos.y);
      
      if (handle && isDesignSelected) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({ x: pos.x, y: pos.y });
        setStartDimensions({ 
          x: designImage.x, 
          y: designImage.y, 
          width: designImage.width, 
          height: designImage.height 
        });
      } else if (isPointInDesign(pos.x, pos.y)) {
        if (!isDesignSelected) {
          setIsDesignSelected(true);
          setIsTextSelected(false);
          setSprites(sprites.map(s => ({ ...s, isSelected: false })));
        } else {
          setIsDragging(true);
          setDragStart({ x: pos.x - designImage.x, y: pos.y - designImage.y });
        }
      } else {
        setIsDesignSelected(false);
        setIsTextSelected(false);
        setSprites(sprites.map(s => ({ ...s, isSelected: false })));
      }
    } else {
      setIsTextSelected(false);
      setSprites(sprites.map(s => ({ ...s, isSelected: false })));
    }
  };
  
  const handleMouseMove = (e) => {
    if (currentView === 'design-only') return;
    
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Handle sprite resizing - maintain aspect ratio (1:1 for emojis)
    if (isSpriteResizing && selectedLayer?.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const newSprites = [...sprites];
      const sprite = newSprites[spriteIndex];
      
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      // Emojis are always square (1:1 aspect ratio)
      const aspectRatio = 1;
      
      // Calculate scale based on diagonal movement
      let scale = 1;
      if (spriteResizeHandle === 'br') {
        scale = Math.max(
          (startDimensions.width + dx) / startDimensions.width,
          (startDimensions.height + dy) / startDimensions.height
        );
      } else if (spriteResizeHandle === 'bl') {
        scale = Math.max(
          (startDimensions.width - dx) / startDimensions.width,
          (startDimensions.height + dy) / startDimensions.height
        );
      } else if (spriteResizeHandle === 'tr') {
        scale = Math.max(
          (startDimensions.width + dx) / startDimensions.width,
          (startDimensions.height - dy) / startDimensions.height
        );
      } else if (spriteResizeHandle === 'tl') {
        scale = Math.max(
          (startDimensions.width - dx) / startDimensions.width,
          (startDimensions.height - dy) / startDimensions.height
        );
      }
      
      // Apply scale while maintaining aspect ratio
      let newWidth = startDimensions.width * scale;
      let newHeight = newWidth / aspectRatio; // Always square for emojis
      
      // Calculate new position based on which corner is being dragged
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      if (spriteResizeHandle.includes('l')) {
        newX = startDimensions.x + startDimensions.width - newWidth;
      }
      if (spriteResizeHandle.includes('t')) {
        newY = startDimensions.y + startDimensions.height - newHeight;
      }
      
      // Minimum size
      if (newWidth > 20 && newHeight > 20) {
        // Constrain to print area
        const canvas = canvasRef.current;
        const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
        const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
        const printAreaHeight = canvas.height * PRINT_AREA_CONFIG.height;
        const printAreaRight = printAreaX + printAreaWidth;
        const printAreaBottom = printAreaY + printAreaHeight;
        
        // Constrain dimensions to fit within print area
        if (newX < printAreaX) {
          newWidth = newWidth - (printAreaX - newX);
          newHeight = newWidth; // Keep square
          newX = printAreaX;
        }
        if (newY < printAreaY) {
          newHeight = newHeight - (printAreaY - newY);
          newWidth = newHeight; // Keep square
          newY = printAreaY;
        }
        if (newX + newWidth > printAreaRight) {
          newWidth = printAreaRight - newX;
          newHeight = newWidth; // Keep square
        }
        if (newY + newHeight > printAreaBottom) {
          newHeight = printAreaBottom - newY;
          newWidth = newHeight; // Keep square
        }
        
        sprite.x = newX;
        sprite.y = newY;
        sprite.width = newWidth;
        sprite.height = newHeight;
        sprite.size = newWidth; // Update size for consistency
        
        setSprites(newSprites);
      }
      return;
    }
    
    // Handle sprite dragging
    if (isDragging && selectedLayer?.startsWith('sprite-')) {
      const spriteIndex = parseInt(selectedLayer.split('-')[1]);
      const newSprites = [...sprites];
      const sprite = newSprites[spriteIndex];
      
      const constrained = constrainToPrintArea(
        pos.x - dragStart.x,
        pos.y - dragStart.y,
        sprite.width || sprite.size,
        sprite.height || sprite.size
      );
      
      sprite.x = constrained.x;
      sprite.y = constrained.y;
      setSprites(newSprites);
      return;
    }
    
    // Handle text resizing - maintain aspect ratio
    if (isTextResizing && textElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      const aspectRatio = textElement.aspectRatio || (startDimensions.width / startDimensions.height);
      
      // Calculate scale based on diagonal movement
      let scale = 1;
      if (textResizeHandle === 'br') {
        scale = Math.max(
          (startDimensions.width + dx) / startDimensions.width,
          (startDimensions.height + dy) / startDimensions.height
        );
      } else if (textResizeHandle === 'bl') {
        scale = Math.max(
          (startDimensions.width - dx) / startDimensions.width,
          (startDimensions.height + dy) / startDimensions.height
        );
      } else if (textResizeHandle === 'tr') {
        scale = Math.max(
          (startDimensions.width + dx) / startDimensions.width,
          (startDimensions.height - dy) / startDimensions.height
        );
      } else if (textResizeHandle === 'tl') {
        scale = Math.max(
          (startDimensions.width - dx) / startDimensions.width,
          (startDimensions.height - dy) / startDimensions.height
        );
      }
      
      // Apply scale while maintaining aspect ratio
      let newWidth = startDimensions.width * scale;
      let newHeight = newWidth / aspectRatio;
      
      // Calculate new position based on which corner is being dragged
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      if (textResizeHandle.includes('l')) {
        newX = startDimensions.x + startDimensions.width - newWidth;
      }
      if (textResizeHandle.includes('t')) {
        newY = startDimensions.y + startDimensions.height - newHeight;
      }
      
      // Minimum size
      if (newWidth > 50 && newHeight > 20) {
        // Constrain to print area
        const canvas = canvasRef.current;
        const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
        const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
        const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
        const printAreaHeight = canvas.height * PRINT_AREA_CONFIG.height;
        const printAreaRight = printAreaX + printAreaWidth;
        const printAreaBottom = printAreaY + printAreaHeight;
        
        // Constrain dimensions to fit within print area
        if (newX < printAreaX) {
          newWidth = newWidth - (printAreaX - newX);
          newHeight = newWidth / aspectRatio;
          newX = printAreaX;
        }
        if (newY < printAreaY) {
          newHeight = newHeight - (printAreaY - newY);
          newWidth = newHeight * aspectRatio;
          newY = printAreaY;
        }
        if (newX + newWidth > printAreaRight) {
          newWidth = printAreaRight - newX;
          newHeight = newWidth / aspectRatio;
        }
        if (newY + newHeight > printAreaBottom) {
          newHeight = printAreaBottom - newY;
          newWidth = newHeight * aspectRatio;
        }
        
        // Scale font size proportionally from original size
        const originalWidth = textElement.originalWidth || startDimensions.width;
        const originalFontSize = textElement.originalFontSize || 48;
        const scaleFactor = newWidth / originalWidth;
        const newFontSize = originalFontSize * scaleFactor;
        
        setTextElement({ 
          ...textElement, 
          x: newX, 
          y: newY, 
          width: newWidth, 
          height: newHeight,
          fontSize: newFontSize
        });
      }
      return;
    }
    
    // Handle text dragging
    if (isTextDragging && textElement) {
      const box = getTextBoundingBox();
      const constrained = constrainToPrintArea(
        pos.x - dragStart.x,
        pos.y - dragStart.y,
        box.width,
        box.height
      );
      
      setTextElement({ ...textElement, x: constrained.x, y: constrained.y });
      return;
    }
    
    // Handle design resizing - maintain aspect ratio
    if (isResizing && designImage) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      // Lock aspect ratio - calculate new dimensions based on width change
      const aspectRatio = startDimensions.width / startDimensions.height;
      let newWidth = startDimensions.width;
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      // Determine resize based on which handle is being dragged
      if (resizeHandle.includes('r')) {
        newWidth = startDimensions.width + dx;
      } else if (resizeHandle.includes('l')) {
        newWidth = startDimensions.width - dx;
        newX = startDimensions.x + dx;
      } else if (resizeHandle.includes('t')) {
        newWidth = startDimensions.width - (dy * aspectRatio);
        newY = startDimensions.y + dy;
      } else if (resizeHandle.includes('b')) {
        newWidth = startDimensions.width + (dy * aspectRatio);
      }
      
      // Always calculate height from width to maintain aspect ratio
      const newHeight = newWidth / aspectRatio;
      
      if (newWidth > 50 && newHeight > 50) {
        const constrained = constrainToPrintArea(newX, newY, newWidth, newHeight);
        setDesignImage({
          ...designImage,
          x: constrained.x,
          y: constrained.y,
          width: constrained.width,
          height: constrained.height
        });
      }
      return;
    }
    
    // Handle design dragging
    if (isDragging && designImage && !selectedLayer) {
      const constrained = constrainToPrintArea(
        pos.x - dragStart.x,
        pos.y - dragStart.y,
        designImage.width,
        designImage.height
      );
      
      setDesignImage({
        ...designImage,
        x: constrained.x,
        y: constrained.y
      });
      return;
    }
    
    // Update cursor based on hover state
    if (isDesignSelected && designImage) {
      const handle = getHandleAtPoint(pos.x, pos.y);
      if (handle) {
        canvas.style.cursor = handle.includes('t') && handle.includes('l') ? 'nwse-resize' :
                              handle.includes('t') && handle.includes('r') ? 'nesw-resize' :
                              handle.includes('b') && handle.includes('l') ? 'nesw-resize' : 'nwse-resize';
      } else if (isPointInDesign(pos.x, pos.y)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    } else if (designImage && isPointInDesign(pos.x, pos.y)) {
      canvas.style.cursor = 'pointer';
    } else if (textElement && isPointInText(pos.x, pos.y)) {
      canvas.style.cursor = isTextSelected ? 'move' : 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsTextDragging(false);
    setIsTextResizing(false);
    setIsSpriteResizing(false);
    setSelectedLayer(null);
  };
  
  // Handle keyboard delete
  const handleKeyDown = (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && 
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      
      // Delete selected design
      if (isDesignSelected && designImage) {
        setDesignImage(null);
        setIsDesignSelected(false);
        return;
      }
      
      // Delete selected text
      if (isTextSelected && textElement) {
        setTextElement(null);
        setIsTextSelected(false);
        return;
      }
      
      // Delete selected sprite
      const selectedSpriteIndex = sprites.findIndex(s => s.isSelected);
      if (selectedSpriteIndex !== -1) {
        setSprites(sprites.filter((_, idx) => idx !== selectedSpriteIndex));
        return;
      }
    }
  };
  
  // Attach mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [designImage, textElement, sprites, isDesignSelected, isTextSelected, isDragging, isResizing, isTextDragging, isTextResizing, isSpriteResizing, currentView]);
  
  // Attach keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesignSelected, isTextSelected, sprites, designImage, textElement]);
  
  // Handle AI generation
  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError('Please enter a prompt or upload at least one image');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-sd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'A t-shirt design',
          images: uploadedImages.map(img => img.data)  // Send array of base64 images
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
          image: img,
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
  
  // Show notification that auto-dismisses after 8 seconds with fade-out
  const showNotification = (message) => {
    setNotification(message);
    
    // Start fade-out animation 500ms before removing
    setTimeout(() => {
      const notificationEl = document.querySelector('.upload-notification');
      if (notificationEl) {
        notificationEl.classList.add('fade-out');
      }
    }, 7500);
    
    // Remove notification after fade-out completes
    setTimeout(() => setNotification(''), 8000);
  };

  // Handle image upload (supports multiple images)
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
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
    
    console.log(`Uploading ${files.length} image(s)`);
    
    let successCount = 0;
    const totalFiles = files.length;
    
    // Process all files
    files.forEach((file, index) => {
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        console.log('Image uploaded:', file.name);
        
        // Check if this is actually a HEIC file (common on iPhones)
        const base64Data = imageData.split(',')[1];
        const decodedStart = atob(base64Data.substring(0, 40));
        
        if (decodedStart.includes('heic') || decodedStart.includes('heif')) {
          setError(`${file.name}: HEIC/HEIF format not supported. Please convert to JPG or PNG first.`);
          return;
        }
        
        // Create a temporary image to test if it loads
        const testImg = new Image();
        testImg.onload = () => {
          console.log('Test image loaded successfully, dimensions:', testImg.width, 'x', testImg.height);
          
          // Add to uploaded images array
          setUploadedImages(prev => {
            const newImages = [...prev, {
              data: imageData,
              name: file.name,
              width: testImg.width,
              height: testImg.height
            }];
            
            // Show notification when all files are processed
            successCount++;
            if (successCount === totalFiles) {
              showNotification(`${totalFiles} image${totalFiles > 1 ? 's' : ''} uploaded successfully!`);
            }
            
            return newImages;
          });
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
  
  // Remove a specific uploaded image by index
  const handleRemoveUploadedImage = (indexToRemove) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  // Load design from history
  const handleLoadFromHistory = (historyItem, index) => {
    const canvas = canvasRef.current;
    const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
    
    // Calculate height based on image aspect ratio
    const img = historyItem.image;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const designWidth = printAreaWidth;
    const designHeight = designWidth / aspectRatio;
    
    // Constrain to fit within print area (maintains aspect ratio)
    const constrained = constrainToPrintArea(printAreaX, printAreaY, designWidth, designHeight);
    
    setDesignImage({
      img: historyItem.image,
      url: historyItem.url,
      x: constrained.x,
      y: constrained.y,
      width: constrained.width,
      height: constrained.height
    });
    
    setCurrentHistoryIndex(index);
  };
  
  // Handle text addition
  const handleAddText = () => {
    if (!textInput.trim()) return;
    
    const canvas = canvasRef.current;
    const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
    const printAreaY = canvas.height * PRINT_AREA_CONFIG.y;
    const printAreaWidth = canvas.width * PRINT_AREA_CONFIG.width;
    const printAreaHeight = canvas.height * PRINT_AREA_CONFIG.height;
    
    // Default font size
    const defaultFontSize = 48;
    
    // Measure text at default size
    const measurementCtx = canvas.getContext('2d');
    measurementCtx.font = `${defaultFontSize}px ${textFont}`;
    const measuredWidth = measurementCtx.measureText(textInput).width;
    
    // Calculate text box dimensions
    // Width matches print area width, height based on font size with padding
    const textBoxWidth = printAreaWidth;
    const textBoxHeight = defaultFontSize * 1.5; // Add padding around text
    
    // Center text box in print area
    const textBoxX = printAreaX;
    const textBoxY = printAreaY + (printAreaHeight - textBoxHeight) / 2;
    
    const newText = {
      text: textInput,
      font: textFont,
      color: textColor,
      fontSize: defaultFontSize,
      originalFontSize: defaultFontSize, // Store original font size for scaling
      warpStyle: textWarpStyle,
      x: textBoxX,
      y: textBoxY,
      width: textBoxWidth,
      height: textBoxHeight,
      originalWidth: textBoxWidth, // Store original width for scaling
      aspectRatio: textBoxWidth / textBoxHeight // Store original aspect ratio
    };
    
    setTextElement(newText);
    setShowTextEditor(false);
    setIsTextSelected(true);
  };
  
  // Handle sprite addition
  const handleAddSprite = (emoji) => {
    const canvas = canvasRef.current;
    const printAreaX = canvas.width * PRINT_AREA_CONFIG.x;
    const printAreaY = canvas.width * PRINT_AREA_CONFIG.y;
    
    const newSprite = {
      emoji,
      size: 60,
      x: printAreaX + 20,
      y: printAreaY + 20,
      width: 60,
      height: 60,
      aspectRatio: 1, // Emojis are always square
      isSelected: true // Auto-select newly added sprite
    };
    
    // Deselect other elements
    setIsDesignSelected(false);
    setIsTextSelected(false);
    setSprites([...sprites.map(s => ({ ...s, isSelected: false })), newSprite]);
  };
  
  // Save design
  const handleSave = async () => {
    if (!designImage && !textElement && sprites.length === 0) {
      setError('Please add a design before saving');
      return;
    }
    
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
      
      const canvas = canvasRef.current;
      const designData = {
        imageUrl: canvas.toDataURL('image/png'),
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
      
      // Success! Show notification and call callback
      console.log('Product created successfully:', result);
      
      // Call the original onSave callback with result
      onSave(result);
      
    } catch (error) {
      console.error('Error creating product:', error);
      setError(error.message || 'Failed to create product. Please try again.');
      setIsGenerating(false);
    }
  };
  
  const handleProceedToOptions = () => {
    if (!designImage && !textElement && sprites.length === 0) {
      setError('Please add a design before proceeding');
      return;
    }
    setCurrentStep('options');
  };
  
  const handleBackToDesign = () => {
    setCurrentStep('design');
  };

  return (
    <div className={`product-designer step-${currentStep}`}>
      <div className={`designer-layout ${currentStep === 'options' ? 'options-view' : ''}`}>
        {/* Canvas Viewer - moves to right in options view */}
        <div className={`canvas-section canvas-card ${currentStep === 'options' ? 'canvas-right' : ''}`}>
          <div className="tshirt-viewer">
            <div className="canvas-container">
              {/* History Toggle Button - only show in design step */}
              {currentStep === 'design' && (
                <button
                  className={`design-history-toggle ${showHistory ? 'active' : ''}`}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  History
                </button>
              )}
              
              {/* Design History Sidebar */}
              {showHistory && (
                <div className="design-history visible">
                  {designHistory.map((item, index) => (
                    <div
                      key={item.timestamp}
                      className={`history-item ${currentHistoryIndex === index ? 'active' : ''}`}
                      onClick={() => handleLoadFromHistory(item, index)}
                    >
                      <img src={item.url} alt={`Design ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              
              <canvas ref={canvasRef} id="tshirt-canvas" />
              
              {isGenerating && (
                <div className="loading-overlay">
                  <div style={{ textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p>Creating your design...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Image Selector Thumbnails */}
          {/* View Thumbnails - only show in design step */}
          {currentStep === 'design' && (
            <div className="image-selector">
              <button
                className={`thumbnail-btn ${currentView === 'template' ? 'active' : ''}`}
                onClick={() => setCurrentView('template')}
                title="Template View"
              >
                <img src={tshirtBase} alt="Template" />
              </button>
              <button
                className={`thumbnail-btn ${currentView === 'realistic' ? 'active' : ''}`}
                onClick={() => setCurrentView('realistic')}
                title="Realistic View"
              >
                <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_realistic.png?v=1761181061" alt="Realistic" />
              </button>
              <button
                className={`thumbnail-btn ${currentView === 'design-only' ? 'active' : ''}`}
                onClick={() => designImage && setCurrentView('design-only')}
                title={designImage ? "Design Only" : "Generate a design first"}
                disabled={!designImage}
                style={{ opacity: designImage ? 1 : 0.4, cursor: designImage ? 'pointer' : 'not-allowed' }}
              >
                <img src={designImage?.url || "https://cdn.shopify.com/s/files/1/0916/8266/8909/files/Blank_Image.png?v=1761257355"} alt={designImage ? "Design Only" : "Generate Design"} />
              </button>
              <button
                className={`thumbnail-btn ${currentView === 'person' ? 'active' : ''}`}
                onClick={() => setCurrentView('person')}
                title="Model View"
              >
                <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608" alt="On Model" />
              </button>
            </div>
          )}
          
          {/* Instructions - only show in design step */}
          {currentStep === 'design' && (
            <div className="instructions">
              <strong>💡 How to use:</strong>
              • Drag your design to reposition it<br />
              • Use corner handles to resize<br />
              • Design stays within print boundaries<br />
              • Click thumbnails to preview different views
            </div>
          )}
        </div>
        
        {/* Controls - Design Step */}
        {currentStep === 'design' && (
          <div className="controls-section">
            {/* AI Generation */}
          <div className="control-group generator-card">
            <div className="generator-header">
              <h3 className="generator-title">Design Generator</h3>
              <div className="upload-controls">
                <div className="banner-area">
                  {notification && (
                    <div className="upload-notification">
                      {notification}
                    </div>
                  )}
                  {error && (
                    <div className="upload-error">
                      {error}
                      <button 
                        className="error-dismiss-inline"
                        onClick={() => setError('')}
                        aria-label="Dismiss error"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <label className="upload-indicator" htmlFor="image-upload">
                  <span>
                    + {uploadedImages.length > 0 ? 'Add More Images' : 'Upload Images'}
                  </span>
                </label>
              </div>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            
            {uploadedImages.length > 0 && (
              <div className="uploaded-images-container">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="image-preview-card">
                    <div className="image-number">{index + 1}</div>
                    <img 
                      src={image.data} 
                      alt={image.name} 
                      className="preview-image"
                    />
                    <div className="preview-info">
                      <strong>Image {index + 1}</strong>
                      <p>{image.name}</p>
                      <small>{image.width} × {image.height}</small>
                    </div>
                    <button className="btn-remove" onClick={() => handleRemoveUploadedImage(index)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <textarea
              className="prompt-field"
              placeholder={uploadedImages.length > 0 
                ? "Describe your design... (reference 'first image', 'second image', etc.)" 
                : "Describe your t-shirt design..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            
            <button
              className="btn-generate-design"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="btn-icon">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="btn-icon">✨</span>
                  Generate Design
                </>
              )}
            </button>
          </div>
          
          {/* Text Editor */}
          <div className="control-group card">
            <label className="control-label">Add Text</label>
            
            {!showTextEditor ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowTextEditor(true)}
              >
                + Add Text
              </button>
            ) : (
              <div className="text-editor">
                <input
                  type="text"
                  className="text-input"
                  placeholder="Enter text..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                
                <div className="text-controls">
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    className="text-select"
                  >
                    {fonts.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                  
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="color-picker"
                  />
                </div>
                
                <div className="warp-controls">
                  <span className="warp-label">Warp Style</span>
                  <div className="options-row">
                    {warpStyles.map(style => (
                      <button
                        key={style}
                        className={`option-btn ${textWarpStyle === style ? 'selected' : ''}`}
                        onClick={() => setTextWarpStyle(style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="text-actions">
                  <button className="btn btn-primary" onClick={handleAddText}>
                    Apply Text
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowTextEditor(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Sprites */}
          <div className="control-group card">
            <label className="control-label">Add Emojis</label>
            <div className="sprite-grid">
              {availableEmojis.slice(0, 12).map((emoji, index) => (
                <button
                  key={index}
                  className="sprite-btn"
                  onClick={() => handleAddSprite(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          {/* Save Actions */}
          <div className="actions-group">
            <button className="btn btn-primary btn-save" onClick={handleProceedToOptions}>
              Choose Clothing Options →
            </button>
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
        )}
        
        {/* Product Options - Options Step */}
        {currentStep === 'options' && (
          <div className="options-section">
            <div className="options-header">
              <button className="btn-back" onClick={handleBackToDesign}>
                ← Back to Design
              </button>
              <h2>Product Options</h2>
            </div>
            
            {/* Preview Card with Thumbnails */}
            <div className="option-card preview-card">
              <h3 className="option-card-title">Design Preview</h3>
              <p className="option-card-description">Preview how your design will look</p>
              
              <div className="preview-thumbnails">
                <button
                  className={`preview-thumbnail ${currentView === 'template' ? 'active' : ''}`}
                  onClick={() => setCurrentView('template')}
                  title="Template View"
                >
                  <img src={tshirtBase} alt="Template" />
                  <span className="thumbnail-label">Template</span>
                </button>
                <button
                  className={`preview-thumbnail ${currentView === 'realistic' ? 'active' : ''}`}
                  onClick={() => setCurrentView('realistic')}
                  title="Realistic View"
                >
                  <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_realistic.png?v=1761181061" alt="Realistic" />
                  <span className="thumbnail-label">Realistic</span>
                </button>
                <button
                  className={`preview-thumbnail ${currentView === 'design-only' ? 'active' : ''}`}
                  onClick={() => designImage && setCurrentView('design-only')}
                  title={designImage ? "Design Only" : "Generate a design first"}
                  disabled={!designImage}
                  style={{ opacity: designImage ? 1 : 0.4, cursor: designImage ? 'pointer' : 'not-allowed' }}
                >
                  <img src={designImage?.url || "https://cdn.shopify.com/s/files/1/0916/8266/8909/files/Blank_Image.png?v=1761257355"} alt={designImage ? "Design Only" : "Generate Design"} />
                  <span className="thumbnail-label">Design</span>
                </button>
                <button
                  className={`preview-thumbnail ${currentView === 'person' ? 'active' : ''}`}
                  onClick={() => setCurrentView('person')}
                  title="Model View"
                >
                  <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608" alt="On Model" />
                  <span className="thumbnail-label">On Model</span>
                </button>
              </div>
            </div>
            
            <div className="options-content">
              {/* Product Details */}
              <div className="option-card">
                <h3 className="option-card-title">Product Details</h3>
                
                <div className="form-group">
                  <label className="form-label">Product Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Awesome T-Shirt Design"
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe your product..."
                    rows="4"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Price (USD) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="29.99"
                    step="0.01"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Available Colors */}
              <div className="option-card">
                <h3 className="option-card-title">Available Colors</h3>
                <p className="option-card-description">Select which colors customers can choose from</p>
                
                <div className="checkbox-grid">
                  {colors.map(color => (
                    <label key={color} className="checkbox-label">
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
                      />
                      <span className="checkbox-text">{color.charAt(0).toUpperCase() + color.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Available Sizes */}
              <div className="option-card">
                <h3 className="option-card-title">Available Sizes</h3>
                <p className="option-card-description">Select which sizes customers can choose from</p>
                
                <div className="checkbox-grid">
                  {sizes.map(size => (
                    <label key={size} className="checkbox-label">
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
                      />
                      <span className="checkbox-text">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Launch Actions */}
              <div className="launch-actions">
                <button className="btn btn-primary btn-launch" onClick={handleSave}>
                  🚀 Launch Product
                </button>
                <button className="btn btn-secondary" onClick={handleBackToDesign}>
                  Back to Design
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
