export interface AdminBook {
  slug: string;
  title: string;
  author: string;
  genre: string;
  status: 'published' | 'draft';
  order: number;
  chapters: number;
  estimatedPages: number;
  readingMinutes: number;
  coverPalette: string;
  tags: string[];
}

export interface AdminStats {
  totalBooks: number;
  publishedBooks: number;
  draftBooks: number;
  totalChapters: number;
  totalWords: number;
}
