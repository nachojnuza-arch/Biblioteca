/**
 * Controlador del lector Athenaeum (punto de entrada del cliente).
 *
 * Orquesta: configuración inyectada en build → paginación → motor de
 * volteo → persistencia → interfaz (ajustes, índice, notas, marcador).
 *
 * Seguridad:
 * - La configuración llega por un <script type="application/json"> con el
 *   carácter "<" escapado (anti </script> breakout) y se valida por esquema.
 * - El contenido de las páginas es DOM clonado, nunca strings → innerHTML.
 * - Las notas del lector (input del usuario) se renderizan con textContent.
 */
import { Paginator } from './paginator';
import { FlipBook } from './flipbook';
import { playPageSound } from './audio';
import {
  loadSettings,
  saveSettings,
  getProgress,
  setProgress,
  getBookmark,
  setBookmark,
  removeBookmark,
  getNotesForBook,
  addNote,
  deleteNote,
  MAX_NOTE_LENGTH,
} from './storage';
import {
  PAPER_THEMES,
  FONT_STACKS,
  LINE_SPACINGS,
  type ReaderSettings,
  type PaperTheme,
} from './settings';
import type { BookPage, ChapterDoc, ReaderConfig, TocEntry } from './types';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Athenaeum reader: falta el elemento #${id}`);
  return el;
}

/** Valida la configuración inyectada (defensa en profundidad). */
function sanitizeConfig(raw: unknown): ReaderConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Partial<ReaderConfig>;
  if (
    typeof c.bookSlug !== 'string' ||
    typeof c.bookTitle !== 'string' ||
    typeof c.bookSubtitle !== 'string' ||
    typeof c.author !== 'string' ||
    !Array.isArray(c.chapters) ||
    c.chapters.length === 0
  ) {
    return null;
  }
  const chapters: ChapterDoc[] = [];
  for (const ch of c.chapters) {
    if (typeof ch !== 'object' || ch === null) continue;
    const d = ch as Partial<ChapterDoc>;
    if (
      typeof d.number === 'number' &&
      typeof d.title === 'string' &&
      typeof d.location === 'string' &&
      typeof d.html === 'string'
    ) {
      chapters.push({ number: d.number, title: d.title, location: d.location, html: d.html });
    }
  }
  if (chapters.length === 0) return null;
  return {
    bookSlug: c.bookSlug,
    bookTitle: c.bookTitle,
    bookSubtitle: c.bookSubtitle ?? '',
    author: c.author ?? '',
    coverPalette: typeof c.coverPalette === 'string' ? c.coverPalette : 'terracotta',
    chapters,
  };
}

