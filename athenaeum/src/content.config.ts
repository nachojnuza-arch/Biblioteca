import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Modelo de contenido de Athenaeum.
 *
 * Seguridad: el contenido se renderiza a HTML en tiempo de BUILD (SSG).
 * Los archivos Markdown son contenido de autor confiable (viven en este
 * repositorio); nunca se ejecuta HTML de usuarios finales en el cliente.
 */

const bookSchema = z.object({
  /** Título del libro */
  title: z.string().min(1),
  /** Subtítulo o género extendido (ej. "Novela corta en siete actos") */
  subtitle: z.string().default(''),
  /** Autor (por defecto, el dueño de la biblioteca) */
  author: z.string().default('Julián Vásquez de Aranda'),
  /** Género principal (usado por los filtros de la estantería) */
  genre: z.string().min(1),
  /** Etiquetas temáticas */
  tags: z.array(z.string()).default([]),
  /** Año de escritura/edición */
  year: z.number().int().positive(),
  /** Signatura editorial decorativa */
  signature: z.string().default('ATHENAEUM · EDICIÓN PRIVADA'),
  /** Estado de publicación: solo "published" se incluye en el sitio */
  status: z.enum(['published', 'draft']).default('published'),
  /** Variantes de color de portada tipográfica */
  coverPalette: z.enum(['terracotta', 'olive', 'burgundy', 'ivory']).default('terracotta'),
  /** Frase del prólogo (se muestra en la ficha editorial) */
  prologueQuote: z.string().default(''),
  prologueAttribution: z.string().default(''),
  /** Sinopsis de la obra (Markdown) */
  synopsis: z.string().default(''),
  /** Orden en la estantería (menor = primero) */
  order: z.number().int().default(100),
});

const chapterSchema = z.object({
  /** Número de capítulo (para ordenar y mostrar) */
  number: z.number().int().positive(),
  /** Título del capítulo */
  title: z.string().min(1),
  /** Localización decorativa en el pie de página */
  location: z.string().default(''),
});

export const collections = {
  books: defineCollection({
    loader: glob({ pattern: '*/book.md', base: './src/content/books' }),
    schema: bookSchema,
  }),
  chapters: defineCollection({
    loader: glob({ pattern: '*/capitulos/*.md', base: './src/content/books' }),
    schema: chapterSchema,
  }),
};

export type Book = z.infer<typeof bookSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
