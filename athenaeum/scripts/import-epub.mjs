import fs from 'fs/promises';
import path from 'path';
import EPub from 'epub2';
import TurndownService from 'turndown';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_DIR = path.join(__dirname, '../src/content/books');

function getChapterText(epub, chapterId) {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) return reject(err);
      resolve(text);
    });
  });
}

function parseDateYear(dateStr) {
  if (!dateStr) return new Date().getFullYear();
  const match = String(dateStr).match(/(\d{4})/);
  if (match) return parseInt(match[1], 10);
  const d = new Date(dateStr);
  return isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
}

async function importEpub(epubPath) {
  console.log(`Abriendo EPUB: ${epubPath}`);

  let epub;
  try {
    epub = new EPub(epubPath);
  } catch (err) {
    console.error("Error al abrir el EPUB:", err);
    process.exit(1);
  }

  epub.on("error", (err) => {
    console.error("Error leyendo el EPUB:", err);
    process.exit(1);
  });

  epub.on("end", async () => {
    const title = epub.metadata?.title || 'Libro Sin Título';
    const creator = epub.metadata?.creator || 'Autor Desconocido';
    const year = parseDateYear(epub.metadata?.date);
    const description = epub.metadata?.description || '';

    const metadata = {
      title,
      author: creator,
      year,
      status: 'published',
      order: 1,
      synopsis: description,
      genre: '',
      subtitle: '',
      tags: [],
    };

    const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const bookDir = path.join(BOOKS_DIR, slug);
    const chaptersDir = path.join(bookDir, 'capitulos');

    await fs.mkdir(chaptersDir, { recursive: true });

    const bookMdContent = `---\n${yaml.dump(metadata)}---\n`;
    await fs.writeFile(path.join(bookDir, 'book.md'), bookMdContent, 'utf8');

    const turndownService = new TurndownService({ headingStyle: 'atx' });

    let chNum = 1;
    try {
      const flow = epub.flow || [];
      for (const chapter of flow) {
        if (!chapter.id) continue;
        try {
          const html = await getChapterText(epub, chapter.id);
          if (!html) continue;
          let markdown = turndownService.turndown(html);
          markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
          if (markdown.length < 10) continue;
          const cleanTitle = (chapter.title || `Capítulo ${chNum}`).replace(/^#+\s*/, '').trim();
          const chapSlug = `${String(chNum).padStart(2, '0')}-${cleanTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
          const yamlHead = `---\nnumber: ${chNum}\ntitle: ${cleanTitle}\nlocation: ${cleanTitle}\n---\n\n`;
          await fs.writeFile(path.join(chaptersDir, `${chapSlug}.md`), yamlHead + markdown + '\n', 'utf8');
          console.log(`Guardado capítulo ${chNum}: ${cleanTitle}`);
          chNum++;
        } catch (err) {
          console.error(`Error procesando capítulo ${chapter.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Error procesando el flujo del EPUB:", err);
    }

    console.log(`\n¡Libro EPUB importado exitosamente en src/content/books/${slug}!`);
  });

  try {
    epub.parse();
  } catch (err) {
    console.error("Error al parsear el EPUB:", err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Por favor, provee la ruta a un archivo .epub");
  process.exit(1);
}

importEpub(args[0]).catch(err => {
  console.error("Error al importar el EPUB:", err);
});
