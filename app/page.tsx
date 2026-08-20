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

  // Draw target frame onto canvas with smooth cover aspect ratio
  const drawImageToCanvas = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    let img: HTMLImageElement | undefined = imagesRef.current[frameIndex];

    // Fallback to nearest loaded image if target frame is buffering
    if (!img || !img.complete || img.naturalWidth === 0) {
      img = imagesRef.current.find((i): i is HTMLImageElement => Boolean(i && i.complete && i.naturalWidth > 0));
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Resize canvas to match display pixel ratio
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    drawImageToCanvas(currentFrameRef.current);
  }, [drawImageToCanvas]);

  // Preload all 240 images in memory
  useEffect(() => {
    let isMounted = true;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let loaded = 0;

    const handleImageLoad = (index: number) => {
      if (!isMounted) return;
      loaded++;
      setLoadedCount(loaded);

      // Instantly render frame 0 or active frame
      if (index === 0 || index === currentFrameRef.current || loaded === 1) {
        requestAnimationFrame(() => {
          if (isMounted) drawImageToCanvas(currentFrameRef.current);
        });
      }

      if (loaded >= 5) {
        setIsReady(true);
      }
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.onload = () => handleImageLoad(i);
      img.onerror = () => handleImageLoad(i);
      img.src = getFrameUrl(i);
      images[i] = img;
    }

    imagesRef.current = images;

    return () => {
      isMounted = false;
    };
  }, [drawImageToCanvas]);

  // Handle window resizing
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Real-time instantaneous scroll synchronizer
  useEffect(() => {
    let animationFrameId: number;

    const onScroll = () => {
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

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onScroll);
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
      {/* Sticky Canvas Container */}
      <div
        id="sticky-canvas-wrapper"
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-black relative"
      >
        {/* Loading bar */}
        {!isReady && loadedCount < 5 && (
          <div
            id="loading-indicator"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 gap-6 px-10"
          >
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-medium">
              Chargement des images ({Math.round((loadedCount / TOTAL_FRAMES) * 100)}%)
            </p>
            <div className="w-full max-w-xs h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-900 transition-all duration-200 ease-out"
                style={{ width: `${Math.min(100, (loadedCount / TOTAL_FRAMES) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Real-time HTML5 Animation Canvas */}
        <canvas
          id="apple-scroll-canvas"
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover block z-10 pointer-events-none"
          style={{
            transform: 'translateZ(0)',
            imageRendering: 'auto',
          }}
        />

        {/* Scroll Indicator */}
        <div
          id="scroll-indicator"
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none transition-all duration-700 ${
            isIndicatorVisible
              ? 'opacity-90 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col items-center gap-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            <span className="text-[11px] font-extralight tracking-[0.35em] uppercase text-neutral-300 select-none scale-y-110 drop-shadow-md">
              scroller a l’infini
            </span>
            <ChevronDown className="w-4 h-4 text-neutral-400 animate-bounce stroke-[1.25]" />
          </div>
        </div>
      </div>
    </main>
  );
}
