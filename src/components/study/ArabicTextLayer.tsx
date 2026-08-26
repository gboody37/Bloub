'use client';

import React, { useMemo, useEffect, useState } from 'react';
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

export function ArabicTextLayer({
  pageNumber = 1,
  viewport,
  textContent,
  scale = 1.0,
  page,
  onTextExtracted,
  className
}: ArabicTextLayerProps) {
  const [asyncLines, setAsyncLines] = useState<ProcessedTextLine[]>([]);

  // Synchronous line extraction when textContent and viewport are directly available
  const syncLines = useMemo(() => {
    if (textContent && viewport) {
      return processPageTextContent(textContent, viewport);
    }
    if (textContent) {
      return processPageTextContent(textContent, { scale: scale || 1.0, height: 800 });
    }
    return null;
  }, [textContent, viewport, scale]);

  // Asynchronous fallback extraction when PDFPageProxy (page) is passed without textContent
  useEffect(() => {
    if (!syncLines && page) {
      const vp = viewport || (typeof page.getViewport === 'function' ? page.getViewport({ scale: scale || 1.0 }) : null);
      if (typeof page.getTextContent === 'function') {
        page.getTextContent().then((tc: any) => {
          const lines = processPageTextContent(tc, vp);
          setAsyncLines(lines);
          onTextExtracted?.(lines);
        }).catch((err: any) => {
          console.error('Failed to extract text content in ArabicTextLayer:', err);
        });
      }
    }
  }, [syncLines, page, viewport, scale, onTextExtracted]);

  // Trigger onTextExtracted callback when synchronous lines change
  useEffect(() => {
    if (syncLines) {
      onTextExtracted?.(syncLines);
    }
  }, [syncLines, onTextExtracted]);

  const activeLines = syncLines || asyncLines;

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
}

export default ArabicTextLayer;
