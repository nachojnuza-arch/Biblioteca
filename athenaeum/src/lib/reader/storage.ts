/**
 * Capa de persistencia del lector Athenaeum.
 *
 * Seguridad:
 * - Todos los datos provienen de localStorage (no confiables): se parsean
 *   con try/catch y se validan campo por campo antes de usarlos.
 * - Nunca se guardan datos personales; solo estado de lectura anónimo.
 * - Claves con prefijo `athenaeum:` para evitar colisiones con otras apps.
 * - Las cuotas/errores de storage (modo privado, Safari antiguo) se degradan
 *   en silencio: la lectura sigue funcionando sin persistencia.
 */
import type { ReaderBookmark, ReaderNote, ReaderProgress } from './types';
import { sanitizeSettings, type ReaderSettings } from './settings';

const PREFIX = 'athenaeum:';
const KEYS = {
  settings: `${PREFIX}ajustes`,
  progress: `${PREFIX}progreso`,
  bookmarks: `${PREFIX}marcadores`,
  notes: `${PREFIX}notas`,
} as const;

function safeGet(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null; // JSON corrupto o storage bloqueado
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* cuota llena o storage bloqueado: se ignora */
  }
}

/* ── Ajustes ─────────────────────────────────────────────── */
export function loadSettings(): ReaderSettings {
  return sanitizeSettings(safeGet(KEYS.settings));
}

export function saveSettings(settings: ReaderSettings): void {
  safeSet(KEYS.settings, settings);
}

/* ── Progreso por libro ──────────────────────────────────── */
type ProgressMap = Record<string, ReaderProgress>;

function sanitizeProgressMap(raw: unknown): ProgressMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: ProgressMap = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const p = value as Partial<ReaderProgress>;
    if (
      typeof p.bookSlug === 'string' &&
      typeof p.bookTitle === 'string' &&
      typeof p.pageIndex === 'number' &&
      Number.isInteger(p.pageIndex) &&
      p.pageIndex >= 0 &&
      typeof p.totalPages === 'number' &&
      typeof p.percent === 'number' &&
      typeof p.updatedAt === 'string'
    ) {
      out[slug] = {
        bookSlug: p.bookSlug,
        bookTitle: p.bookTitle,
        pageIndex: p.pageIndex,
        totalPages: p.totalPages,
        percent: Math.min(100, Math.max(0, p.percent)),
        updatedAt: p.updatedAt,
      };
    }
  }
  return out;
}

export function getProgress(slug: string): ReaderProgress | null {
  return sanitizeProgressMap(safeGet(KEYS.progress))[slug] ?? null;
}

export function getAllProgress(): ProgressMap {
  return sanitizeProgressMap(safeGet(KEYS.progress));
}

export function setProgress(progress: ReaderProgress): void {
  const map = sanitizeProgressMap(safeGet(KEYS.progress));
  map[progress.bookSlug] = progress;
  safeSet(KEYS.progress, map);
}

/* ── Marcapáginas (uno por libro) ────────────────────────── */
type BookmarkMap = Record<string, ReaderBookmark>;

function sanitizeBookmarkMap(raw: unknown): BookmarkMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: BookmarkMap = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const b = value as Partial<ReaderBookmark>;
    if (
      typeof b.bookSlug === 'string' &&
      typeof b.bookTitle === 'string' &&
      typeof b.pageIndex === 'number' &&
      Number.isInteger(b.pageIndex) &&
      b.pageIndex >= 0 &&
      typeof b.pageNumber === 'number' &&
      typeof b.chapterTitle === 'string' &&
      typeof b.createdAt === 'string'
    ) {
      out[slug] = {
        bookSlug: b.bookSlug,
        bookTitle: b.bookTitle,
        pageIndex: b.pageIndex,
        pageNumber: b.pageNumber,
        chapterTitle: b.chapterTitle,
        createdAt: b.createdAt,
      };
    }
  }
  return out;
}

export function getBookmark(slug: string): ReaderBookmark | null {
  return sanitizeBookmarkMap(safeGet(KEYS.bookmarks))[slug] ?? null;
}

export function setBookmark(bookmark: ReaderBookmark): void {
  const map = sanitizeBookmarkMap(safeGet(KEYS.bookmarks));
  map[bookmark.bookSlug] = bookmark;
  safeSet(KEYS.bookmarks, map);
}

export function removeBookmark(slug: string): void {
  const map = sanitizeBookmarkMap(safeGet(KEYS.bookmarks));
  delete map[slug];
  safeSet(KEYS.bookmarks, map);
}

/* ── Notas del lector ────────────────────────────────────── */
const MAX_NOTES = 500;
const MAX_NOTE_LENGTH = 2000;

function sanitizeNotes(raw: unknown): ReaderNote[] {
  if (!Array.isArray(raw)) return [];
  const out: ReaderNote[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const n = item as Partial<ReaderNote>;
    if (
      typeof n.id === 'string' &&
      n.id.length > 0 &&
      typeof n.bookSlug === 'string' &&
      typeof n.bookTitle === 'string' &&
      typeof n.pageIndex === 'number' &&
      Number.isInteger(n.pageIndex) &&
      n.pageIndex >= 0 &&
      typeof n.pageNumber === 'number' &&
      typeof n.chapterTitle === 'string' &&
      typeof n.text === 'string' &&
      typeof n.createdAt === 'string'
    ) {
      out.push({
        id: n.id,
        bookSlug: n.bookSlug,
        bookTitle: n.bookTitle,
        pageIndex: n.pageIndex,
        pageNumber: n.pageNumber,
        chapterTitle: n.chapterTitle,
        // Longitud acotada: evita abuse de cuota y renderizado masivo.
        text: n.text.slice(0, MAX_NOTE_LENGTH),
        createdAt: n.createdAt,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getNotes(): ReaderNote[] {
  return sanitizeNotes(safeGet(KEYS.notes));
}

export function getNotesForBook(slug: string): ReaderNote[] {
  return getNotes().filter((n) => n.bookSlug === slug);
}

export function addNote(note: Omit<ReaderNote, 'id' | 'createdAt'>): ReaderNote | null {
  const full: ReaderNote = {
    ...note,
    // crypto.randomUUID: disponible en contextos seguros (https/localhost).
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const notes = getNotes();
  if (notes.length >= MAX_NOTES) return null;
  safeSet(KEYS.notes, [full, ...notes]);
  return full;
}

export function deleteNote(id: string): void {
  safeSet(
    KEYS.notes,
    getNotes().filter((n) => n.id !== id),
  );
}

export { MAX_NOTE_LENGTH };
