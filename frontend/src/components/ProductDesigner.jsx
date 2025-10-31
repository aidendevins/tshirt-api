import { useState, useRef, useEffect } from 'react';
import tshirtBase from '../assets/t-front_800x800.png';
import testDesignImage from '../assets/edit.png';

export default function ProductDesigner({ onSave, onCancel }) {
  // Canvas state
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  
  // Design state
  const [designImage, setDesignImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
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
  
  // T-shirt options
  const [tshirtColor, setTshirtColor] = useState('white');
  const [tshirtSize, setTshirtSize] = useState('M');
  
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
    canvas.width = 600;
    canvas.height = 600;
    
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
      loadImage(tshirtBase),
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
  
  // Auto-populate test design image for faster local testing
  useEffect(() => {
    if (!ctx || designImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const printAreaX = canvas.width * 0.28;
      const printAreaY = canvas.height * 0.35;
      const printAreaWidth = canvas.width * 0.44;
      const printAreaHeight = canvas.height * 0.35;
      setDesignImage({
        img,
        url: testDesignImage,
        x: printAreaX,
        y: printAreaY,
        width: printAreaWidth,
        height: printAreaHeight
      });
    };
    img.src = testDesignImage;
  }, [ctx]);

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
    
    // Draw t-shirt template based on current view (template uses local asset)
    const tshirtImg = currentView === 'template' ? tshirtImages.template :
                      currentView === 'realistic' ? tshirtImages.realistic :
                      currentView === 'person' ? tshirtImages.person :
                      currentView === 'design-only' ? tshirtImages.designOnly :
                      tshirtImages.template;
    
    if (tshirtImg) {
      // Calculate dimensions to fit canvas
      const scale = Math.min(w / tshirtImg.width, h / tshirtImg.height) * 0.95;
      const imgWidth = tshirtImg.width * scale;
      const imgHeight = tshirtImg.height * scale;
      const imgX = (w - imgWidth) / 2;
      const imgY = (h - imgHeight) / 2;
      
      ctx.drawImage(tshirtImg, imgX, imgY, imgWidth, imgHeight);
    }
    
    // Define print area (centered on the t-shirt chest area)
    const printAreaX = w * 0.28;
    const printAreaY = h * 0.35;
    const printAreaWidth = w * 0.44;
    const printAreaHeight = h * 0.35;
    
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
    
    ctx.font = `${textEl.fontSize}px ${textEl.font}`;
    ctx.fillStyle = textEl.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = textEl.text;
    const centerX = textEl.x + textEl.width / 2;
    const centerY = textEl.y + textEl.height / 2;
    
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
  
  const constrainToPrintArea = (x, y, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x, y, width, height };
    
    const printAreaX = canvas.width * 0.28;
    const printAreaY = canvas.height * 0.35;
    const printAreaWidth = canvas.width * 0.44;
    const printAreaHeight = canvas.height * 0.35;
    
    let newX = Math.max(printAreaX, Math.min(x, printAreaX + printAreaWidth - width));
    let newY = Math.max(printAreaY, Math.min(y, printAreaY + printAreaHeight - height));
    let newWidth = Math.min(width, printAreaWidth);
    let newHeight = Math.min(height, printAreaHeight);
    
    return { x: newX, y: newY, width: newWidth, height: newHeight };
  };
  
  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (currentView === 'design-only') return;
    if (!designImage && !textElement && sprites.length === 0) return;
    
    const pos = getMousePos(e);
    
    // Check sprite interaction first
    for (let i = sprites.length - 1; i >= 0; i--) {
      if (isPointInSprite(sprites[i], pos.x, pos.y)) {
        setIsDesignSelected(false);
        setIsTextSelected(false);
        setSprites(sprites.map((s, idx) => ({ ...s, isSelected: idx === i })));
        setDragStart({ x: pos.x - sprites[i].x, y: pos.y - sprites[i].y });
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
    
    // Handle text resizing
    if (isTextResizing && textElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      let newWidth = startDimensions.width;
      let newHeight = startDimensions.height;
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      if (textResizeHandle.includes('r')) newWidth += dx;
      if (textResizeHandle.includes('l')) { newWidth -= dx; newX += dx; }
      if (textResizeHandle.includes('b')) newHeight += dy;
      if (textResizeHandle.includes('t')) { newHeight -= dy; newY += dy; }
      
      if (newWidth > 50 && newHeight > 20) {
        const constrained = constrainToPrintArea(newX, newY, newWidth, newHeight);
        setTextElement({ 
          ...textElement, 
          x: constrained.x, 
          y: constrained.y, 
          width: constrained.width, 
          height: constrained.height 
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
    
    // Handle design resizing
    if (isResizing && designImage) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      let newWidth = startDimensions.width;
      let newHeight = startDimensions.height;
      let newX = startDimensions.x;
      let newY = startDimensions.y;
      
      if (resizeHandle.includes('r')) newWidth += dx;
      if (resizeHandle.includes('l')) { newWidth -= dx; newX += dx; }
      if (resizeHandle.includes('b')) newHeight += dy;
      if (resizeHandle.includes('t')) { newHeight -= dy; newY += dy; }
      
      // Maintain aspect ratio
      const aspectRatio = startDimensions.width / startDimensions.height;
      if (Math.abs(newWidth / newHeight - aspectRatio) > 0.1) {
        newHeight = newWidth / aspectRatio;
      }
      
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
  }, [designImage, textElement, sprites, isDesignSelected, isTextSelected, isDragging, isResizing, isTextDragging, isTextResizing, currentView]);
  
  // Attach keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesignSelected, isTextSelected, sprites, designImage, textElement]);
  
  // Handle AI generation
  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      setError('Please enter a prompt or upload an image');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-sd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'A t-shirt design',
          image: uploadedImage
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      
      // Load generated image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        const printAreaX = canvas.width * 0.28;
        const printAreaY = canvas.height * 0.35;
        const printAreaWidth = canvas.width * 0.44;
        const printAreaHeight = canvas.height * 0.35;
        
        const newDesignImage = {
          img,
          url: data.imageUrl,
          x: printAreaX,
          y: printAreaY,
          width: printAreaWidth,
          height: printAreaHeight
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
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Remove uploaded image
  const handleRemoveUploadedImage = () => {
    setUploadedImage(null);
    setUploadedFileName('');
  };
  
  // Load design from history
  const handleLoadFromHistory = (historyItem, index) => {
    const canvas = canvasRef.current;
    const printAreaX = canvas.width * 0.28;
    const printAreaY = canvas.height * 0.35;
    const printAreaWidth = canvas.width * 0.44;
    const printAreaHeight = canvas.height * 0.35;
    
    setDesignImage({
      img: historyItem.image,
      url: historyItem.url,
      x: printAreaX,
      y: printAreaY,
      width: printAreaWidth,
      height: printAreaHeight
    });
    
    setCurrentHistoryIndex(index);
  };
  
  // Handle text addition
  const handleAddText = () => {
    if (!textInput.trim()) return;
    
    const canvas = canvasRef.current;
    const measurementCtx = canvas.getContext('2d');
    measurementCtx.font = `${fontSize}px ${textFont}`;
    const measuredWidth = measurementCtx.measureText(textInput).width;
    const newText = {
      text: textInput,
      font: textFont,
      color: textColor,
      fontSize: fontSize,
      warpStyle: textWarpStyle,
      x: canvas.width * 0.25,
      y: canvas.height * 0.5,
      width: Math.max(measuredWidth, canvas.width * 0.3),
      height: fontSize
    };
    
    setTextElement(newText);
    setShowTextEditor(false);
  };
  
  // Handle sprite addition
  const handleAddSprite = (emoji) => {
    const canvas = canvasRef.current;
    const newSprite = {
      emoji,
      size: 60,
      x: canvas.width * 0.4,
      y: canvas.height * 0.4,
      width: 60,
      height: 60,
      isSelected: false
    };
    
    setSprites([...sprites, newSprite]);
  };
  
  // Save design
  const handleSave = async () => {
    if (!designImage && !textElement && sprites.length === 0) {
      setError('Please add a design before saving');
      return;
    }
    
    const canvas = canvasRef.current;
    const designData = {
      imageUrl: canvas.toDataURL('image/png'),
      tshirtColor,
      tshirtSize,
      price: 29.99,
      timestamp: new Date().toISOString()
    };
    
    onSave(designData);
  };
  
  return (
    <div className="product-designer">
      <div className="designer-layout">
        {/* Canvas Viewer */}
        <div className="canvas-section canvas-card">
          <div className="tshirt-viewer">
            <div className="canvas-container">
              {/* History Toggle Button */}
              <button
                className={`design-history-toggle ${showHistory ? 'active' : ''}`}
                onClick={() => setShowHistory(!showHistory)}
              >
                History
              </button>
              
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
              onClick={() => setCurrentView('design-only')}
              title="Design Only"
              disabled={!designImage}
              style={{ opacity: designImage ? 1 : 0.4 }}
            >
              <img src={designImage?.url || "https://cdn.shopify.com/s/files/1/0916/8266/8909/files/Blank_Image.png?v=1761257355"} alt="Design Only" />
            </button>
            <button
              className={`thumbnail-btn ${currentView === 'person' ? 'active' : ''}`}
              onClick={() => setCurrentView('person')}
              title="Model View"
            >
              <img src="https://cdn.shopify.com/s/files/1/0916/8266/8909/files/t-front_with_person.png?v=1761181608" alt="On Model" />
            </button>
          </div>
          
          {/* Instructions */}
          <div className="instructions">
            <strong>💡 How to use:</strong>
            • Drag your design to reposition it<br />
            • Use corner handles to resize<br />
            • Design stays within print boundaries<br />
            • Click thumbnails to preview different views
          </div>
        </div>
        
        {/* Controls */}
        <div className="controls-section">
          {/* T-Shirt Options */}
          <div className="control-group card">
            <label className="control-label">T-Shirt Options</label>
            
            <div className="option-group">
              <span className="option-label">Color</span>
              <div className="options-row">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`option-btn ${tshirtColor === color ? 'selected' : ''}`}
                    onClick={() => setTshirtColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="option-group">
              <span className="option-label">Size</span>
              <div className="options-row">
                {sizes.map(size => (
                  <button
                    key={size}
                    className={`option-btn ${tshirtSize === size ? 'selected' : ''}`}
                    onClick={() => setTshirtSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* AI Generation */}
          <div className="control-group generator-card">
            <div className="card-header">
              <h3 className="card-title">AI Design Generator</h3>
              <label className="upload-indicator" htmlFor="image-upload">
                <span className={uploadedImage ? 'image-added' : ''}>
                  {uploadedImage ? '✓ Image Added' : '+ Upload Image'}
                </span>
              </label>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            
            {uploadedImage && (
              <div className="image-preview-card">
                <img src={uploadedImage} alt="Upload" className="preview-image" />
                <div className="preview-info">
                  <strong>Uploaded Image</strong>
                  <p>{uploadedFileName}</p>
                </div>
                <button className="btn-remove" onClick={handleRemoveUploadedImage}>
                  Remove
                </button>
              </div>
            )}
            
            <textarea
              className="prompt-field"
              placeholder="Describe your t-shirt design..."
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
            
            {error && <div className="error-box visible">{error}</div>}
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
                  
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="size-slider"
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
            <button className="btn btn-primary btn-save" onClick={handleSave}>
              💾 Save Product
            </button>
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
