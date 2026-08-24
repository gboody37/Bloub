'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface NoteGraphProps {
  userId?: string;
  isDark?: boolean;
  onNodeClick?: (node: any) => void;
}

export default function NoteGraph({ userId, isDark = true, onNodeClick }: NoteGraphProps) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        const res = await fetch(`/api/obsidian/graph?${params.toString()}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setGraphData(data.graph);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchGraph();
  }, [userId]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      updateDimensions();
    }
    
    const timeoutId = setTimeout(updateDimensions, 500); // Fallback for CSS animations

    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (onNodeClick && !node.isGhost) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center min-h-[300px]"><Loader2 className="animate-spin text-purple-500" size={32} /></div>;
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center min-h-[300px] text-red-500 text-sm font-semibold">{error}</div>;
  }

  return (
    <div ref={containerRef} className="flex-1 w-full h-full min-h-[400px] relative rounded-2xl overflow-hidden border border-purple-500/20 shadow-inner bg-slate-950">
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={(node: any) => node.isGhost ? '#64748b' : '#a855f7'}
          linkColor={() => isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.4)'}
          nodeVal={(node: any) => node.val}
          onNodeClick={handleNodeClick}
          backgroundColor={isDark ? '#020617' : '#f8fafc'} // slate-950 or slate-50
          linkWidth={1}
          cooldownTicks={100}
        />
      )}
      
      {/* Legend / Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] font-semibold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-slate-300">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500" /> Vault Note</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-500" /> Missing Link</div>
      </div>
    </div>
  );
}
