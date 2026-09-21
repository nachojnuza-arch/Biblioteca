/**
 * Estantería (home): filtros por género, búsqueda y tarjeta de
 * "lectura en curso" reconstruida desde localStorage (progreso propio).
 *
 * Seguridad: el progreso leído de localStorage se valida en storage.ts
 * y se renderiza solo con API DOM (textContent), nunca innerHTML.
 */
import { getAllProgress } from '@/lib/reader/storage';

interface ShelfInit {
  books: Array<{ slug: string; title: string; author: string; genre: string }>;
}

export function bootShelf(init: ShelfInit): void {
  const grid = document.getElementById('shelf-grid');
  const searchInput = document.getElementById('shelf-search') as HTMLInputElement | null;
  const filterBar = document.getElementById('shelf-filters');
  const hero = document.getElementById('reading-hero');
  const known = new Set(init.books.map((b) => b.slug));

  if (!grid || !filterBar) return;

  const cards = [...grid.querySelectorAll<HTMLElement>('[data-book-slug]')];

  /* ── Lectura en curso (desde el progreso guardado) ────── */
  const progress = Object.values(getAllProgress()).filter((p) => known.has(p.bookSlug));
  const active = progress.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (hero && active) {
    const fill = hero.querySelector<HTMLElement>('[data-hero-progress-fill]');
    const label = hero.querySelector<HTMLElement>('[data-hero-progress-label]');
    const title = hero.querySelector<HTMLElement>('[data-hero-title]');
    const resume = hero.querySelector<HTMLAnchorElement>('[data-hero-resume]');
    if (fill) fill.style.width = `${active.percent}%`;
    if (label) label.textContent = `${active.percent}% completado`;
    if (title) title.textContent = active.bookTitle;
    if (resume) resume.href = `/leer/${active.bookSlug}`;
    hero.classList.remove('hidden');
  }

  /* ── Filtros por género + búsqueda ────────────────────── */
  let genre = 'todos';
  let query = '';

  function applyFilters(): void {
    const q = query.trim().toLowerCase();
    for (const card of cards) {
      const slug = card.dataset.bookSlug ?? '';
      const meta = init.books.find((b) => b.slug === slug);
      if (!meta) continue;
      const matchGenre = genre === 'todos' || meta.genre === genre;
      const matchQuery =
        q.length === 0 ||
        meta.title.toLowerCase().includes(q) ||
        meta.author.toLowerCase().includes(q) ||
        meta.genre.toLowerCase().includes(q);
      card.classList.toggle('hidden', !(matchGenre && matchQuery));
    }
  }

  filterBar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-genre-filter]');
    if (!btn) return;
    genre = btn.dataset.genreFilter ?? 'todos';
    filterBar.querySelectorAll('[data-genre-filter]').forEach((el) => {
      const activeBtn = el === btn;
      el.setAttribute('aria-pressed', String(activeBtn));
      el.classList.toggle('bg-surface-container-highest', activeBtn);
      el.classList.toggle('text-primary', activeBtn);
    });
    applyFilters();
  });

  searchInput?.addEventListener('input', () => {
    query = searchInput.value;
    applyFilters();
  });
}
