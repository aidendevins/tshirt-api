import React, { useRef, useEffect, useState } from 'react';

export default function CanvasArea({
  zoom, pan, setPan, setZoom,
  canvasRef, previewCanvasRef,
  onMouseDown, onMouseMove, onMouseUp, onDoubleClick,
  tshirtImage, showGrid = true,
  width = 660, height = 660,
  children
}) {
  const containerRef = useRef(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Handle spacebar for panning mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Wheel (Zoom/Pan) - Non-passive listener to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleAmount = 0.1;
        const newZoom = delta > 0 ? zoom + scaleAmount : zoom - scaleAmount;
        setZoom(Math.max(0.1, Math.min(5, newZoom)));
      } else {
        // Pan
        e.preventDefault();
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoom, setZoom, setPan]);

  const handleContainerMouseDown = (e) => {
    // If space is pressed, start panning
    if (isSpacePressed) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Otherwise pass to canvas handler with normalized coords
    // We need to calculate the mouse position RELATIVE TO THE CANVAS ELEMENT
    // which is transformed.
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    onMouseDown({ clientX: e.clientX, clientY: e.clientY, canvasX: x, canvasY: y });
  };

  const handleContainerMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      onMouseMove({ clientX: e.clientX, clientY: e.clientY, canvasX: x, canvasY: y });
    }
  };

  const handleContainerMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    onMouseUp(e);
  };

  const handleContainerDoubleClick = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      onDoubleClick({ clientX: e.clientX, clientY: e.clientY, canvasX: x, canvasY: y });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-[#1e1e1e] relative overflow-hidden ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={handleContainerMouseUp}
      onDoubleClick={handleContainerDoubleClick}
    >
      {/* Grid Background */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)'
          }}
        />
      )}

      {/* Canvas Container with Transform */}
      <div
        className="absolute transform-gpu origin-top-left shadow-2xl"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: width,
          height: height,
          left: '50%', // Center initially
          top: '50%',
          marginLeft: -width / 2,
          marginTop: -height / 2
        }}
      >
        {/* White background for the print area/canvas */}
        <div className="absolute inset-0 bg-white" />

        {/* The actual canvas elements */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full"
        />
        {/* Preview/Overlay canvas if needed */}
        <canvas
          ref={previewCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Children (Guides, Handles overlay) */}
        {children}
      </div>

      {/* UI Overlay (Zoom controls if not in top bar, etc) */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        {/* ... */}
      </div>
    </div>
  );
}

