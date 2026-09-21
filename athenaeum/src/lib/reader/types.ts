/** Tipos compartidos del motor de lectura Athenaeum. */

/** Capítulo con su HTML ya renderizado en build (contenido de autor confiable). */
export interface ChapterDoc {
  number: number;
  title: string;
  location: string;
  html: string;
}

/** Configuración del lector inyectada desde el servidor (build time). */
export interface ReaderConfig {
  bookSlug: string;
  bookTitle: string;
  bookSubtitle: string;
  author: string;
  /** Fondo del lector */
  coverPalette: string;
  chapters: ChapterDoc[];
}

/** Una página del libro ya paginada. */
export interface BookPage {
  /** Índice global de página (0-based) */
  index: number;
  chapterIndex: number;
  chapterNumber: number;
  chapterTitle: string;
  location: string;
  /** Nodos DOM listos para insertar (clones seguros) */
  nodes: Node[];
  /** Primera página del capítulo (para el índice) */
  isChapterStart: boolean;
}

export interface TocEntry {
  chapterNumber: number;
  chapterTitle: string;
  location: string;
  /** Índice de página donde empieza el capítulo */
  pageIndex: number;
  /** Página "humana" (1-based) */
  pageNumber: number;
}

/** Nota del lector asociada a una página de un libro. */
export interface ReaderNote {
  id: string;
  bookSlug: string;
  bookTitle: string;
  pageIndex: number;
  pageNumber: number;
  chapterTitle: string;
  text: string;
  createdAt: string;
}

/** Marcapáginas único por libro. */
export interface ReaderBookmark {
  bookSlug: string;
  bookTitle: string;
  pageIndex: number;
  pageNumber: number;
  chapterTitle: string;
  createdAt: string;
}

/** Progreso de lectura por libro. */
export interface ReaderProgress {
  bookSlug: string;
  bookTitle: string;
  pageIndex: number;
  totalPages: number;
  percent: number;
  updatedAt: string;
}
