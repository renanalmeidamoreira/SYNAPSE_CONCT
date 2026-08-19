import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }
  
  return fullText;
}

export function parseGabarito(text: string): Record<number, number> {
  // Simple regex to find patterns like "1 - A", "1. A", "1:A"
  const answers: Record<number, number> = {};
  const letterToIndex: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
  
  const matches = text.matchAll(/(\d+)\s*[-.:]?\s*([A-E])/gi);
  for (const match of matches) {
    const qNum = parseInt(match[1]);
    const letter = match[2].toUpperCase();
    answers[qNum] = letterToIndex[letter];
  }
  return answers;
}
