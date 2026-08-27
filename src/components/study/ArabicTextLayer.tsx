'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { processPageTextContent, ProcessedTextLine } from '@/lib/pdf/arabic-bidi';

export interface ArabicTextLayerProps {
  pageNumber?: number;
  viewport?: any;
  textContent?: any;
  scale?: number;
  page?: any;
  onTextExtracted?: (lines: ProcessedTextLine[]) => void;
  className?: string;
}

export const ArabicTextLayer = React.memo(function ArabicTextLayer({
  pageNumber = 1,
  viewport,
  textContent,
  scale = 1.0,
  page,
  onTextExtracted,
  className
}: ArabicTextLayerProps) {
  const [normalizedAsyncLines, setNormalizedAsyncLines] = useState<ProcessedTextLine[] | null>(null);
  const onTextExtractedRef = useRef(onTextExtracted);
  onTextExtractedRef.current = onTextExtracted;

  // Base page unscaled dimensions
  const baseViewport = useMemo(() => {
    const currentScale = scale || 1.0;
    if (viewport?.height) {
      return {
        scale: 1.0,
        height: viewport.height / currentScale,
        width: viewport.width ? viewport.width / currentScale : 600
      };
    }
    return { scale: 1.0, height: 800, width: 600 };
  }, [viewport?.height, viewport?.width, scale]);

  // Synchronous line extraction cached strictly at unit scale (1.0)
  const normalizedSyncLines = useMemo(() => {
    if (textContent) {
      return processPageTextContent(textContent, baseViewport);
    }
    return null;
  }, [textContent, baseViewport]);

  // Asynchronous fallback extraction when PDFPageProxy (page) is passed without textContent
  useEffect(() => {
    if (!normalizedSyncLines && page) {
      const baseVp = typeof page.getViewport === 'function' 
        ? page.getViewport({ scale: 1.0 }) 
        : baseViewport;
      
      if (typeof page.getTextContent === 'function') {
        page.getTextContent().then((tc: any) => {
          const lines = processPageTextContent(tc, baseVp);
          setNormalizedAsyncLines(lines);
        }).catch((err: any) => {
          console.error('Failed to extract text content in ArabicTextLayer:', err);
        });
      }
    }
  }, [normalizedSyncLines, page, baseViewport]);

  // Scale-invariant linear projection: zero clustering recalculation on zoom
  const activeLines = useMemo(() => {
    const baseLines = normalizedSyncLines || normalizedAsyncLines;
    if (!baseLines) return [];
    const currentScale = scale || 1.0;
    if (currentScale === 1.0) return baseLines;

    return baseLines.map(line => ({
      ...line,
      left: Math.round(line.left * currentScale * 100) / 100,
      top: Math.round(line.top * currentScale * 100) / 100,
      width: Math.round(line.width * currentScale * 100) / 100,
      height: Math.round(line.height * currentScale * 100) / 100,
      items: line.items.map(item => ({
        ...item,
        left: Math.round(item.left * currentScale * 100) / 100,
        top: Math.round(item.top * currentScale * 100) / 100,
        width: Math.round(item.width * currentScale * 100) / 100,
        height: Math.round(item.height * currentScale * 100) / 100,
        fontSize: Math.round(item.fontSize * currentScale * 100) / 100,
      }))
    }));
  }, [normalizedSyncLines, normalizedAsyncLines, scale]);

  // Trigger onTextExtracted callback when activeLines change
  useEffect(() => {
    if (activeLines.length > 0) {
      onTextExtractedRef.current?.(activeLines);
    }
  }, [activeLines]);

  return (
    <div
      className={`arabic-text-layer react-pdf__Page__textContent ${className || ''}`}
      data-page-number={pageNumber}
      dir="ltr"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: viewport?.width ? `${viewport.width}px` : '100%',
        height: viewport?.height ? `${viewport.height}px` : '100%',
        overflow: 'hidden',
        pointerEvents: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        lineHeight: 1,
        zIndex: 10,
      }}
    >
      <style>{`
        .arabic-text-layer {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .arabic-text-layer::selection {
          background: transparent !important;
        }
        .arabic-text-layer span.arabic-text-line {
          color: transparent !important;
          cursor: text;
          user-select: text !important;
          -webkit-user-select: text !important;
          pointer-events: auto !important;
        }
        .arabic-text-layer span.arabic-text-line::selection {
          background: rgba(59, 130, 246, 0.35) !important;
          color: transparent !important;
        }
        /* Inject a newline pseudo-element to help the browser break the selection bounding box cleanly */
        .arabic-text-layer span.arabic-text-line::after {
          content: "\\A";
          white-space: pre;
          width: 0;
          height: 0;
          position: absolute;
        }
      `}</style>
      {activeLines.map((line, index) => {
        const fontSize = line.items[0]?.fontSize || line.height;
        return (
          <span
            key={`page-${pageNumber}-line-${index}`}
            className="arabic-text-line"
            dir={line.dir}
            data-dir={line.dir}
            data-line-index={index}
            data-page-number={pageNumber}
            style={{
              position: 'absolute',
              left: `${line.left}px`,
              top: `${line.top}px`,
              width: `${line.width}px`,
              height: `${line.height}px`,
              fontSize: `${fontSize}px`,
              lineHeight: 1,
              unicodeBidi: 'isolate',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              pointerEvents: 'auto',
              color: 'transparent',
              whiteSpace: 'pre',
              transformOrigin: '0 0',
              fontFamily: line.dir === 'rtl' ? 'var(--font-lemonada), sans-serif' : 'sans-serif',
            }}
          >
            {line.fullText}
          </span>
        );
      })}
    </div>
  );
});

export default ArabicTextLayer;
