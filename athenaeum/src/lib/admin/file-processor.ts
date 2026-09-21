import JSZip from 'jszip';
import TurndownService from 'turndown';

interface ChapterEdit {
  title: string;
  content: string;
  pages: number;
}

interface ParsedBook {
  title: string;
  author: string;
  year: number;
  genre: string;
  synopsis: string;
  tags: string[];
  chapters: ChapterEdit[];
  rawContent: string;
}

function createTurndown(): TurndownService {
  return new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
}

function sanitizeSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractDocxText(arrayBuffer: ArrayBuffer): Promise<ParsedBook> {
  return new Promise((resolve, reject) => {
    JSZip.loadAsync(arrayBuffer).then(async (zip) => {
      try {
        const docXml = await zip.file('word/document.xml')?.async('string');
        const coreXml = await zip.file('docProps/core.xml')?.async('string');

        if (!docXml) { reject(new Error('No se encontrá word/document.xml')); return; }

        const parser = new DOMParser();
        const doc = parser.parseFromString(docXml, 'text/xml');
        const body = doc.querySelector('w\\:document w\\:body') || doc.querySelector('body');
        if (!body) { reject(new Error('No se encontró el body en el documento')); return; }

        let fullText = '';
        const allParagraphs = body.querySelectorAll('w\\:p, p');
        allParagraphs.forEach((p) => {
          const style = p.getAttribute('w\\:style') || '';
          const text = (p.textContent || '').trim();
          const isHeading = style.includes('Heading') || text.startsWith('#') || text.startsWith('##');
          if (isHeading && text) {
            fullText += `\n# ${text.replace(/^#+\s*/, '')}\n\n`;
          } else if (text && !style.includes('Heading') && !style.includes('Title')) {
            fullText += text + '\n\n';
          }
        });

        const coreParser = new DOMParser();
        const coreDoc = coreXml ? coreParser.parseFromString(coreXml, 'text/xml') : null;
        const dcTitle = coreDoc?.querySelector('dc\\:title')?.textContent || '';
        const dcCreator = coreDoc?.querySelector('dc\\:creator')?.textContent || '';
        const dcDate = coreDoc?.querySelector('dc\\:date')?.textContent || '';
        const title = dcTitle || fullText.split('\n')[0]?.replace(/^#+\s*/, '') || 'Libro Sin Título';
        const author = dcCreator || 'Autor Desconocido';
        const matchDate = dcDate.match(/(\d{4})/);
        const year = matchDate ? parseInt(matchDate[1], 10) : new Date().getFullYear();

        const headingRegex = /^(#{1,6}\s+.*)$/gm;
        const headingMatches = [...fullText.matchAll(headingRegex)];
        const chapters: ChapterEdit[] = [];

        if (headingMatches.length === 0) {
          chapters.push({ title: 'Introducción', content: fullText.trim(), pages: 0 });
        } else {
          headingMatches.forEach((m) => {
            chapters.push({ title: m[1].replace(/^#+\s*/, ''), content: '', pages: 0 });
          });
        }

        resolve({ title, author, year, genre: '', synopsis: '', tags: [], chapters, rawContent: fullText });
      } catch (err) {
        reject(err);
      }
    }).catch(reject);
  });
}

function extractEpubText(arrayBuffer: ArrayBuffer): Promise<ParsedBook> {
  return new Promise((resolve, reject) => {
    JSZip.loadAsync(arrayBuffer).then(async (zip) => {
      try {
        const turndown = createTurndown();
        const htmlFiles = zip.file(/.*\.(x?html?)$/i);

        if (htmlFiles.length === 0) {
          reject(new Error('No se encontraron archivos HTML en el EPUB'));
          return;
        }

        let title = 'Libro Sin Título';
        let author = 'Autor Desconocido';
        let year = new Date().getFullYear();
        let synopsis = '';

        const metaFile = zip.file(/.*\.opf$/i);
        if (metaFile.length > 0) {
          const opfContent = await metaFile[0].async('string');
          const opfParser = new DOMParser();
          const opfDoc = opfParser.parseFromString(opfContent, 'text/xml');
          const dcTitle = opfDoc.querySelector('dc\\:title')?.textContent || '';
          const dcCreator = opfDoc.querySelector('dc\\:creator')?.textContent || '';
          const dcDate = opfDoc.querySelector('dc\\:date')?.textContent || '';
          const dcDesc = opfDoc.querySelector('dc\\:description')?.textContent || '';
          if (dcTitle) title = dcTitle;
          if (dcCreator) author = dcCreator;
          const m = dcDate.match(/(\d{4})/);
          if (m) year = parseInt(m[1], 10);
          synopsis = dcDesc || '';
        }

        const chapters: ChapterEdit[] = [];
        let fullRawText = '';
        let chNum = 1;

        for (const file of htmlFiles.slice(0, 20)) {
          const html = await file.async('string');
          const md = turndown.turndown(html);
          const cleanMd = md.replace(/\n{3,}/g, '\n\n').trim();
          if (cleanMd.length < 10) continue;
          fullRawText += cleanMd + '\n\n';
          const headingMatch = cleanMd.match(/^(#{1,6}\s+.*)$/m);
          const chapterTitle = headingMatch ? headingMatch[1].replace(/^#+\s*/, '') : `Capítulo ${chNum}`;
          chapters.push({ title: chapterTitle, content: cleanMd, pages: 0 });
          chNum++;
        }

        resolve({ title, author, year, genre: '', synopsis, tags: [], chapters, rawContent: fullRawText });
      } catch (err) {
        reject(err);
      }
    }).catch(reject);
  });
}

function generateZip(book: ParsedBook): Promise<Blob> {
  return new Promise((resolve) => {
    const zip = new JSZip();
    const slug = sanitizeSlug(book.title);
    let bookMd = '---\n';
    bookMd += `title: ${book.title}\n`;
    bookMd += `author: ${book.author}\n`;
    bookMd += `year: ${book.year}\n`;
    bookMd += `genre: ${book.genre || 'General'}\n`;
    bookMd += `status: draft\n`;
    bookMd += `order: 1\n`;
    if (book.synopsis) bookMd += `synopsis: >-\n  ${book.synopsis}\n`;
    bookMd += `---\n`;
    zip.file(`${slug}/book.md`, bookMd);

    book.chapters.forEach((ch, i) => {
      const chapNum = i + 1;
      const chapSlug = `${String(chapNum).padStart(2, '0')}-${sanitizeSlug(ch.title)}`;
      let chapterMd = '---\n';
      chapterMd += `number: ${chapNum}\n`;
      chapterMd += `title: ${ch.title}\n`;
      chapterMd += `location: ${ch.title}\n`;
      chapterMd += `pages: ${ch.pages || 0}\n`;
      chapterMd += '---\n\n';
      chapterMd += ch.content + '\n';
      zip.file(`${slug}/capitulos/${chapSlug}.md`, chapterMd);
    });

    zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(resolve);
  });
}

function resolveUrl(url: string): string {
  const googleMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (googleMatch) return `https://docs.google.com/document/d/${googleMatch[1]}/export?format=docx`;
  return url;
}

/**
 * Descarga un archivo desde una URL usando nuestro proxy local (/api/proxy).
 * Evita CORS porque la petición va al mismo origen.
 */
async function fetchFile(url: string): Promise<ArrayBuffer> {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, { credentials: 'omit' });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${response.status}`);
  }
  return await response.arrayBuffer();
}

export async function processUploadedFile(file: File): Promise<{ book: ParsedBook; zipBlob: Blob }> {
  const arrayBuffer = await file.arrayBuffer();
  const isEpub = file.name.toLowerCase().endsWith('.epub');
  const isDocx = file.name.toLowerCase().endsWith('.docx');
  if (!isEpub && !isDocx) throw new Error('Formato no soportado. Usá .docx o .epub');
  const book = isDocx ? await extractDocxText(arrayBuffer) : await extractEpubText(arrayBuffer);
  const zipBlob = await generateZip(book);
  return { book, zipBlob };
}

export async function processUrl(url: string): Promise<{ book: ParsedBook; zipBlob: Blob }> {
  const resolvedUrl = resolveUrl(url);
  const isGoogleDoc = resolvedUrl !== url;
  const arrayBuffer = await fetchFile(resolvedUrl);
  const isEpub = resolvedUrl.toLowerCase().endsWith('.epub');
  const isDocx = resolvedUrl.toLowerCase().endsWith('.docx') || isGoogleDoc;
  if (!isEpub && !isDocx) throw new Error('La URL no corresponde a un documento .docx o .epub');
  const book = isDocx ? await extractDocxText(arrayBuffer) : await extractEpubText(arrayBuffer);
  const zipBlob = await generateZip(book);
  return { book, zipBlob };
}

export function generateZipFromModal(
  title: string,
  author: string,
  year: number,
  genre: string,
  synopsis: string,
  chapters: ChapterEdit[]
): Promise<Blob> {
  return new Promise((resolve) => {
    const zip = new JSZip();
    const slug = sanitizeSlug(title);
    let bookMd = '---\n';
    bookMd += `title: ${title}\n`;
    bookMd += `author: ${author}\n`;
    bookMd += `year: ${year}\n`;
    bookMd += `genre: ${genre || 'General'}\n`;
    bookMd += `status: draft\n`;
    bookMd += `order: 1\n`;
    if (synopsis) bookMd += `synopsis: >-\n  ${synopsis}\n`;
    bookMd += `---\n`;
    zip.file(`${slug}/book.md`, bookMd);

    chapters.forEach((ch, i) => {
      const chapNum = i + 1;
      const chapSlug = `${String(chapNum).padStart(2, '0')}-${sanitizeSlug(ch.title)}`;
      let chapterMd = '---\n';
      chapterMd += `number: ${chapNum}\n`;
      chapterMd += `title: ${ch.title}\n`;
      chapterMd += `location: ${ch.title}\n`;
      chapterMd += `pages: ${ch.pages || 0}\n`;
      chapterMd += '---\n\n';
      chapterMd += ch.content + '\n';
      zip.file(`${slug}/capitulos/${chapSlug}.md`, chapterMd);
    });

    zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(resolve);
  });
}

export function downloadZip(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveBookToServer(
  title: string,
  author: string,
  year: number,
  genre: string,
  synopsis: string,
  chapters: ChapterEdit[]
): Promise<void> {
  const slug = sanitizeSlug(title);
  let bookMd = '---\n';
  bookMd += `title: ${title}\n`;
  bookMd += `author: ${author}\n`;
  bookMd += `year: ${year}\n`;
  bookMd += `genre: ${genre || 'General'}\n`;
  bookMd += `status: published\n`; // change to published so it shows up instantly!
  bookMd += `order: 1\n`;
  if (synopsis) bookMd += `synopsis: >-\n  ${synopsis.replace(/\n/g, ' ')}\n`;
  bookMd += `---\n`;

  const chaptersPayload = chapters.map((ch, idx) => {
    const chapNum = idx + 1;
    const chapSlug = `${String(chapNum).padStart(2, '0')}-${sanitizeSlug(ch.title)}`;
    let chapterMd = '---\n';
    chapterMd += `number: ${chapNum}\n`;
    chapterMd += `title: ${ch.title}\n`;
    chapterMd += `location: ${ch.title}\n`;
    chapterMd += `pages: ${ch.pages || 0}\n`;
    chapterMd += '---\n\n';
    chapterMd += ch.content + '\n';
    return { filename: `${chapSlug}.md`, content: chapterMd };
  });

  const res = await fetch('/api/save-book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, bookMd, chapters: chaptersPayload })
  });
  if (!res.ok) throw new Error('Error guardando en el servidor local');
}

export async function deleteBookFromServer(slug: string): Promise<void> {
  const res = await fetch('/api/delete-book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug })
  });
  if (!res.ok) throw new Error('Error al eliminar en el servidor local');
}

export { sanitizeSlug };
