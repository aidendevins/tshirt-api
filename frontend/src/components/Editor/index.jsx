import { useState, useEffect, useRef, useMemo } from 'react';
import { getCreatorSession, setPrintifyVariants, getPrintifyVariants } from '../../utils/session';
import tFrontImg from '../../assets/t-front.png';
import tBackImg from '../../assets/t-back.png';
import tSleeveImg from '../../assets/t-sleeve.png';
import tNeckLabelImg from '../../assets/t-necklabel.png';
import tFrontRealisticImg from '../../assets/t-front-realistic.png';
import tBackRealisticImg from '../../assets/t-realistic-back.png';
import tSleeveRealisticImg from '../../assets/t-sleeve-realistic.png';
import tNeckRealisticImg from '../../assets/t-neck-realistic.png';

import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import CanvasArea from './CanvasArea';
// import ExportModal from './ExportModal';

// Print area restriction constants
const PRINT_AREA_CONFIG = {
  'front': { x: 0.332, y: 0.228, width: 0.344, height: 0.453 },
  'back': { x: 0.332, y: 0.161, width: 0.344, height: 0.453 },
  'leftSleeve': { x: 0.423, y: 0.434, width: 0.163, height: 0.173 },
  'rightSleeve': { x: 0.423, y: 0.434, width: 0.163, height: 0.173 },
  'neckLabel': { x: 0.365, y: 0.308, width: 0.278, height: 0.295 }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper for text wrapping
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const word = words[n];
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth) {
      // Line too long
      if (line.length > 0) {
        lines.push(line);
        line = '';
      }

      // Check if word itself is too long
      const wordMetrics = ctx.measureText(word);
      if (wordMetrics.width > maxWidth) {
        // Break word characters
        let tempLine = '';
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          const testCharLine = tempLine + char;
          if (ctx.measureText(testCharLine).width > maxWidth) {
            lines.push(tempLine);
            tempLine = char;
          } else {
            tempLine = testCharLine;
          }
        }
        line = tempLine + ' ';
      } else {
        line = word + ' ';
      }
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  return lines;
};

