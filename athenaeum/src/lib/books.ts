import { getCollection, type CollectionEntry } from 'astro:content';
import type { Book, Chapter } from '@/content.config';

export type BookEntry = CollectionEntry<'books'>;
export type ChapterEntry = CollectionEntry<'chapters'>;

export interface BookWithChapters {
  entry: BookEntry;
  data: Book;
  /** Slug del libro derivado del id de la colección (ej. "la-niebla-en-los-espejos") */
  slug: string;
  chapters: Array<{ data: Chapter; html: string; id: string }>;
  /** Número de páginas estimado para la ficha (a 350 palabras/pág. aprox.) */
  estimatedPages: number;
  /** Minutos de lectura estimados (200 ppm) */
  readingMinutes: number;
}

/**
 * Devuelve todos los libros publicados con sus capítulos ordenados.
 * Los borradores quedan fuera del build público.
 */
export async function getPublishedBooks(): Promise<BookWithChapters[]> {
  const [books, chapters] = await Promise.all([
    getCollection('books', ({ data }) => data.status === 'published'),
    getCollection('chapters'),
  ]);

  return books
    .map((entry) => {
      // El id de un book.md es "libro-slug/book.md" → slug del libro
      const slug = entry.id.split('/')[0]!;

      const bookChapters = chapters
        .filter((c) => c.id.startsWith(`${slug}/`))
        .map((c) => ({ data: c.data, html: c.rendered?.html ?? '', id: c.id }))
        .sort((a, b) => a.data.number - b.data.number);

      const wordCount = bookChapters.reduce(
        (sum, ch) => sum + ch.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
        0,
      );

      return {
        entry,
        data: entry.data,
        slug,
        chapters: bookChapters,
        estimatedPages: Math.max(1, Math.round(wordCount / 350)),
        readingMinutes: Math.max(1, Math.round(wordCount / 200)),
      } satisfies BookWithChapters;
    })
    .sort((a, b) => a.data.order - b.data.order);
}

/** Busca un libro publicado por slug de URL (validado contra la colección). */
export async function getBookBySlug(slug: string): Promise<BookWithChapters | undefined> {
  const books = await getPublishedBooks();
  return books.find((b) => b.slug === slug);
}

/** Géneros únicos con conteo, para los filtros de la estantería. */
export function getGenreStats(books: BookWithChapters[]): Array<{ genre: string; count: number }> {
  const map = new Map<string, number>();
  for (const b of books) map.set(b.data.genre, (map.get(b.data.genre) ?? 0) + 1);
  return [...map.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre, 'es'));
}
