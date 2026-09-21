import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_DIR = path.join(__dirname, '../src/content/books');

async function importBook(docxPath) {
  console.log(`Leyendo documento: ${docxPath}`);

  const { value: html } = await mammoth.convertToHtml({ path: docxPath });

  const turndownService = new TurndownService({ headingStyle: 'atx' });
  let markdown = turndownService.turndown(html);
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  const chapterRegex = /^(#{1,2}\s+.*)$/gm;
  const matches = [...markdown.matchAll(chapterRegex)].map(m => m[0]);

  let metaText = '';
  let contentText = markdown;

  if (matches.length > 0) {
    const firstMatchIndex = markdown.indexOf(matches[0]);
    metaText = markdown.slice(0, firstMatchIndex).trim();
    contentText = markdown.slice(firstMatchIndex).trim();
  }

  const metadata = {
    title: 'Libro Sin Título',
    author: 'Autor Desconocido',
    year: new Date().getFullYear(),
    status: 'published',
    order: 1,
    genre: '',
    subtitle: '',
    tags: [],
  };

  const metaLines = metaText.split('\n');
  for (const line of metaLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const val = line.slice(colonIndex + 1).trim();
      if (key === 'título' || key === 'titulo' || key === 'title') metadata.title = val;
      else if (key === 'autor' || key === 'author') metadata.author = val;
      else if (key === 'subtítulo' || key === 'subtitle') metadata.subtitle = val;
      else if (key === 'año' || key === 'year') metadata.year = parseInt(val, 10) || new Date().getFullYear();
      else if (key === 'género' || key === 'genre') metadata.genre = val;
      else if (key === 'sinopsis' || key === 'synopsis') metadata.synopsis = val;
      else if (key === 'tags' || key === 'etiquetas') metadata.tags = val.split(',').map(t => t.trim());
    }
  }

  const slug = metadata.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const bookDir = path.join(BOOKS_DIR, slug);
  const chaptersDir = path.join(bookDir, 'capitulos');

  await fs.mkdir(chaptersDir, { recursive: true });

  const bookMdContent = `---\n${yaml.dump(metadata)}---\n`;
  await fs.writeFile(path.join(bookDir, 'book.md'), bookMdContent, 'utf8');

  const headingRegex = /^(#{1,2}\s+.*)$/gm;
  const headingPositions = [...contentText.matchAll(headingRegex)];

  const saveChapter = async (title, content, num) => {
    if (!content.trim()) return;
    const cleanTitle = title.replace(/^#+\s*/, '').trim();
    const chapSlug = `${String(num).padStart(2, '0')}-${cleanTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    const yamlHead = `---\nnumber: ${num}\ntitle: ${cleanTitle}\nlocation: ${cleanTitle}\n---\n\n`;
    await fs.writeFile(path.join(chaptersDir, `${chapSlug}.md`), yamlHead + content.trim() + '\n', 'utf8');
    console.log(`Guardado capítulo ${num}: ${cleanTitle}`);
  };

  if (headingPositions.length === 0) {
    await saveChapter('Introducción', contentText, 1);
  } else {
    for (let i = 0; i < headingPositions.length; i++) {
      const start = headingPositions[i].index + headingPositions[i][0].length;
      const end = i + 1 < headingPositions.length ? headingPositions[i + 1].index : contentText.length;
      const chapterContent = contentText.slice(start, end).trim();
      const headingText = headingPositions[i][0].replace(/^#+\s*/, '').trim();
      const isPreface = headingText.toLowerCase().includes('prefacio') || i === 0 && !headingText.toLowerCase().includes('capítulo');
      await saveChapter(isPreface ? 'Prefacio' : headingText, chapterContent, i + 1);
    }
  }

  console.log(`\n¡Libro importado exitosamente en src/content/books/${slug}!`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Por favor, provee la ruta a un archivo .docx");
  process.exit(1);
}

importBook(args[0]).catch(err => {
  console.error("Error al importar el libro:", err);
});