export function bootReader(): void {
  /* ── Configuración desde el servidor ─────────────────── */
  const configEl = document.getElementById('reader-config');
  let config: ReaderConfig | null = null;
  try {
    config = sanitizeConfig(JSON.parse(configEl?.textContent ?? 'null'));
  } catch {
    config = null;
  }
  if (!config) {
    console.error('Athenaeum: configuración del lector inválida.');
    return;
  }
  // A partir de aquí `cfg` es no-nulo para todo el closure.
  const cfg: ReaderConfig = config;

  /* ── Referencias del DOM ─────────────────────────────── */
  const stage = $('reader-stage');
  const underlay = $('underlay-leaf');
  const flipper = $('flipper-page');
  const frontFace = $('front-leaf');
  const backFace = $('back-leaf');
  const corners = {
    next: $('page-curl-trigger'),
    prev: $('verso-curl-trigger'),
  };

  interface Face {
    root: HTMLElement;
    content: HTMLElement;
    chapter: HTMLElement;
    pageNum: HTMLElement;
    location: HTMLElement;
  }
  const faces: Record<'underlay' | 'front' | 'back', Face> = {
    underlay: {
      root: underlay,
      content: $('underlay-content'),
      chapter: $('underlay-chapter'),
      pageNum: $('underlay-page-num'),
      location: $('underlay-location'),
    },
    front: {
      root: frontFace,
      content: $('front-content'),
      chapter: $('front-chapter'),
      pageNum: $('front-page-num'),
      location: $('front-location'),
    },
    back: {
      root: backFace,
      content: $('back-content'),
      chapter: $('back-chapter'),
      pageNum: $('back-page-num'),
      location: $('back-location'),
    },
  };

  const ui = {
    prev: $('btn-prev-page'),
    next: $('btn-next-page'),
    flipToggle: $('btn-flip-toggle'),
    flipLabel: $('btn-flip-label'),
    fontInc: $('btn-font-inc'),
    fontDec: $('btn-font-dec'),
    progressFill: $('progress-fill'),
    progressLabel: $('progress-percent-label'),
    progressRail: $('progress-rail'),
    bookmark: $('btn-bookmark'),
    bookmarkIcon: $('bookmark-icon'),
    tocBtn: $('btn-toc'),
    tocDrawer: $('drawer-toc'),
    tocList: $('toc-list'),
    notesBtn: $('btn-marginalia'),
    notesDrawer: $('drawer-notes'),
    notesList: $('notes-list'),
    notesCount: $('notes-count'),
    noteInput: $('note-input') as HTMLTextAreaElement,
    noteForm: $('note-form') as HTMLFormElement,
    toast: $('page-turn-indicator'),
    toastText: $('page-indicator-text'),
    barTitle: $('bar-book-title'),
    closeToc: $('btn-close-toc'),
    closeNotes: $('btn-close-notes'),
    swatches: [...document.querySelectorAll<HTMLButtonElement>('.paper-swatch')],
  };

  /* ── Estado ──────────────────────────────────────────── */
  const settings: ReaderSettings = loadSettings();
  let pages: BookPage[] = [];
  let toc: TocEntry[] = [];
  let current = 0;
  let flipBook: FlipBook | null = null;
  let toastTimer = 0;

  const paginator = new Paginator(createMeasureColumn());

  /* ── Render de páginas en las caras ──────────────────── */
  function renderPage(target: 'underlay' | 'front' | 'back', pageIndex: number): void {
    const page = pages[pageIndex];
    const face = faces[target];
    if (!page || !face) return;

    // DOM clonado (nunca innerHTML con datos dinámicos).
    face.content.replaceChildren(...page.nodes.map((n) => n.cloneNode(true)));
    face.content.classList.toggle('chapter-opening', page.isChapterStart);

    face.chapter.textContent = `Capítulo ${page.chapterNumber}`;
    face.pageNum.textContent = String(pageIndex + 1);
    face.location.textContent = page.chapterTitle || '';
    // El título del libro vive en la barra superior, no en cada hoja.

    // Si renderizamos 'front', copiamos lo mismo a la capa estática izquierda
    if (target === 'front') {
      const staticContent = $('static-front-content');
      const staticChapter = $('static-front-chapter');
      const staticPageNum = $('static-front-page-num');
      const staticLocation = $('static-front-location');
      if (staticContent) {
        staticContent.replaceChildren(...page.nodes.map((n) => n.cloneNode(true)));
        staticContent.classList.toggle('chapter-opening', page.isChapterStart);
        if (staticChapter) staticChapter.textContent = `Capítulo ${page.chapterNumber}`;
        if (staticPageNum) staticPageNum.textContent = String(pageIndex + 1);
        if (staticLocation) staticLocation.textContent = page.chapterTitle || '';
      }
    }
  }

  function totalPages(): number {
    return pages.length;
  }

  /* ── Progreso y persistencia ─────────────────────────── */
  let saveTimer = 0;
  function updateProgress(persist = true): void {
    const total = totalPages();
    const percent = total > 1 ? Math.round((current / (total - 1)) * 100) : 100;
    ui.progressFill.style.width = `${percent}%`;
    ui.progressLabel.textContent = `${percent}% completado`;
    const totalPagesEl = document.getElementById('total-pages');
    if (totalPagesEl) totalPagesEl.textContent = String(total);
    const totalPagesFrontEl = document.getElementById('total-pages-front');
    if (totalPagesFrontEl) totalPagesFrontEl.textContent = String(total);
    const staticTotalPagesFrontEl = document.getElementById('static-total-pages-front');
    if (staticTotalPagesFrontEl) staticTotalPagesFrontEl.textContent = String(total);

    const page = pages[current];
    ui.flipLabel.textContent = flipBook?.canGoForward()
      ? `Página ${current + 1} de ${total}`
      : 'Fin de la lectura';

    if (persist) {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        setProgress({
          bookSlug: cfg.bookSlug,
          bookTitle: cfg.bookTitle,
          pageIndex: current,
          totalPages: total,
          percent,
          updatedAt: new Date().toISOString(),
        });
      }, 400);
    }
    void page;
  }

  /* ── Toast ───────────────────────────────────────────── */
  function showToast(text: string): void {
    ui.toastText.textContent = text;
    ui.toast.classList.remove('opacity-0');
    ui.toast.classList.add('opacity-100');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      ui.toast.classList.remove('opacity-100');
      ui.toast.classList.add('opacity-0');
    }, 1600);
  }

  /* ── Marcador ────────────────────────────────────────── */
  function refreshBookmark(): void {
    const mark = getBookmark(cfg.bookSlug);
    const active = mark !== null;
    ui.bookmarkIcon.style.fontVariationSettings = active ? "'FILL' 1" : "'FILL' 0";
    ui.bookmark.classList.toggle('text-primary', active);
    ui.bookmark.setAttribute('aria-pressed', String(active));
  }

  ui.bookmark.addEventListener('click', () => {
    const mark = getBookmark(cfg.bookSlug);
    if (mark) {
      removeBookmark(cfg.bookSlug);
      showToast('Marcador eliminado');
    } else {
      const page = pages[current]!;
      setBookmark({
        bookSlug: cfg.bookSlug,
        bookTitle: cfg.bookTitle,
        pageIndex: current,
        pageNumber: current + 1,
        chapterTitle: page.chapterTitle,
        createdAt: new Date().toISOString(),
      });
      showToast(`Marcador guardado en pág. ${current + 1}`);
    }
    refreshBookmark();
  });

  /* ── Notas ───────────────────────────────────────────── */
  function renderNotes(): void {
    const notes = getNotesForBook(cfg.bookSlug);
    ui.notesCount.textContent = String(notes.length);
    ui.notesList.replaceChildren();

    if (notes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'font-reading text-reading-base italic text-on-surface-variant py-4 text-center';
      empty.textContent = 'Aún no hay anotaciones en este libro.';
      ui.notesList.appendChild(empty);
      return;
    }

    for (const note of notes) {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-lg bg-surface-container-low shadow-sm flex flex-col gap-1';

      const head = document.createElement('div');
      head.className =
        'flex items-center justify-between text-on-surface-variant font-ui text-label-sm uppercase tracking-wider';

      const where = document.createElement('span');
      where.className = 'font-semibold text-primary';
      where.textContent = `Pág. ${note.pageNumber} · ${note.chapterTitle}`;
      const when = document.createElement('span');
      when.textContent = formatDate(note.createdAt);

      const text = document.createElement('p');
      text.className = 'font-reading text-reading-base italic text-on-surface leading-snug whitespace-pre-wrap';
      // SEGURIDAD: textContent, nunca innerHTML (input del usuario).
      text.textContent = note.text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className =
        'self-end font-ui text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-error transition-colors py-1 px-2';
      remove.textContent = 'Eliminar';
      remove.setAttribute('aria-label', `Eliminar nota de la página ${note.pageNumber}`);
      remove.addEventListener('click', () => {
        deleteNote(note.id);
        renderNotes();
        showToast('Nota eliminada');
      });

      head.append(where, when);
      card.append(head, text, remove);
      ui.notesList.appendChild(card);
    }
  }

  ui.noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = ui.noteInput.value.trim();
    if (!raw) return;
    const page = pages[current]!;
    const created = addNote({
      bookSlug: cfg.bookSlug,
      bookTitle: cfg.bookTitle,
      pageIndex: current,
      pageNumber: current + 1,
      chapterTitle: page.chapterTitle,
      text: raw.slice(0, MAX_NOTE_LENGTH),
    });
    ui.noteInput.value = '';
    if (created) {
      renderNotes();
      showToast(`Nota añadida en pág. ${current + 1}`);
    } else {
      showToast('No se pudo guardar la nota (límite alcanzado)');
    }
  });

  /* ── Índice (TOC) ────────────────────────────────────── */
  function renderToc(): void {
    ui.tocList.replaceChildren();
    for (const entry of toc) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-container transition-colors flex items-baseline justify-between gap-3';
      const label = document.createElement('span');
      label.className = 'font-reading text-reading-base text-on-surface';
      label.textContent = `${entry.chapterNumber}. ${entry.chapterTitle}`;
      const pageLabel = document.createElement('span');
      pageLabel.className = 'font-ui text-label-sm uppercase text-on-surface-variant';
      pageLabel.textContent = `pág. ${entry.pageNumber}`;
      btn.append(label, pageLabel);
      btn.addEventListener('click', () => {
        jumpToPage(entry.pageIndex);
        closeDrawers();
      });
      li.appendChild(btn);
      ui.tocList.appendChild(li);
    }
  }

  function closeDrawers(): void {
    ui.tocDrawer.classList.add('hidden');
    ui.notesDrawer.classList.add('hidden');
  }

  ui.tocBtn.addEventListener('click', () => {
    ui.notesDrawer.classList.add('hidden');
    ui.tocDrawer.classList.remove('hidden');
    ui.tocDrawer.querySelector('button')?.focus();
  });
  ui.notesBtn.addEventListener('click', () => {
    ui.tocDrawer.classList.add('hidden');
    ui.notesDrawer.classList.remove('hidden');
    renderNotes();
  });
  ui.closeToc.addEventListener('click', closeDrawers);
  ui.closeNotes.addEventListener('click', closeDrawers);
  [ui.tocDrawer, ui.notesDrawer].forEach((drawer) => {
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeDrawers();
    });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawers();
  });

  /* ── Ajustes de tipografía y papel ───────────────────── */
  function applyPaperTheme(theme: PaperTheme): void {
    const palette = PAPER_THEMES[theme];
    for (const face of Object.values(faces)) {
      face.root.style.backgroundColor = palette.bg;
      face.root.style.color = palette.text;
    }
    const staticFrontBg = $('static-front-bg');
    if (staticFrontBg) {
      staticFrontBg.style.backgroundColor = palette.bg;
      staticFrontBg.style.color = palette.text;
    }
    document.documentElement.style.setProperty('--paper-note-bg', palette.note);
    ui.swatches.forEach((swatch) => {
      const active = swatch.dataset.paper === theme;
      swatch.classList.toggle('ring-2', active);
      swatch.classList.toggle('ring-primary', active);
      swatch.setAttribute('aria-pressed', String(active));
    });
  }

  ui.swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const theme = swatch.dataset.paper as PaperTheme | undefined;
      if (!theme || !(theme in PAPER_THEMES)) return;
      settings.paper = theme;
      saveSettings(settings);
      applyPaperTheme(theme);
    });
  });

  ui.fontInc.addEventListener('click', () => changeFontSize(+2));
  ui.fontDec.addEventListener('click', () => changeFontSize(-2));

  function changeFontSize(delta: number): void {
    const next = Math.min(25, Math.max(17, settings.fontSize + delta));
    if (next === settings.fontSize) return;
    settings.fontSize = next;
    saveSettings(settings);
    void repaginate({ preserve: true });
  }

  /* ── Barra de progreso interactiva ───────────────────── */
  ui.progressRail.addEventListener('click', (e) => {
    const rect = ui.progressRail.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const target = Math.round(ratio * (totalPages() - 1));
    jumpToPage(Math.max(0, Math.min(totalPages() - 1, target)));
  });

  ui.prev.addEventListener('click', () => flipBook?.goPrev());
  ui.next.addEventListener('click', () => flipBook?.goNext());

  /* ── Motor de volteo ─────────────────────────────────── */
  // Salto de página con destino registrado (para onTurn('jump')).
  let pendingJump = -1;
  function jumpToPage(pageIndex: number): void {
    pendingJump = pageIndex;
    flipBook?.jumpTo(pageIndex);
  }

  flipBook = new FlipBook({
    stage,
    underlay,
    flipper,
    front: frontFace,
    back: backFace,
    cornerNext: corners.next,
    cornerPrev: corners.prev,
    effect: settings.effect,
    onTurn: (direction) => {
      if (direction === 'forward') current = Math.min(totalPages() - 1, current + 1);
      else if (direction === 'backward') current = Math.max(0, current - 1);
      else if (pendingJump >= 0) current = Math.max(0, Math.min(totalPages() - 1, pendingJump));
      pendingJump = -1;
      // Re-sincroniza la hoja con la nueva página actual (sin animación).
      flipBook!.sync(current);
      updateProgress();
      if (direction !== 'jump') {
        showToast(`Página ${current + 1} de ${totalPages()}`);
      }
    },
    renderPage,
    getCurrentIndex: () => current,
    getTotalPages: totalPages,
    playSound: () => {
      if (settings.sound) playPageSound();
    },
  });

  /* ── Paginación ──────────────────────────────────────── */
  function createMeasureColumn(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'measure-column';
    el.className = 'reader-body';
    
    // HACK: Copiar el atributo de scope de Astro para heredar el column-gap y estilos
    const frontContent = document.getElementById('front-content');
    if (frontContent) {
      for (const attr of Array.from(frontContent.attributes)) {
        if (attr.name.startsWith('data-astro-cid')) {
          el.setAttribute(attr.name, '');
        }
      }
    }

    el.setAttribute('aria-hidden', 'true');
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    el.style.top = '0';
    el.style.left = '0';
    stage.appendChild(el);
    return el;
  }

  function measureContentArea(): { width: number; height: number } {
    const frontContent = faces.front.content;
    return { width: frontContent.clientWidth, height: frontContent.clientHeight };
  }

  /** Aplica la tipografía elegida a las tres caras del libro. */
  function applyTypography(): void {
    const s = faces.front.content.style;
    s.fontFamily = FONT_STACKS[settings.font].stack;
    s.fontSize = `${settings.fontSize}px`;
    s.lineHeight = String(LINE_SPACINGS[settings.lineSpacing].multiplier);
    s.textAlign = 'justify';
    for (const key of ['underlay', 'back'] as const) {
      const t = faces[key].content.style;
      t.cssText = s.cssText;
    }
    const staticFrontContent = $('static-front-content');
    if (staticFrontContent) {
      staticFrontContent.style.cssText = s.cssText;
    }
  }

  async function repaginate(options: { preserve: boolean }): Promise<void> {
    const previousPercent =
      totalPages() > 1 ? current / (totalPages() - 1) : getProgress(cfg.bookSlug)?.percent ?? 0;

    const { width, height } = measureContentArea();
    applyTypography();
    paginator.applyStyles(settings);

    const measure = document.getElementById('measure-column')!;
    const columns = window.innerWidth >= 1024 ? 2 : 1;
    
    // Configurar measure-column para que sea EXACTAMENTE igual al contenedor real
    measure.style.width = `${width}px`;
    measure.style.height = `${height}px`;
    measure.style.columnCount = String(columns);

    const result = paginator.paginate(cfg.chapters);
    pages = result.pages;
    toc = result.toc;

    if (options.preserve && pages.length > 1) {
      current = Math.min(pages.length - 1, Math.round(previousPercent * (pages.length - 1)));
    }

    renderToc();
    flipBook?.sync(current);
    updateProgress(options.preserve === false);
  }

  /* ── Resize (re-paginado con debounce) ────────────────── */
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      void repaginate({ preserve: true });
    }, 250);
  });

  /* ── Arranque ────────────────────────────────────────── */
  async function start(): Promise<void> {
    ui.barTitle.textContent = cfg.bookTitle;
    applyPaperTheme(settings.paper);
    refreshBookmark();
    renderNotes();

    // Esperar fuentes antes de medir (paginación exacta).
    try {
      await document.fonts.ready;
    } catch {
      /* seguimos con las fuentes disponibles */
    }

    // Restaurar progreso guardado.
    const saved = getProgress(cfg.bookSlug);
    await repaginate({ preserve: false });
    if (saved && saved.totalPages > 0 && pages.length > 1) {
      const restored = Math.min(pages.length - 1, saved.pageIndex);
      if (restored > 0) {
        current = restored;
        flipBook?.sync(current);
        updateProgress(false);
        showToast(`Continuás en pág. ${current + 1}`);
      }
    }
  }

  void start();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return '';
  }
}
