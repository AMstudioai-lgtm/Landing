'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Mouse } from 'lucide-react';

const TOTAL_FRAMES = 240;

function getFrameUrl(index: number): string {
  const frameNumber = String(index + 1).padStart(3, '0');
  return `/asset/images/ezgif-frame-${frameNumber}.jpg`;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Draw frame on canvas with aspect ratio handling (background cover)
  const drawImageToCanvas = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Resize canvas to match display pixel ratio
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    drawImageToCanvas(currentFrameRef.current);
  }, [drawImageToCanvas]);

  // Preload all frame images
  useEffect(() => {
    let isMounted = true;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let loaded = 0;

    // Define helper to mark progress and check readiness
    const handleImageLoad = () => {
      if (!isMounted) return;
      loaded++;
      setLoadedCount(loaded);

      // Draw the first frame as soon as it's ready
      if (loaded === 1) {
        // Safe timeout to let canvas render and resize
        setTimeout(() => {
          if (isMounted) drawImageToCanvas(0);
        }, 50);
      }

      // Mark application ready as soon as first 10 frames are loaded
      if (loaded >= Math.min(10, TOTAL_FRAMES)) {
        setIsReady(true);
      }
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      // CRITICAL: Always set onload and onerror BEFORE setting src to avoid cache race conditions
      img.onload = handleImageLoad;
      img.onerror = handleImageLoad;
      img.src = getFrameUrl(i);
      images[i] = img;
    }

    imagesRef.current = images;

    return () => {
      isMounted = false;
    };
  }, [drawImageToCanvas]);

  // Handle window resizing and initial mount layout
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Redraw when ready state changes to ensure the initial frame is drawn
  useEffect(() => {
    if (isReady) {
      handleResize();
    }
  }, [isReady, handleResize]);

  // Handle smooth scroll listening
  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const scrollableHeight = container.offsetHeight - window.innerHeight;

      if (scrollableHeight <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(1, Math.max(0, currentScroll / scrollableHeight));

      setScrollProgress(progress);

      const targetFrame = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(progress * (TOTAL_FRAMES - 1)))
      );

      if (targetFrame !== currentFrameRef.current) {
        currentFrameRef.current = targetFrame;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          drawImageToCanvas(targetFrame);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [drawImageToCanvas]);

  const isIndicatorVisible = scrollProgress < 0.04;

  return (
    <main
      id="scroll-hero-section"
      ref={containerRef}
      className="relative w-full bg-neutral-950 text-white"
      style={{ height: '450vh' }}
    >
      {/* Sticky container pinned to viewport */}
      <div
        id="sticky-canvas-wrapper"
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-black"
      >
        {/* Loading overlay while first frames are buffering */}
        {!isReady && (
          <div
            id="loading-indicator"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 gap-3"
          >
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
            <p className="text-xs uppercase tracking-widest text-neutral-400">
              Chargement ({Math.round((loadedCount / TOTAL_FRAMES) * 100)}%)
            </p>
          </div>
        )}

        {/* HTML5 Animation Canvas */}
        <canvas
          id="apple-scroll-canvas"
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Indicator "scroller a l’infini" at the bottom */}
        <div
          id="scroll-indicator"
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none transition-all duration-700 ${
            isIndicatorVisible
              ? 'opacity-90 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/80 border border-neutral-700/60 shadow-lg backdrop-blur-md">
            <Mouse className="w-4 h-4 text-neutral-300 animate-pulse" />
            <span className="text-xs font-medium tracking-wider uppercase text-neutral-200">
              scroller a l’infini
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 animate-bounce" />
          </div>
        </div>
      </div>
    </main>
  );
}