// Helper for curved text
const drawCurvedText = (ctx, text, x, y, width, height, size, font, color, align, curveType, curveStrength) => {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate radius based on curve strength (0-100)
  // 100% strength = semi-circle (radius = width / 2)
  // Lower strength = larger radius (flatter curve)
  const strength = Math.max(1, curveStrength); // Avoid division by zero
  const radius = (width / 2) / Math.sin((strength * Math.PI) / 200);

  // Center of the circle
  let cx = x + width / 2;

  const anglePerChar = (strength * Math.PI) / 100 / text.length; // Spread based on strength
  const totalAngle = anglePerChar * (text.length - 1);
  let startAngle = -totalAngle / 2;

  // Adjust start angle based on alignment if needed (simplified to center for now)

  text.split('').forEach((char, i) => {
    const angle = startAngle + (i * anglePerChar);

    ctx.save();

    if (curveType === 'archUp') {
      // Arch Up (Smile / U shape)
      // Center is ABOVE the text (y - radius)
      // We draw at the BOTTOM of the circle
      const cy = y - radius + height / 2;

      ctx.translate(
        cx + (radius * Math.sin(angle)),
        cy + (radius * Math.cos(angle))
      );
      // Rotate -angle to keep text upright relative to the curve (Smile)
      ctx.rotate(-angle);

    } else {
      // Arch Down (Frown / n shape)
      // Center is BELOW the text (y + radius)
      // We draw at the TOP of the circle
      const cy = y + radius + height / 2;

      ctx.translate(
        cx + (radius * Math.sin(angle)),
        cy - (radius * Math.cos(angle))
      );
      // Rotate angle to keep text upright relative to the curve (Frown)
      ctx.rotate(angle);
    }

    ctx.fillText(char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
};

// Helper to calculate best fit font size
const calculateBestFitFontSize = (ctx, text, width, height, font, bold, italic) => {
  let minSize = 5;
  let maxSize = 500;
  let bestSize = minSize;

  while (minSize <= maxSize) {
    const mid = Math.floor((minSize + maxSize) / 2);
    ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${mid}px ${font}`;
    const lines = wrapText(ctx, text, 0, 0, width, mid);
    const totalHeight = lines.length * mid;

    if (totalHeight <= height) {
      bestSize = mid;
      minSize = mid + 1;
    } else {
      maxSize = mid - 1;
    }
  }
  return bestSize;
};

export default function ProductDesigner({ onSave, onCancel }) {
  // Layout State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('ai');
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [showGrid, setShowGrid] = useState(true);

  // AI Options
  const [textInGenPrompt, setTextInGenPrompt] = useState('');
  const [textStyleOption, setTextStyleOption] = useState('');
  const [customTextStyle, setCustomTextStyle] = useState('');
  const [imageStyle, setImageStyle] = useState('Realistic Photo');
  const [customImageStyle, setCustomImageStyle] = useState('');
  const [colorTreatment, setColorTreatment] = useState('Keep original colors');
  const [customPaletteColors, setCustomPaletteColors] = useState(['#ffffff', '#000000']);
  const [effectFilter, setEffectFilter] = useState('None');
  const [moodVibe, setMoodVibe] = useState('Playful/Fun');
  const [removeBackground, setRemoveBackground] = useState(false);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewOptions, setShowPreviewOptions] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('29.99');
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState(['S', 'M', 'L', 'XL']);
  const [cachedViewImages, setCachedViewImages] = useState(null);
  const [printifyProductId, setPrintifyProductId] = useState(null);
  const [mockupImages, setMockupImages] = useState([]);
  const [showMockupCarousel, setShowMockupCarousel] = useState(false);
  const [currentMockupIndex, setCurrentMockupIndex] = useState(0);
  const [printifyColors, setPrintifyColors] = useState([]);
  const [colorSearchTerm, setColorSearchTerm] = useState('');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [pendingShopifyData, setPendingShopifyData] = useState(null);
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Layer Order State: { [view]: ['design', 'sprite-0', 'text'] }
  const [layerOrder, setLayerOrder] = useState({
    'front': ['design', 'text'],
    'back': ['design', 'text'],
    'leftSleeve': ['design', 'text'],
    'rightSleeve': ['design', 'text'],
    'neckLabel': ['design', 'text']
  });

  // Helper to get ordered layers for current view
  const getOrderedLayers = (view) => {
    const order = layerOrder[view] || [];
    // Filter out layers that don't exist
    return order.filter(id => {
      if (id === 'text') return !!textElements[view];
      if (id === 'design') return !!designImages[view];
      if (id.startsWith('sprite-')) {
        const idx = parseInt(id.split('-')[1]);
        return spritesPerView[view] && spritesPerView[view][idx];
      }
      return false;
    });
  };

  const handleReorderLayers = (newOrder) => {
    setLayerOrder({
      ...layerOrder,
      [currentView]: newOrder
    });
  };

  // Canvas state
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [previewCtx, setPreviewCtx] = useState(null);

  // Design state
  const [designImages, setDesignImages] = useState({ front: null, back: null, leftSleeve: null, rightSleeve: null, neckLabel: null });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [prompt, setPrompt] = useState('');

  // History
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // View state
  const [currentView, setCurrentView] = useState('front');
  const [tshirtImages, setTshirtImages] = useState({ front: null, back: null, leftSleeve: null, rightSleeve: null, neckLabel: null });

  // Text state
  const [textElements, setTextElements] = useState({ front: null, back: null, leftSleeve: null, rightSleeve: null, neckLabel: null });

  // Sprites state
  const [spritesPerView, setSpritesPerView] = useState({ front: [], back: [], leftSleeve: [], rightSleeve: [], neckLabel: [] });
  const [spritesLibrary, setSpritesLibrary] = useState([]);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [shouldFocusText, setShouldFocusText] = useState(false);

  // Derived state for current view
  const textElement = textElements[currentView];
  const sprites = spritesPerView[currentView];
  const currentDesign = designImages[currentView];

  // Layer List Construction
  const layers = useMemo(() => {
    const list = [];
    const ordered = getOrderedLayers(currentView);
    ordered.forEach(layerId => {
      if (layerId === 'design' && currentDesign) {
        list.push({ id: 'design', type: 'image', name: 'Main Design', ...currentDesign, preview: currentDesign.url });
      } else if (layerId === 'text' && textElement) {
        list.push({ id: 'text', type: 'text', name: textElement.text, ...textElement });
      } else if (layerId.startsWith('sprite-')) {
        const idx = parseInt(layerId.split('-')[1]);
        const s = sprites[idx];
        if (s) list.push({ id: `sprite-${idx}`, type: 'sprite', name: s.emoji || 'Sprite', ...s, content: s.emoji });
      }
    });
    return list.reverse(); // Top on top
  }, [currentDesign, textElement, sprites, layerOrder, currentView]);

  // Initialization - Re-run when returning from preview options
  useEffect(() => {
    // Only initialize when in editor view (not in preview or mockup views)
    if (showPreviewOptions || showMockupCarousel) return;

    // Wait a bit for canvas to be mounted
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (!canvas || !previewCanvas) {
        console.warn('Canvas refs not available yet');
        return;
      }

      const context = canvas.getContext('2d');
      const previewContext = previewCanvas.getContext('2d');
      if (context && previewContext) {
        setCtx(context);
        setPreviewCtx(previewContext);
        console.log('Canvas contexts initialized');
      }

      // Load t-shirt template images (only if not already loaded)
      if (!tshirtImages.front) {
        const loadImage = (src) => new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

        Promise.all([
          loadImage(tFrontImg), loadImage(tBackImg), loadImage(tSleeveImg), loadImage(tSleeveImg), loadImage(tNeckLabelImg)
        ]).then(([front, back, leftSleeve, rightSleeve, neckLabel]) => {
          setTshirtImages({ front, back, leftSleeve, rightSleeve, neckLabel });
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showPreviewOptions, showMockupCarousel]); // Re-initialize when views change

  // Redraw
  useEffect(() => {
    if (ctx && previewCtx && tshirtImages.front && !showPreviewOptions && !showMockupCarousel) {
      drawCanvas();
    }
  }, [designImages, textElements, spritesPerView, currentView, ctx, previewCtx, tshirtImages, selectedLayerId, layerOrder, showPreviewOptions, showMockupCarousel]);

  // Force redraw when returning from preview options
  useEffect(() => {
    if (!showPreviewOptions && !showMockupCarousel) {
      // Wait for canvas to be mounted and contexts to be set
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        if (canvas && previewCanvas) {
          // Always re-initialize contexts when returning to editor
          const context = canvas.getContext('2d');
          const previewContext = previewCanvas.getContext('2d');
          setCtx(context);
          setPreviewCtx(previewContext);
          
          // Redraw if we have t-shirt images loaded
          if (tshirtImages.front) {
            // Use a small delay to ensure state is updated
            setTimeout(() => {
              drawCanvas();
            }, 50);
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showPreviewOptions, showMockupCarousel, tshirtImages.front]);

  // Sync Text Height - REMOVED to prevent jumping
  // Height is now strictly controlled by user resizing
  /*
  useEffect(() => {
      if (!ctx) return;
      let changed = false;
      const newTextElements = { ...textElements };
      
      Object.keys(textElements).forEach(view => {
          const t = textElements[view];
          if (t) {
              ctx.font = `${t.size}px ${t.font}`;
              const lines = wrapText(ctx, t.text, 0, 0, t.size);
              const h = lines.length * t.size;
              if (t.height !== h) {
                  newTextElements[view] = { ...t, height: h };
                  changed = true;
              }
          }
      });
      
      if (changed) {
          setTextElements(newTextElements);
      }
  }, [textElements, ctx]);
  */

  // Helpers
  const saveState = () => {
    const state = {
      designImages: { ...designImages },
      textElements: { ...textElements },
      spritesPerView: { ...spritesPerView },
      layerOrder: { ...layerOrder }
    };
    setUndoStack([...undoStack, state]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const newState = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, { designImages, textElements, spritesPerView, layerOrder }]);
    setUndoStack(undoStack.slice(0, -1));
    setDesignImages(newState.designImages);
    setTextElements(newState.textElements);
    setSpritesPerView(newState.spritesPerView);
    setLayerOrder(newState.layerOrder);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const newState = redoStack[redoStack.length - 1];
    setUndoStack([...undoStack, { designImages, textElements, spritesPerView, layerOrder }]);
    setRedoStack(redoStack.slice(0, -1));
    setDesignImages(newState.designImages);
    setTextElements(newState.textElements);
    setSpritesPerView(newState.spritesPerView);
    setLayerOrder(newState.layerOrder);
  };

  // Data Updates
  const updateLayer = (id, updates) => {
    saveState();
    if (id === 'design') {
      setDesignImages({ ...designImages, [currentView]: { ...designImages[currentView], ...updates } });
    } else if (id === 'text') {
      const currentText = textElements[currentView];
      const newTextElement = { ...textElements[currentView], ...updates };

      // When text/font size/font family/style changes, dynamically resize the box to fit the text
      const textChanged = updates.text !== undefined;
      const fontChanged = updates.size !== undefined || updates.font !== undefined || updates.bold !== undefined || updates.italic !== undefined;
      const curveChanged = updates.isCurved !== undefined || updates.curveType !== undefined || updates.curveStrength !== undefined;

      // Always recalculate dimensions when text or font changes (unless manually resizing via width/height)
      if ((textChanged || fontChanged || curveChanged) && ctx) {
        const newText = updates.text !== undefined ? updates.text : currentText.text;
        const fontSize = updates.size !== undefined ? updates.size : currentText.size;
        const font = updates.font !== undefined ? updates.font : currentText.font;
        const isBold = updates.bold !== undefined ? updates.bold : currentText.bold;
        const isItalic = updates.italic !== undefined ? updates.italic : currentText.italic;
        const isCurved = updates.isCurved !== undefined ? updates.isCurved : currentText.isCurved;
        const curveStrength = updates.curveStrength !== undefined ? updates.curveStrength : currentText.curveStrength;

        // Set font for measurements
        ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${font}`;

        // Determine the width to use for wrapping calculation
        // If width is explicitly set in updates, use it; otherwise use current width
        let widthForWrapping = updates.width !== undefined ? updates.width : currentText.width;

        // Calculate required width based on text content if not manually set
        if (updates.width === undefined) {
          const singleLineWidth = ctx.measureText(newText).width;
          const padding = 20;
          // Start with current width or needed width, whichever is larger
          widthForWrapping = Math.max(currentText.width, singleLineWidth + padding, 50);
        }

        let requiredHeight;
        let finalWidth = updates.width !== undefined ? updates.width : Math.max(currentText.width, widthForWrapping);

        if (isCurved) {
          // Calculate height for curved text
          // Radius calculation matches drawCurvedText
          const strength = Math.max(1, curveStrength || 0);
          const radius = (finalWidth / 2) / Math.sin((strength * Math.PI) / 200);

          // Calculate total angle
          const anglePerChar = (strength * Math.PI) / 100 / newText.length;
          const totalAngle = anglePerChar * (newText.length - 1);

          // Sagitta (height of the arc) = R * (1 - cos(theta/2))
          const arcHeight = radius * (1 - Math.cos(totalAngle / 2));

          // Total height is arc height + font size (with some padding)
          requiredHeight = arcHeight + fontSize + 20;

          // For curved text, we don't wrap, so we just use the calculated height
        } else {
          // Standard wrapping logic
          // Wrap text with the determined width to get accurate line count
          let lines = wrapText(ctx, newText, 0, 0, widthForWrapping, fontSize);

          // If width isn't manually set, check if we need to expand it for wrapped lines
          if (updates.width === undefined) {
            const maxLineWidth = lines.length > 0 ? Math.max(...lines.map(line => ctx.measureText(line).width)) : 0;
            if (maxLineWidth > widthForWrapping) {
              widthForWrapping = maxLineWidth;
              // Re-wrap with new width
              lines = wrapText(ctx, newText, 0, 0, widthForWrapping, fontSize);
            }
          }

          // Final width to use (for height calculation and assignment)
          finalWidth = updates.width !== undefined ? updates.width : Math.max(currentText.width, widthForWrapping);

          // Always recalculate lines with final width to ensure accurate height calculation
          lines = wrapText(ctx, newText, 0, 0, finalWidth, fontSize);

          // Calculate required height based on number of lines with final width
          requiredHeight = Math.max(lines.length * fontSize, fontSize); // At least one line height
        }

        // Auto-grow width when text/font changes (unless manually set)
        if (updates.width === undefined) {
          newTextElement.width = finalWidth;
        }

        // Always update height when text/font changes (unless manually set)
        // This ensures the box grows as more text is added
        if (updates.height === undefined) {
          newTextElement.height = requiredHeight;
        }

        // Constrain to print area bounds
        const canvas = canvasRef.current;
        if (canvas) {
          const printArea = PRINT_AREA_CONFIG[currentView];
          const bounds = {
            minX: canvas.width * printArea.x,
            maxX: canvas.width * (printArea.x + printArea.width),
            minY: canvas.height * printArea.y,
            maxY: canvas.height * (printArea.y + printArea.height)
          };

          // Ensure box doesn't exceed bounds
          const maxWidth = bounds.maxX - newTextElement.x;
          const maxHeight = bounds.maxY - newTextElement.y;
          newTextElement.width = Math.min(newTextElement.width, maxWidth);

          // Recalculate with constrained width to get accurate line count
          if (newTextElement.width < widthForWrapping) {
            lines = wrapText(ctx, newText, 0, 0, newTextElement.width, fontSize);
            const recalculatedHeight = Math.max(lines.length * fontSize, fontSize);
            newTextElement.height = Math.min(recalculatedHeight, maxHeight);
          } else {
            newTextElement.height = Math.min(newTextElement.height, maxHeight);
          }
        }
      }

      setTextElements({ ...textElements, [currentView]: newTextElement });
    } else if (id.startsWith('sprite-')) {
      const idx = parseInt(id.split('-')[1]);
      const newSprites = [...sprites];
      newSprites[idx] = { ...newSprites[idx], ...updates };
      setSpritesPerView({ ...spritesPerView, [currentView]: newSprites });
    }
  };

  const handleAddText = () => {
    saveState();
    const canvas = canvasRef.current;
    const printArea = PRINT_AREA_CONFIG[currentView];

    const defaultText = 'Double Click to Edit';
    const defaultSize = 40;
    const defaultFont = 'Arial Black';

    // Calculate exact dimensions
    ctx.font = `${defaultSize}px ${defaultFont}`;
    const lines = wrapText(ctx, defaultText, 0, 0, canvas.width * printArea.width, defaultSize);
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width), ctx.measureText(defaultText).width);
    const textHeight = lines.length * defaultSize;

    // Calculate bounds
    const bounds = {
      minX: canvas.width * printArea.x,
      maxX: canvas.width * (printArea.x + printArea.width),
      minY: canvas.height * printArea.y,
      maxY: canvas.height * (printArea.y + printArea.height)
    };

    // Center text visually, but constrain within bounds
    let x = canvas.width * (printArea.x + printArea.width / 2) - (textWidth / 2);
    let y = canvas.height * (printArea.y + printArea.height / 2) - (textHeight / 2);

    // Constrain to bounds
    x = Math.max(bounds.minX, Math.min(x, bounds.maxX - textWidth));
    y = Math.max(bounds.minY, Math.min(y, bounds.maxY - textHeight));

    // Ensure width/height don't exceed available space
    const maxWidth = bounds.maxX - x;
    const maxHeight = bounds.maxY - y;
    const finalWidth = Math.min(textWidth, maxWidth);
    const finalHeight = Math.min(textHeight, maxHeight);

    const newTextElement = {
      id: 'text',
      type: 'text',
      text: defaultText,
      x: x,
      y: y,
      size: defaultSize,
      color: '#000000',
      font: defaultFont,
      width: finalWidth,
      height: finalHeight,
      align: 'center',
      bold: false,
      italic: false,
      isCurved: false,
      curveType: 'archUp',
      curveStrength: 20,
      rotation: 0,
      opacity: 1
    };

    setTextElements({
      ...textElements,
      [currentView]: newTextElement
    });

    // Add to layer order if not present
    if (!layerOrder[currentView].includes('text')) {
      setLayerOrder({
        ...layerOrder,
        [currentView]: [...layerOrder[currentView], 'text']
      });
    }

    setSelectedLayerId('text');
    setActiveTab('layers'); // Switch to layers to show properties
  };

  const handleAddSprite = ({ type, content, src }) => {
    saveState();
    const canvas = canvasRef.current;
    const printArea = PRINT_AREA_CONFIG[currentView];
    const x = canvas.width * (printArea.x + printArea.width / 2) - 30;
    const y = canvas.height * (printArea.y + printArea.height / 2) - 30;

    const newSprite = {
      emoji: type === 'emoji' ? content : null,
      image: type === 'image' ? (() => { const img = new Image(); img.src = src; return img; })() : null,
      x, y, size: 60, width: 60, height: 60, opacity: 1
    };

    setSpritesPerView({
      ...spritesPerView,
      [currentView]: [...sprites, newSprite]
    });

    // Add to layer order
    const newSpriteId = `sprite-${sprites.length}`;
    setLayerOrder({
      ...layerOrder,
      [currentView]: [...layerOrder[currentView], newSpriteId]
    });

    // Select the new sprite
    setSelectedLayerId(newSpriteId);
  };

  // Image Upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setUploadedImages(prev => [...prev, {
            data: event.target.result,
            name: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight
          }]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Canvas Drawing
  const drawCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Draw T-Shirt
    const bg = tshirtImages[currentView];
    if (bg) ctx.drawImage(bg, 0, 0, w, h);

    // Draw Print Area Guide (if in editor)
    const area = PRINT_AREA_CONFIG[currentView];
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(w * area.x, h * area.y, w * area.width, h * area.height);
      ctx.setLineDash([]);
    }

    // Render Layers based on Order
    const orderedLayers = getOrderedLayers(currentView);
    console.log('Drawing Canvas:', { currentView, layerOrder: layerOrder[currentView], orderedLayers, designImage: designImages[currentView], textElement: textElements[currentView] });

    orderedLayers.forEach(layerId => {
      if (layerId === 'design') {
        if (currentDesign) {
          ctx.save();
          ctx.globalAlpha = currentDesign.opacity !== undefined ? currentDesign.opacity : 1;
          ctx.drawImage(currentDesign.img, currentDesign.x, currentDesign.y, currentDesign.width, currentDesign.height);
          ctx.restore();
          if (selectedLayerId === 'design') drawSelectionBox(currentDesign, currentDesign.rotation || 0, false);
        }
      } else if (layerId.startsWith('sprite-')) {
        const idx = parseInt(layerId.split('-')[1]);
        const s = (spritesPerView[currentView] || [])[idx];
        if (s) {
          ctx.save();
          ctx.globalAlpha = s.opacity !== undefined ? s.opacity : 1;
          if (s.image) {
            ctx.drawImage(s.image, s.x, s.y, s.width || s.size, s.height || s.size);
          } else {
            ctx.font = `${s.size}px Arial`;
            ctx.fillText(s.emoji, s.x, s.y + s.size);
          }
          ctx.restore();
          if (selectedLayerId === layerId) drawSelectionBox({ x: s.x, y: s.y, width: s.width || s.size, height: s.height || s.size }, s.rotation || 0, false);
        }
      } else if (layerId === 'text') {
        if (textElement) {
          ctx.save();
          ctx.globalAlpha = textElement.opacity !== undefined ? textElement.opacity : 1;
          // Apply rotation
          if (textElement.rotation) {
            const cx = textElement.x + textElement.width / 2;
            const cy = textElement.y + textElement.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((textElement.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }

          if (textElement.isCurved) {
            drawCurvedText(
              ctx,
              textElement.text,
              textElement.x,
              textElement.y,
              textElement.width,
              textElement.height,
              textElement.size,
              textElement.font,
              textElement.color,
              textElement.align,
              textElement.curveType,
              textElement.curveStrength
            );
          } else {
            ctx.font = `${textElement.italic ? 'italic ' : ''}${textElement.bold ? 'bold ' : ''}${textElement.size}px ${textElement.font}`;
            ctx.fillStyle = textElement.color;
            ctx.textAlign = textElement.align || 'center';
            ctx.textBaseline = 'top';

            const lines = wrapText(ctx, textElement.text, 0, 0, textElement.width, textElement.size);
            const totalTextHeight = lines.length * textElement.size;
            const startY = textElement.y + (textElement.height - totalTextHeight) / 2;

            lines.forEach((line, i) => {
              let xPos = textElement.x;
              if (ctx.textAlign === 'center') xPos = textElement.x + textElement.width / 2;
              else if (ctx.textAlign === 'right') xPos = textElement.x + textElement.width;

              ctx.fillText(line, xPos, startY + (i * textElement.size));
            });
          }

          ctx.restore();

          if (selectedLayerId === 'text') {
            drawSelectionBox({ x: textElement.x, y: textElement.y, width: textElement.width, height: textElement.height }, textElement.rotation);
          }
        }
      }
    });
  };

  const drawSelectionBox = (rect, rotation = 0, showMiddleHandles = true) => {
    ctx.save();

    // Rotate around center
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // Rotation Knob
    const knobDist = 25;
    ctx.beginPath();
    ctx.moveTo(cx, rect.y);
    ctx.lineTo(cx, rect.y - knobDist);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, rect.y - knobDist, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    // Handles
    const handleSize = 12; // Increased to match hit detection size
    const cornerHandles = [
      { x: rect.x, y: rect.y, cursor: 'nw-resize' }, // TL
      { x: rect.x + rect.width, y: rect.y, cursor: 'ne-resize' }, // TR
      { x: rect.x, y: rect.y + rect.height, cursor: 'sw-resize' }, // BL
      { x: rect.x + rect.width, y: rect.y + rect.height, cursor: 'se-resize' }, // BR
    ];

    const middleHandles = showMiddleHandles ? [
      { x: rect.x + rect.width / 2, y: rect.y, cursor: 'n-resize' }, // Top
      { x: rect.x + rect.width / 2, y: rect.y + rect.height, cursor: 's-resize' }, // Bottom
      { x: rect.x, y: rect.y + rect.height / 2, cursor: 'w-resize' }, // Left
      { x: rect.x + rect.width, y: rect.y + rect.height / 2, cursor: 'e-resize' } // Right
    ] : [];

    const handles = [...cornerHandles, ...middleHandles];

    ctx.fillStyle = '#fff';
    handles.forEach(h => {
      ctx.beginPath();
      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  };

  // Helper function to draw ONLY the design (no t-shirt template) for Printify
  const drawDesignOnlyView = (view) => {
    // Check if we have any design elements for this view
    const hasDesign = designImages[view] || textElements[view] || spritesPerView[view]?.length > 0;
    if (!hasDesign) {
      console.log(`No design elements for ${view}`);
      return null;
    }

    const printifyWidth = 4500;
    const printifyHeight = 5400;
    const scale = printifyWidth / 660;

    const hiResCanvas = document.createElement('canvas');
    hiResCanvas.width = printifyWidth;
    hiResCanvas.height = printifyHeight;
    const tempCtx = hiResCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, printifyWidth, printifyHeight);

    const printArea = PRINT_AREA_CONFIG[view];
    const printAreaWidth = printifyWidth * printArea.width;

    let orderedLayers = getOrderedLayers(view);
    
    // Fallback: if no layers in order but we have designs, add them
    if (orderedLayers.length === 0) {
      orderedLayers = [];
      if (designImages[view]) orderedLayers.push('design');
      if (textElements[view]) orderedLayers.push('text');
      const spriteCount = spritesPerView[view]?.length || 0;
      for (let i = 0; i < spriteCount; i++) {
        orderedLayers.push(`sprite-${i}`);
      }
    }

    console.log(`drawDesignOnlyView for ${view}:`, { orderedLayers, hasDesign: !!designImages[view], hasText: !!textElements[view], spriteCount: spritesPerView[view]?.length || 0 });

    orderedLayers.forEach(layerId => {
      if (layerId === 'design') {
        const design = designImages[view];
        if (design && design.img) {
          // Check if image is loaded
          if (design.img.complete && design.img.naturalWidth > 0) {
            tempCtx.save();
            tempCtx.globalAlpha = design.opacity !== undefined ? design.opacity : 1;
            tempCtx.drawImage(design.img, design.x * scale, design.y * scale, design.width * scale, design.height * scale);
            tempCtx.restore();
          } else {
            console.warn(`Design image for ${view} is not loaded yet`);
          }
        }
      } else if (layerId.startsWith('sprite-')) {
        const idx = parseInt(layerId.split('-')[1]);
        const sprite = (spritesPerView[view] || [])[idx];
        if (sprite) {
          tempCtx.save();
          tempCtx.globalAlpha = sprite.opacity !== undefined ? sprite.opacity : 1;
          if (sprite.emoji) {
            tempCtx.font = `${sprite.size * scale}px Arial`;
            tempCtx.textAlign = 'left';
            tempCtx.textBaseline = 'top';
            tempCtx.fillText(sprite.emoji, sprite.x * scale, (sprite.y * scale) + (sprite.size * scale));
          } else if (sprite.image) {
            tempCtx.drawImage(sprite.image, sprite.x * scale, sprite.y * scale, (sprite.width || sprite.size) * scale, (sprite.height || sprite.size) * scale);
          }
          tempCtx.restore();
        }
      } else if (layerId === 'text') {
        const viewText = textElements[view];
        if (viewText) {
          tempCtx.save();
          tempCtx.globalAlpha = viewText.opacity !== undefined ? viewText.opacity : 1;

          if (viewText.rotation) {
            const cx = (viewText.x * scale) + (viewText.width * scale) / 2;
            const cy = (viewText.y * scale) + (viewText.height * scale) / 2;
            tempCtx.translate(cx, cy);
            tempCtx.rotate((viewText.rotation * Math.PI) / 180);
            tempCtx.translate(-cx, -cy);
          }

          if (viewText.isCurved) {
            drawCurvedText(
              tempCtx,
              viewText.text,
              viewText.x * scale,
              viewText.y * scale,
              viewText.width * scale,
              viewText.height * scale,
              viewText.size * scale,
              viewText.font,
              viewText.color,
              viewText.align,
              viewText.curveType,
              viewText.curveStrength
            );
          } else {
            tempCtx.font = `${viewText.italic ? 'italic ' : ''}${viewText.bold ? 'bold ' : ''}${viewText.size * scale}px ${viewText.font}`;
            tempCtx.fillStyle = viewText.color;
            tempCtx.textAlign = viewText.align || 'center';
            tempCtx.textBaseline = 'top';

            const lines = wrapText(tempCtx, viewText.text, viewText.x * scale, viewText.y * scale, viewText.width * scale, viewText.size * scale);
            lines.forEach((line, i) => {
              let xPos = viewText.x * scale;
              if (tempCtx.textAlign === 'center') xPos = (viewText.x * scale) + (viewText.width * scale) / 2;
              else if (tempCtx.textAlign === 'right') xPos = (viewText.x * scale) + (viewText.width * scale);

              tempCtx.fillText(line, xPos, (viewText.y * scale) + (i * viewText.size * scale));
            });
          }
          tempCtx.restore();
        }
      }
    });

    try { return hiResCanvas.toDataURL('image/png'); } catch (e) { console.error(e); return null; }
  };

  // Helper to draw view with t-shirt
  const drawCanvasView = (view) => {
    if (!ctx || !canvasRef.current) return null;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.fillStyle = '#fafafa';
    tCtx.fillRect(0, 0, w, h);
    const bg = tshirtImages[view];
    if (bg) tCtx.drawImage(bg, 0, 0, w, h);

    const orderedLayers = getOrderedLayers(view);

    orderedLayers.forEach(layerId => {
      if (layerId === 'design') {
        const design = designImages[view];
        if (design) {
          tCtx.save();
          tCtx.globalAlpha = design.opacity !== undefined ? design.opacity : 1;
          tCtx.drawImage(design.img, design.x, design.y, design.width, design.height);
          tCtx.restore();
        }
      } else if (layerId.startsWith('sprite-')) {
        const idx = parseInt(layerId.split('-')[1]);
        const sprite = (spritesPerView[view] || [])[idx];
        if (sprite) {
          tCtx.save();
          tCtx.globalAlpha = sprite.opacity !== undefined ? sprite.opacity : 1;
          if (sprite.emoji) {
            tCtx.font = `${sprite.size}px serif`;
            tCtx.fillText(sprite.emoji, sprite.x, sprite.y + sprite.size);
          } else if (sprite.image) {
            tCtx.drawImage(sprite.image, sprite.x, sprite.y, sprite.width || sprite.size, sprite.height || sprite.size);
          }
          tCtx.restore();
        }
      } else if (layerId === 'text') {
        const t = textElements[view];
        if (t) {
          tCtx.save();
          tCtx.globalAlpha = t.opacity !== undefined ? t.opacity : 1;

          if (t.rotation) {
            const cx = t.x + t.width / 2;
            const cy = t.y + t.height / 2;
            tCtx.translate(cx, cy);
            tCtx.rotate((t.rotation * Math.PI) / 180);
            tCtx.translate(-cx, -cy);
          }

          if (t.isCurved) {
            drawCurvedText(
              tCtx,
              t.text,
              t.x,
              t.y,
              t.width,
              t.height,
              t.size,
              t.font,
              t.color,
              t.align,
              t.curveType,
              t.curveStrength
            );
          } else {
            tCtx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${t.size}px ${t.font}`;
            tCtx.fillStyle = t.color;
            tCtx.textAlign = t.align || 'center';
            tCtx.textBaseline = 'top';

            const lines = wrapText(tCtx, t.text, t.x, t.y, t.width, t.size);
            lines.forEach((line, i) => {
              let xPos = t.x;
              if (tCtx.textAlign === 'center') xPos = t.x + t.width / 2;
              else if (tCtx.textAlign === 'right') xPos = t.x + t.width;

              tCtx.fillText(line, xPos, t.y + (i * t.size));
            });
          }
          tCtx.restore();
        }
      }
    });
    return tempCanvas.toDataURL('image/png');
  };

  const handleGenerateDesign = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError('Please enter a prompt or upload an image');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const creatorSession = getCreatorSession();
      let fullPrompt = prompt.trim() || 'A t-shirt design';

      if (textInGenPrompt.trim()) {
        fullPrompt += `. The design must incorporate this text: "${textInGenPrompt}"`;
        if (textStyleOption && textStyleOption !== 'Custom') {
          fullPrompt += ` in a ${textStyleOption} style`;
        } else if (customTextStyle.trim()) {
          fullPrompt += ` in this text style: ${customTextStyle}`;
        }
      }

      if (imageStyle && imageStyle !== 'Custom') {
        fullPrompt += `, rendered in a ${imageStyle} art style`;
      } else if (customImageStyle.trim()) {
        fullPrompt += `, rendered in a ${customImageStyle} art style`;
      }

      if (colorTreatment === 'Custom palette') {
        fullPrompt += `, using a custom color palette with colors: ${customPaletteColors.join(', ')}`;
      } else if (colorTreatment && colorTreatment !== 'Keep original colors') {
        fullPrompt += `, with ${colorTreatment} color treatment`;
      }

      if (effectFilter && effectFilter !== 'None') {
        fullPrompt += `, with ${effectFilter} visual effect`;
      }

      if (moodVibe) {
        fullPrompt += `. The overall mood should be ${moodVibe}`;
      }

      if (removeBackground) {
        fullPrompt += '. Make the edits on the main object of the image, and make the background all green.';
      }
      // Don't add transparent background instruction - keep the same consistency as the original image

      const response = await fetch(`${API_BASE_URL}/api/generate-sd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          images: uploadedImages.map(img => img.data),
          creatorId: creatorSession?.uid,
          options: {} // Add options from state if we implement advanced AI options
        })
      });

      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();

      // Check if generation was successful
      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || 'Generation failed - no image returned');
      }

      let finalImageUrl = data.imageUrl;

      // If remove background is requested, process the image
      if (removeBackground) {
        try {
          const extractRes = await fetch(`${API_BASE_URL}/api/extract-sprite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: finalImageUrl,
              elementDescription: 'main object'
            })
          });

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            if (extractData.success && extractData.spriteImageUrl) {
              finalImageUrl = extractData.spriteImageUrl;
            } else {
              console.warn('Background removal failed, using original image', extractData.error);
            }
          } else {
            console.warn('Background removal request failed');
          }
        } catch (e) {
          console.error('Error removing background:', e);
        }
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => {
        console.error('Failed to load generated image');
        setError('Failed to load generated image');
      };
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const printArea = PRINT_AREA_CONFIG[currentView];
        const printAreaWidth = canvas.width * printArea.width;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const designWidth = printAreaWidth;
        const designHeight = designWidth / aspectRatio;

        setDesignImages(prev => ({
          ...prev,
          [currentView]: {
            img,
            url: finalImageUrl,
            x: canvas.width * (printArea.x + printArea.width / 2) - designWidth / 2,
            y: canvas.height * (printArea.y + printArea.height / 2) - designHeight / 2,
            width: designWidth,
            height: designHeight,
            rotation: 0,
            opacity: 1
          }
        }));

        console.log('Image Generated & State Updated:', { view: currentView, url: finalImageUrl });

        // Add to layer order if not present
        setLayerOrder(prevOrder => {
          const currentViewOrder = prevOrder[currentView] || [];
          if (!currentViewOrder.includes('design')) {
            return {
              ...prevOrder,
              [currentView]: [...currentViewOrder, 'design']
            };
          }
          return prevOrder;
        });

        setSelectedLayerId('design');
        setActiveTab('layers');
      };
      img.src = finalImageUrl;

    } catch (err) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    const hasAnyDesign = Object.values(designImages).some(d => d !== null) ||
      Object.values(textElements).some(t => t !== null) ||
      Object.values(spritesPerView).some(s => s.length > 0);

    if (!hasAnyDesign) {
      setError('Please create a design first');
      return;
    }

    setIsGenerating(true);
    setError('');
    try {
      const views = ['front', 'back', 'leftSleeve', 'rightSleeve', 'neckLabel'];
      const captured = {};
      for (const view of views) {
        captured[view] = drawCanvasView(view);
      }
      setCachedViewImages(captured);

      try {
        const res = await fetch(`${API_BASE_URL}/api/printify/variants`);
        if (res.ok) {
          const variantsData = await res.json();
          setPrintifyVariants(variantsData);

          // Extract unique colors from variants
          if (variantsData && variantsData.variants) {
            const uniqueColors = [...new Set(
              variantsData.variants.map(variant => variant.options.color)
            )].sort();
            setPrintifyColors(uniqueColors);
          }
        }
      } catch (e) { console.error(e); }

      setShowPreviewOptions(true);
    } catch (e) {
      console.error(e);
      setError('Failed to prepare design');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!productTitle.trim()) { setError('Please enter a product title'); return; }
    if (!productPrice) { setError('Please enter a valid price'); return; }
    if (availableColors.length === 0) { setError('Select at least one color'); return; }
    if (availableSizes.length === 0) { setError('Select at least one size'); return; }

    setIsGenerating(true);
    setError('');
    try {
      const creatorSession = getCreatorSession();
      if (!creatorSession) throw new Error('Session expired');

      // 1. Upload Images
      const uploadedImageIds = {};
      const editorImages = [];
      const views = ['front', 'back', 'leftSleeve', 'rightSleeve', 'neckLabel'];

      console.log('Checking designs for upload:', {
        designImages: Object.keys(designImages).filter(k => designImages[k]),
        textElements: Object.keys(textElements).filter(k => textElements[k]),
        spritesPerView: Object.keys(spritesPerView).filter(k => spritesPerView[k]?.length > 0)
      });

      for (const view of views) {
        const hasDesign = designImages[view] || textElements[view] || spritesPerView[view]?.length > 0;
        console.log(`Checking ${view}:`, {
          hasDesign,
          hasDesignImage: !!designImages[view],
          hasText: !!textElements[view],
          hasSprites: spritesPerView[view]?.length > 0
        });

        if (hasDesign) {
          const designOnly = drawDesignOnlyView(view);
          console.log(`${view} - drawDesignOnlyView result:`, designOnly ? 'Success' : 'Failed (null)');
          
          if (cachedViewImages && cachedViewImages[view]) {
            editorImages.push({ data: cachedViewImages[view], view, type: 'editor' });
          }

          if (designOnly) {
            try {
              console.log(`Uploading ${view} design...`);
              const res = await fetch(`${API_BASE_URL}/api/printify/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageData: designOnly,
                  fileName: `${productTitle}-${view}.png`,
                  creatorId: creatorSession.uid
                })
              });
              if (res.ok) {
                const data = await res.json();
                uploadedImageIds[view] = data.imageId;
                console.log(`✅ Uploaded image for ${view}: ${data.imageId}`);
              } else {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error(`❌ Failed to upload image for ${view}:`, errorData);
                throw new Error(`Failed to upload design for ${view}: ${errorData.error || 'Unknown error'}`);
              }
            } catch (err) {
              console.error(`Error uploading image for ${view}:`, err);
              throw new Error(`Failed to upload design for ${view}: ${err.message}`);
            }
          } else {
            console.warn(`⚠️ drawDesignOnlyView returned null for ${view}`);
          }
        }
      }

      console.log('Uploaded image IDs:', uploadedImageIds);

      if (Object.keys(uploadedImageIds).length === 0) {
        throw new Error('No designs were uploaded successfully. Please ensure you have at least one design on the t-shirt.');
      }

      // 2. Build Variants
      const variantsData = getPrintifyVariants();
      const selectedVariants = [];
      if (variantsData && variantsData.variants) {
        for (const color of availableColors) {
          for (const size of availableSizes) {
            const v = variantsData.variants.find(v => v.options.color.toLowerCase() === color.toLowerCase() && v.options.size === size);
            if (v) selectedVariants.push({ id: v.id, price: Math.round(parseFloat(productPrice) * 100), is_enabled: true });
          }
        }
      }

      // 3. Create Product
      console.log('Creating product with:', {
        title: productTitle,
        uploadedImageIds,
        variants: selectedVariants,
        variantsCount: selectedVariants.length
      });

      if (selectedVariants.length === 0) {
        throw new Error('No variants selected. Please select at least one color and size combination.');
      }

      if (Object.keys(uploadedImageIds).length === 0) {
        throw new Error('No designs uploaded. Please create at least one design.');
      }

      const createRes = await fetch(`${API_BASE_URL}/api/printify/create-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: productTitle, 
          description: productDescription || 'Custom T-Shirt',
          uploadedImageIds, 
          variants: selectedVariants,
          blueprintId: 6, 
          printProviderId: 99
        })
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Printify product creation error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to create Printify product');
      }
      
      const createData = await createRes.json();
      const productId = createData.productId;
      setPrintifyProductId(productId);

      // 4. Fetch Mockups
      const getProdRes = await fetch(`${API_BASE_URL}/api/printify/product/${productId}`);
      if (!getProdRes.ok) throw new Error('Failed to fetch Printify product mockups');
      const prodData = await getProdRes.json();

      // Combine editor previews with Printify mockups
      const mockups = [
        ...editorImages,
        ...(prodData.product.mockups || []).map(m => ({
          src: m.src,
          type: 'mockup',
          variant_ids: m.variant_ids,
          position: m.position
        }))
      ];

      setMockupImages(mockups);
      setCurrentMockupIndex(0);

      // Prepare shopify data for later (will be used when user approves)
      const shopifyDataPrep = {
        editorImages,
        mockups: prodData.product.mockups || [],
        productTitle,
        productPrice: parseFloat(productPrice),
        availableColors,
        availableSizes,
        printifyProductId: productId,
        creatorId: creatorSession.uid
      };
      setPendingShopifyData(shopifyDataPrep);

      // Hide preview options and show mockup carousel
      setShowPreviewOptions(false);
      setShowMockupCarousel(true);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create product');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveMockups = async () => {
    if (!pendingShopifyData) {
      setError('No product data available');
      return;
    }

    setIsGenerating(true);
    setError('');
    try {
      const { editorImages, mockups, productTitle, productPrice, availableColors, availableSizes, printifyProductId, creatorId } = pendingShopifyData;

      const allImages = [
        ...editorImages,
        ...mockups.map(m => ({ data: m.src, view: 'mockup' }))
      ];

      const shopifyRes = await fetch(`${API_BASE_URL}/api/shopify/create-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData: {
            images: allImages,
            title: productTitle,
            description: 'Custom Design',
            price: productPrice,
            availableColors,
            availableSizes,
            printifyProductId: printifyProductId,
            timestamp: new Date().toISOString()
          },
          creatorId: creatorId
        })
      });

      if (!shopifyRes.ok) throw new Error('Failed to create Shopify product');
      const shopifyData = await shopifyRes.json();

      // Link Printify to Shopify
      await fetch(`${API_BASE_URL}/api/printify/link-to-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printifyProductId: printifyProductId, shopifyProductId: shopifyData.product.id })
      });

      setShowMockupCarousel(false);
      if (onSave) onSave(shopifyData);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to publish to Shopify');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRejectMockups = () => {
    setShowMockupCarousel(false);
    setShowPreviewOptions(true);
    setPendingShopifyData(null);
    setMockupImages([]);
  };

  // Interaction Handlers
  // Interaction Handlers
  const handleMouseDown = ({ canvasX, canvasY }) => {
    saveState(); // Save before start dragging

    const handleSize = 12; // Increased from 10 to make handles easier to grab

    const checkHandles = (rect, id, rotation = 0, showMiddleHandles = true) => {
      // Rotate mouse point around center to check against unrotated box
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;

      // Rotate point by -rotation
      const rad = (-rotation * Math.PI) / 180;
      const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
      const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

      // Check Rotation Knob (in unrotated space relative to box)
      const knobDist = 25;
      const knobX = cx;
      const knobY = rect.y - knobDist;

      // Check distance to knob center
      const dist = Math.sqrt(Math.pow(rotatedX - knobX, 2) + Math.pow(rotatedY - knobY, 2));
      if (dist <= 8) { // 6px radius + padding
        setSelectedLayerId(id);
        setIsRotating(true);
        setDragStart({ x: canvasX, y: canvasY }); // Store original mouse pos
        setStartDimensions({
          rotation: textElement ? (textElement.rotation || 0) : 0,
          centerX: cx,
          centerY: cy
        });
        return true;
      }

      const cornerHandles = [
        { x: rect.x, y: rect.y, name: 'nw' },
        { x: rect.x + rect.width, y: rect.y, name: 'ne' },
        { x: rect.x, y: rect.y + rect.height, name: 'sw' },
        { x: rect.x + rect.width, y: rect.y + rect.height, name: 'se' },
      ];

      const middleHandles = showMiddleHandles ? [
        { x: rect.x + rect.width / 2, y: rect.y, name: 'n' },
        { x: rect.x + rect.width / 2, y: rect.y + rect.height, name: 's' },
        { x: rect.x, y: rect.y + rect.height / 2, name: 'w' },
        { x: rect.x + rect.width, y: rect.y + rect.height / 2, name: 'e' }
      ] : [];

      const handles = [...cornerHandles, ...middleHandles];

      for (const h of handles) {
        if (rotatedX >= h.x - handleSize && rotatedX <= h.x + handleSize &&
          rotatedY >= h.y - handleSize && rotatedY <= h.y + handleSize) {
          setSelectedLayerId(id);
          setIsResizing(true);
          setResizeHandle(h.name);
          setDragStart({ x: canvasX, y: canvasY }); // Use original mouse pos for drag delta
          setStartDimensions({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            size: textElement ? textElement.size : 0, // Capture size if text
            rotation: rotation // Store rotation for resize logic if needed
          });
          return true;
        }
      }
      return false;
    };

    // Check layers in order (top to bottom) - reverse the ordered layers array
    // since orderedLayers is bottom-to-top for rendering, we check top-to-bottom for hit testing
    const orderedLayers = getOrderedLayers(currentView);
    const layersToCheck = [...orderedLayers].reverse(); // Top layer first

    for (const layerId of layersToCheck) {
      if (layerId === 'text' && textElement) {
        // Recalculate height for hit testing
        ctx.font = `${textElement.size}px ${textElement.font}`;
        const lines = wrapText(ctx, textElement.text, 0, 0, textElement.width, textElement.size);
        const h = textElement.height;
        const rect = { x: textElement.x, y: textElement.y, width: textElement.width, height: h };

        // If text is selected, check handles FIRST before checking box bounds
        if (selectedLayerId === 'text') {
          if (checkHandles(rect, 'text', textElement.rotation || 0, true)) {
            return; // Clicked on a handle, start resizing/rotating
          }
        }

        // Only check box bounds if not on a handle
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const rad = (-(textElement.rotation || 0) * Math.PI) / 180;
        const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
        const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

        if (rotatedX >= rect.x && rotatedX <= rect.x + rect.width && rotatedY >= rect.y && rotatedY <= rect.y + rect.height) {
          setSelectedLayerId('text');
          setIsDragging(true);
          setDragStart({ x: canvasX, y: canvasY });
          setStartDimensions({
            x: textElement.x,
            y: textElement.y,
            width: textElement.width,
            height: h,
            size: textElement.size,
            rotation: textElement.rotation || 0
          });
          return;
        }
      } else if (layerId.startsWith('sprite-')) {
        const idx = parseInt(layerId.split('-')[1]);
        const s = sprites[idx];
        if (!s) continue;

        const rect = { x: s.x, y: s.y, width: s.width || s.size, height: s.height || s.size };

        // If sprite is selected, check handles FIRST
        if (selectedLayerId === `sprite-${idx}`) {
          if (checkHandles(rect, `sprite-${idx}`, s.rotation || 0, false)) {
            return; // Clicked on a handle, start resizing/rotating
          }
        }

        // Only check box bounds if not on a handle
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const rad = (-(s.rotation || 0) * Math.PI) / 180;
        const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
        const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

        if (rotatedX >= rect.x && rotatedX <= rect.x + rect.width && rotatedY >= rect.y && rotatedY <= rect.y + rect.height) {
          setSelectedLayerId(`sprite-${idx}`);
          setIsDragging(true);
          setDragStart({ x: canvasX, y: canvasY });
          setStartDimensions({ x: s.x, y: s.y, width: rect.width, height: rect.height, rotation: s.rotation || 0 });
          return;
        }
      } else if (layerId === 'design' && currentDesign) {
        const rect = { x: currentDesign.x, y: currentDesign.y, width: currentDesign.width, height: currentDesign.height };

        // If design is selected, check handles FIRST
        if (selectedLayerId === 'design') {
          if (checkHandles(rect, 'design', currentDesign.rotation || 0, false)) {
            return; // Clicked on a handle, start resizing/rotating
          }
        }

        // Only check box bounds if not on a handle
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const rad = (-(currentDesign.rotation || 0) * Math.PI) / 180;
        const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
        const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

        if (rotatedX >= rect.x && rotatedX <= rect.x + rect.width && rotatedY >= rect.y && rotatedY <= rect.y + rect.height) {
          setSelectedLayerId('design');
          setIsDragging(true);
          setDragStart({ x: canvasX, y: canvasY });
          setStartDimensions({ x: currentDesign.x, y: currentDesign.y, width: currentDesign.width, height: currentDesign.height, rotation: currentDesign.rotation || 0 });
          return;
        }
      }
    }

    setSelectedLayerId(null);
  };

  const handleMouseMove = ({ canvasX, canvasY }) => {
    if (!selectedLayerId) return;
    if (!isDragging && !isResizing && !isRotating) return;

    if (isDragging) {
      const dx = canvasX - dragStart.x;
      const dy = canvasY - dragStart.y;

      const canvas = canvasRef.current;
      const printArea = PRINT_AREA_CONFIG[currentView];
      const bounds = {
        minX: canvas.width * printArea.x,
        maxX: canvas.width * (printArea.x + printArea.width),
        minY: canvas.height * printArea.y,
        maxY: canvas.height * (printArea.y + printArea.height)
      };

      let newX = startDimensions.x + dx;
      let newY = startDimensions.y + dy;
      const w = startDimensions.width;
      const h = startDimensions.height;

      // Boundary Constraint
      newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX - w));
      newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY - h));

      updateLayer(selectedLayerId, { x: newX, y: newY });
    } else if (isResizing) {
      let dx = canvasX - dragStart.x;
      let dy = canvasY - dragStart.y;

      // If text and rotated, rotate delta into local space
      if (selectedLayerId === 'text' && startDimensions.rotation) {
        const rad = (-startDimensions.rotation * Math.PI) / 180;
        // Rotate vector (dx, dy)
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        dx = localDx;
        dy = localDy;
      }

      const canvas = canvasRef.current;
      const printArea = PRINT_AREA_CONFIG[currentView];
      const bounds = {
        minX: canvas.width * printArea.x,
        maxX: canvas.width * (printArea.x + printArea.width),
        minY: canvas.height * printArea.y,
        maxY: canvas.height * (printArea.y + printArea.height)
      };

      const updates = {};
      const { x, y, width, height, size } = startDimensions;
      let newX = x;
      let newY = y;
      let newW = width;
      let newH = height;

      // Calculate new dimensions based on handle
      if (resizeHandle.includes('e')) newW = Math.max(50, width + dx);
      if (resizeHandle.includes('s')) newH = Math.max(20, height + dy);
      if (resizeHandle.includes('w')) {
        newW = Math.max(50, width - dx);
        newX = x + dx;
      }
      if (resizeHandle.includes('n')) {
        newH = Math.max(20, height - dy);
        newY = y + dy;
      }

      // Aspect Ratio for Images/Sprites (only on corners)
      const isCorner = ['ne', 'nw', 'se', 'sw'].includes(resizeHandle);
      if (selectedLayerId !== 'text' && isCorner) {
        const aspectRatio = startDimensions.width / startDimensions.height;
        // Use width to determine height to keep it simple
        if (resizeHandle.includes('w') || resizeHandle.includes('e')) {
          newH = newW / aspectRatio;
          if (resizeHandle.includes('n')) {
            newY = startDimensions.y + startDimensions.height - newH;
          }
        } else {
          // If resizing by height (shouldn't happen with corners, but just in case)
          newW = newH * aspectRatio;
          if (resizeHandle.includes('w')) {
            newX = startDimensions.x + startDimensions.width - newW;
          }
        }
      }

      // Minimum size constraint
      if (newW < 20) {
        const diff = 20 - newW;
        newW = 20;
        if (resizeHandle.includes('w')) newX -= diff;
      }
      if (newH < 20) {
        const diff = 20 - newH;
        newH = 20;
        if (resizeHandle.includes('n')) newY -= diff;
      }

      // Boundary Constraint for Resize
      // For images/sprites with corner handles, maintain aspect ratio while constraining
      if (selectedLayerId !== 'text' && isCorner) {
        const aspectRatio = startDimensions.width / startDimensions.height;

        // Constrain to bounds while maintaining aspect ratio
        // The key is to respect which handle is being used
        if (newX < bounds.minX) {
          if (resizeHandle.includes('w')) {
            // Resizing from left - clamp X and recalculate from right edge
            newX = bounds.minX;
            newW = startDimensions.x + startDimensions.width - newX;
            newH = newW / aspectRatio;
            if (resizeHandle.includes('n')) {
              newY = startDimensions.y + startDimensions.height - newH;
            } else {
              newY = startDimensions.y;
            }
          } else {
            // Resizing from right - just constrain width
            newW = bounds.maxX - bounds.minX;
            newH = newW / aspectRatio;
            newX = bounds.minX;
            if (resizeHandle.includes('n')) {
              newY = startDimensions.y + startDimensions.height - newH;
            }
          }
        }

        if (newX + newW > bounds.maxX) {
          if (resizeHandle.includes('e')) {
            // Resizing from right - clamp width
            newW = bounds.maxX - newX;
            newH = newW / aspectRatio;
            if (resizeHandle.includes('n')) {
              newY = startDimensions.y + startDimensions.height - newH;
            }
          } else {
            // Resizing from left - clamp position
            newX = bounds.maxX - newW;
            if (newX < bounds.minX) {
              newX = bounds.minX;
              newW = bounds.maxX - newX;
              newH = newW / aspectRatio;
              if (resizeHandle.includes('n')) {
                newY = startDimensions.y + startDimensions.height - newH;
              }
            }
          }
        }

        if (newY < bounds.minY) {
          if (resizeHandle.includes('n')) {
            // Resizing from top - clamp Y and recalculate from bottom edge
            newY = bounds.minY;
            newH = startDimensions.y + startDimensions.height - newY;
            newW = newH * aspectRatio;
            if (resizeHandle.includes('w')) {
              newX = startDimensions.x + startDimensions.width - newW;
            } else {
              newX = startDimensions.x;
            }
          } else {
            // Resizing from bottom - just constrain height
            newH = bounds.maxY - bounds.minY;
            newW = newH * aspectRatio;
            newY = bounds.minY;
            if (resizeHandle.includes('w')) {
              newX = startDimensions.x + startDimensions.width - newW;
            }
          }
        }

        if (newY + newH > bounds.maxY) {
          if (resizeHandle.includes('s')) {
            // Resizing from bottom - clamp height
            newH = bounds.maxY - newY;
            newW = newH * aspectRatio;
            if (resizeHandle.includes('w')) {
              newX = startDimensions.x + startDimensions.width - newW;
            }
          } else {
            // Resizing from top - clamp position
            newY = bounds.maxY - newH;
            if (newY < bounds.minY) {
              newY = bounds.minY;
              newH = bounds.maxY - newY;
              newW = newH * aspectRatio;
              if (resizeHandle.includes('w')) {
                newX = startDimensions.x + startDimensions.width - newW;
              }
            }
          }
        }
      } else {
        // For text or non-corner handles, apply simple boundary constraints
        // 1. Check Left/Top edges
        if (newX < bounds.minX) {
          const diff = bounds.minX - newX;
          newX = bounds.minX;
          newW -= diff;
        }
        if (newY < bounds.minY) {
          const diff = bounds.minY - newY;
          newY = bounds.minY;
          newH -= diff;
        }
        // 2. Check Right/Bottom edges
        if (newX + newW > bounds.maxX) {
          newW = bounds.maxX - newX;
        }
        if (newY + newH > bounds.maxY) {
          newH = bounds.maxY - newY;
        }
      }

      // Special handling for Text
      if (selectedLayerId === 'text') {
        const currentText = textElements[currentView];
        const newFontSize = calculateBestFitFontSize(ctx, currentText.text, newW, newH, currentText.font, currentText.bold, currentText.italic);

        updateLayer('text', {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          size: newFontSize
        });
      } else if (selectedLayerId.startsWith('sprite-')) {
        // For sprites, update size property to match the new dimensions (use width as size)
        const newSize = Math.max(newW, newH); // Use the larger dimension to maintain visibility
        updateLayer(selectedLayerId, { x: newX, y: newY, width: newW, height: newH, size: newSize });
      } else {
        // For design images
        updateLayer(selectedLayerId, { x: newX, y: newY, width: newW, height: newH });
      }
    } else if (isRotating && selectedLayerId) {
      // Calculate angle from center to mouse
      const cx = startDimensions.centerX;
      const cy = startDimensions.centerY;

      // Angle of mouse relative to center
      const angle = Math.atan2(canvasY - cy, canvasX - cx) * (180 / Math.PI);

      // Angle of knob relative to center (starts at -90 degrees / top)
      let rotation = angle + 90;

      updateLayer(selectedLayerId, { rotation });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleDoubleClick = ({ canvasX, canvasY }) => {
    // Check if double-click is on text element
    if (textElement) {
      const x = textElement.x;
      const y = textElement.y;
      const w = textElement.width;
      const h = textElement.height;

      // Check if click is within text bounds
      if (canvasX >= x && canvasX <= x + w && canvasY >= y && canvasY <= y + h) {
        // Select the text layer and switch to layers tab
        setSelectedLayerId('text');
        setActiveTab('layers');

        // Trigger focus on text input in sidebar
        setShouldFocusText(true);

        // If it's the default placeholder text, clear it for editing
        if (textElement.text === 'Double Click to Edit') {
          updateLayer('text', { text: '' });
        }

        // Prevent any other handlers from processing this event
        return;
      }
    }
  };

  // Get current preview image URL
  const canvasImageUrl = cachedViewImages && cachedViewImages[currentView] ? cachedViewImages[currentView] : null;

  const handleBack = () => {
    setShowPreviewOptions(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#1e1e1e] text-white overflow-hidden z-50">
      {showPreviewOptions && !showMockupCarousel ? (
        // Preview Options View
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Preview */}
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-2xl font-bold text-white mb-4">Design Preview</h2>
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
                    {['front', 'back', 'leftSleeve', 'rightSleeve', 'neckLabel'].map(view => (
                      <button
                        key={view}
                        onClick={() => setCurrentView(view)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          currentView === view ? 'border-purple-500 bg-purple-500/10 shadow-lg' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img 
                          src={view === 'front' ? tFrontImg : view === 'back' ? tBackImg : view.includes('Sleeve') ? tSleeveImg : tNeckLabelImg} 
                          alt={view} 
                          className="w-full h-20 object-contain rounded mb-2" 
                        />
                        <span className="text-xs text-white/80 capitalize">{view.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </button>
                    ))}
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                      <textarea
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Describe your product..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative z-40">
                  <h3 className="text-lg font-bold text-white mb-2">Available Colors</h3>
                  <p className="text-white/60 text-sm mb-4">
                    Search and select colors ({printifyColors.length} available)
                  </p>
                  
                  {availableColors.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <div 
                          key={color}
                          className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg bg-purple-500/20 border-purple-500/30"
                        >
                          <span className="text-white text-sm">{color}</span>
                          <button
                            onClick={() => setAvailableColors(availableColors.filter(c => c !== color))}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
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
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    
                    {showColorDropdown && colorSearchTerm && printifyColors.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden max-h-64 overflow-y-auto shadow-2xl">
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
                              className="w-full px-4 py-3 text-left text-white hover:bg-purple-500/20 transition-colors border-b border-white/5 last:border-b-0"
                            >
                              {color}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Available Sizes</h3>
                  <p className="text-white/60 text-sm mb-4">Select which sizes customers can choose from</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {sizes.map(size => (
                      <label key={size} className="flex items-center gap-2 glass-card px-4 py-3 rounded-lg cursor-pointer hover:shadow-lg transition-all">
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
                          className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                        />
                        <span className="text-white/80">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handlePublish} 
                    disabled={isGenerating}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Launching...
                      </>
                    ) : (
                      <>🚀 Launch Product</>
                    )}
                  </button>
                  <button 
                    onClick={handleBack} 
                    className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl"
                  >
                    Back to Design
                  </button>
                </div>

                {error && (
                  <div className="glass-card p-4 rounded-lg bg-red-500/20 border-red-500/30 relative">
                    <button
                      onClick={() => setError('')}
                      className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-red-300 hover:text-red-200"
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
      ) : showMockupCarousel ? (
        // Mockup Carousel View
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto p-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Preview Your Product</h2>
                  <p className="text-white/60">Review the mockups and approve to publish to your Shopify store</p>
                </div>
                <button
                  onClick={handleRejectMockups}
                  className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center">
                <p className="text-white/80">
                  Image {currentMockupIndex + 1} of {mockupImages.length}
                </p>
              </div>

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

                {mockupImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.max(0, currentMockupIndex - 1))}
                      disabled={currentMockupIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.min(mockupImages.length - 1, currentMockupIndex + 1))}
                      disabled={currentMockupIndex === mockupImages.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {mockupImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {mockupImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMockupIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                        currentMockupIndex === idx
                          ? 'ring-2 ring-purple-500 shadow-lg'
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

              <div className="flex gap-4">
                <button
                  onClick={handleRejectMockups}
                  className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveMockups}
                  disabled={isGenerating}
                  className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Publishing...
                    </>
                  ) : (
                    <>✅ Approve & Publish to Shopify</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Main Editor View
        <>
          <TopBar
            zoom={zoom} setZoom={setZoom}
            onSave={handleNext} onCancel={onCancel}
            currentStep="design"
            onUndo={handleUndo} onRedo={handleRedo}
            canUndo={undoStack.length > 0} canRedo={redoStack.length > 0}
            isGenerating={isGenerating}
          />

          <div className="flex flex-1 overflow-hidden">
            <LeftSidebar
              activeTab={activeTab} setActiveTab={setActiveTab}
              layers={layers} selectedLayer={selectedLayerId} setSelectedLayer={setSelectedLayerId}
              onReorderLayers={handleReorderLayers}
              uploadedImages={uploadedImages} onUploadImage={handleImageUpload}
              removeUploadedImage={(idx) => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
              onAddText={handleAddText}
              onAddSprite={handleAddSprite}
              onExtractSprite={() => { }}
              isGenerating={isGenerating}
              prompt={prompt} setPrompt={setPrompt}
              onGenerateAI={handleGenerateDesign}
              // AI Options
              textInGenPrompt={textInGenPrompt} setTextInGenPrompt={setTextInGenPrompt}
              textStyleOption={textStyleOption} setTextStyleOption={setTextStyleOption}
              customTextStyle={customTextStyle} setCustomTextStyle={setCustomTextStyle}
              imageStyle={imageStyle} setImageStyle={setImageStyle}
              customImageStyle={customImageStyle} setCustomImageStyle={setCustomImageStyle}
              colorTreatment={colorTreatment} setColorTreatment={setColorTreatment}
              customPaletteColors={customPaletteColors} setCustomPaletteColors={setCustomPaletteColors}
              effectFilter={effectFilter} setEffectFilter={setEffectFilter}
              moodVibe={moodVibe} setMoodVibe={setMoodVibe}
              removeBackground={removeBackground} setRemoveBackground={setRemoveBackground}
            />

            <CanvasArea
              zoom={zoom} pan={pan} setPan={setPan} setZoom={setZoom}
              canvasRef={canvasRef} previewCanvasRef={previewCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              showGrid={showGrid}
            />

            <RightSidebar
              selectedLayerId={selectedLayerId}
              layers={layers}
              updateLayer={updateLayer}
              currentView={currentView}
              setCurrentView={setCurrentView}
              canvasSettings={{ zoom, pan, showGrid }}
              setCanvasSettings={(s) => {
                if (s.zoom) setZoom(s.zoom);
                if (s.pan) setPan(s.pan);
                if (s.showGrid !== undefined) setShowGrid(s.showGrid);
              }}
              shouldFocusText={shouldFocusText}
              setShouldFocusText={setShouldFocusText}
              onReorderLayers={handleReorderLayers}
              orderedLayers={getOrderedLayers(currentView)}
            />
          </div>
        </>
      )}
    </div>
  );
}