import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// pdfjs-dist requires a worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string | File;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        let loadingTask;
        if (typeof url === 'string') {
          loadingTask = pdfjsLib.getDocument({ url: url });
        } else {
          const buffer = await url.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        }
        const doc = await loadingTask.promise;
        if (active) setPdf(doc);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [url]);

  useEffect(() => {
    if (pdf && canvasRef.current) {
      pdf.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        page.render({
          canvasContext: context,
          viewport: viewport
        });
      });
    }
  }, [pdf, pageNum]);

  return (
    <div className="flex flex-col items-center overflow-auto h-full p-4 bg-slate-900">
      {pdf && (
        <div className="flex items-center gap-4 mb-4 text-slate-800 dark:text-white">
          <button onClick={() => setPageNum(p => Math.max(1, p - 1))} className="px-3 py-1 bg-slate-800 rounded">Anterior</button>
          <span>Página {pageNum} de {pdf.numPages}</span>
          <button onClick={() => setPageNum(p => Math.min(pdf.numPages, p + 1))} className="px-3 py-1 bg-slate-800 rounded">Próxima</button>
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full shadow-lg" />
    </div>
  );
};
