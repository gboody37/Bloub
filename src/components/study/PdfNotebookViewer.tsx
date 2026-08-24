'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, Maximize, Minimize } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfNotebookViewerProps {
  pdfUrl: string;
  noteId: string;
  initialNotesStr?: string;
  isDark?: boolean;
}

export default function PdfNotebookViewer({ pdfUrl, noteId, initialNotesStr, isDark = true }: PdfNotebookViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [notes, setNotes] = useState<Record<number, { text: string, lang: 'en' | 'ar' }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfTool, setPdfTool] = useState('cursor');
  const [isFitWidth, setIsFitWidth] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (initialNotesStr) {
      try {
        setNotes(JSON.parse(initialNotesStr));
      } catch (e) {
        console.error("Failed to parse initial pdf notes", e);
      }
    }
  }, [initialNotesStr]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // We fetch the latest frontmatter to not overwrite other things
      const { data: currentNote } = await supabase.from('vault_notes').select('content').eq('id', noteId).single();
      if (!currentNote) return;

            let content = currentNote.content;
      // Replace or inject pdf_notes in frontmatter
      const notesJson = JSON.stringify(notes).replace(/'/g, "''"); // SQL/YAML safe single quote escape
      
      if (content.includes('pdf_notes:')) {
        content = content.replace(/pdf_notes:\s*'.*?'/g, `pdf_notes: '${notesJson}'`);
      } else if (content.startsWith('---')) {
        content = content.replace(/^---\r?\n/, `---\npdf_notes: '${notesJson}'\n`);
      } else {
        content = `---\npdf_notes: '${notesJson}'\n---\n\n` + content;
      }

      await supabase.from('vault_notes').update({ content }).eq('id', noteId);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to save notebook');
    } finally {
      setIsSaving(false);
    }
  };

  const currentNote = notes[pageNumber] || { text: '', lang: 'en' };

  return (
    <div className={`flex w-full h-[650px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
       
       {/* PDF Viewer Side */}
       <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-6 relative bg-black/20">
                  {/* PDF Toolbar */}
         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">
           <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}><MousePointer2 size={16}/></button>
           <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}><Highlighter size={16}/></button>
           <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`}><Type size={16}/></button>
           <div className="w-px h-4 bg-slate-700 mx-1"></div>
           <button onClick={() => setIsFitWidth(!isFitWidth)} className={`p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white`}>
             {isFitWidth ? <Minimize size={16}/> : <Maximize size={16}/>}
           </button>
         </div>

         <Document 
            file={pdfUrl} 
            onLoadSuccess={onDocumentLoadSuccess} 
            loading={<div className="text-slate-400 font-mono text-sm animate-pulse flex h-full items-center">Loading Document...</div>}
            className="drop-shadow-2xl"
         >
           <Page 
             pageNumber={pageNumber} 
             renderTextLayer={true} 
             renderAnnotationLayer={true} 
             width={isFitWidth ? undefined : 450} scale={isFitWidth ? 1.5 : 1.0} 
             className={`rounded-lg overflow-hidden transition-all duration-500 ${isFitWidth ? "w-full shadow-2xl" : ""}`}
           />
         </Document>
         
         {numPages && (
           <div className="sticky bottom-6 mt-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">
               <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft size={20}/></button>
               
               <div className="flex items-center gap-2 text-white text-xs tracking-widest font-bold uppercase">
                 <span>Page</span>
                 <input 
                   type="number" 
                   min={1} 
                   max={numPages || 1} 
                   value={pageNumber} 
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     if (!isNaN(val)) setPageNumber(Math.min(Math.max(1, val), numPages || 1));
                   }}
                   className="w-12 text-center bg-slate-800/50 border border-slate-600 rounded py-0.5 outline-none focus:border-purple-400 focus:bg-slate-800 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                 />
                 <span>/ {numPages}</span>
               </div>

               <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= (numPages||1)} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={20}/></button>
             </div>
         )}
       </div>

       {/* Handwriting Notebook Side */}
       <div className={`w-[450px] h-full border-l flex flex-col ${isDark ? 'border-slate-800 bg-[#12141c]' : 'border-gray-200 bg-[#fffdf5]'}`}>
         
         <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400">
             <PenTool size={14}/> Pg. {pageNumber} Notes
           </div>
           
           <div className="flex items-center gap-3">
             <select 
               value={currentNote.lang} 
               onChange={e => setNotes(n => ({...n, [pageNumber]: {...currentNote, lang: e.target.value as 'en'|'ar'}}))}
               className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
             >
               <option value="en">English (Caveat)</option>
               <option value="ar">عربي (Lemonada)</option>
             </select>

             <button
               onClick={handleSave}
               disabled={isSaving}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${saved ? 'bg-green-500/20 text-green-400' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
             >
               {saved ? <Check size={14}/> : <Save size={14}/>}
               {saved ? 'Saved' : 'Save'}
             </button>
           </div>
         </div>

         <textarea 
           value={currentNote.text}
           onChange={e => setNotes(n => ({...n, [pageNumber]: {...currentNote, text: e.target.value}}))}
           placeholder="Write your notes here..."
           dir={currentNote.lang === 'ar' ? 'rtl' : 'ltr'}
           className={`flex-1 w-full p-8 bg-transparent outline-none resize-none leading-[32px] ${
             currentNote.lang === 'ar' 
               ? 'font-[family-name:var(--font-lemonada)] text-right text-[1.1rem]' 
               : 'font-[family-name:var(--font-caveat)] text-left text-2xl tracking-wide'
           } ${isDark ? 'text-amber-100/90 placeholder:text-amber-100/20' : 'text-slate-800 placeholder:text-slate-300'}`}
           style={{
             backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'} 31px, ${isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'} 32px)`,
             backgroundAttachment: 'local'
           }}
         />
       </div>
    </div>
  )
}
