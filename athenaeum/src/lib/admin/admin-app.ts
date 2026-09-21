import type { AdminBook, AdminStats } from './types';
import { processUploadedFile, processUrl, saveBookToServer, deleteBookFromServer } from './file-processor';

interface AdminInit {
  books: AdminBook[];
  stats: AdminStats;
}

interface ChapterEdit {
  title: string;
  content: string;
  pages: number;
}

interface PendingBook {
  rawTitle: string;
  rawAuthor: string;
  rawGenre: string;
  chapters: ChapterEdit[];
  rawContent: string;
}

export function bootAdmin(init: AdminInit): void {
  const grid = document.getElementById('admin-grid')!;
  const statsEl = document.getElementById('admin-stats')!;
  const searchInput = document.getElementById('admin-search') as HTMLInputElement | null;
  const genreFilter = document.getElementById('admin-genre-filter') as HTMLSelectElement | null;
  const addForm = document.getElementById('admin-add-form') as HTMLFormElement | null;
  const filterBar = document.getElementById('admin-filters');
  const uploadArea = document.getElementById('upload-area');
  const uploadInput = document.getElementById('file-input') as HTMLInputElement | null;
  const uploadStatus = document.getElementById('upload-status');

  let isProcessing = false;

  let books = [...init.books];
  let genre = 'todos';
  let query = '';

  /* ── Stats ──────────────────────────────────────── */
  function renderStats(): void {
    const published = books.filter(b => b.status === 'published').length;
    const drafts = books.filter(b => b.status === 'draft').length;
    const totalChapters = books.reduce((s, b) => s + b.chapters, 0);
    const totalWords = books.reduce((s, b) => s + b.estimatedPages * 350, 0);
    statsEl.innerHTML = `
      <div class="stat-card"><span class="stat-num">${books.length}</span><span class="stat-label">Escritos</span></div>
      <div class="stat-card"><span class="stat-num">${published}</span><span class="stat-label">Publicados</span></div>
      <div class="stat-card"><span class="stat-num">${drafts}</span><span class="stat-label">Borradores</span></div>
      <div class="stat-card"><span class="stat-num">${totalChapters}</span><span class="stat-label">Capítulos</span></div>
      <div class="stat-card"><span class="stat-num">${(totalWords / 1000).toFixed(1)}k</span><span class="stat-label">Palabras</span></div>
    `;
  }

  /* ── Render libros ──────────────────────────────── */
  function renderBooks(): void {
    const q = query.trim().toLowerCase();
    const filtered = books.filter(b => {
      const matchGenre = genre === 'todos' || b.genre === genre;
      const matchQuery = q === '' || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q);
      return matchGenre && matchQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="admin-empty"><span class="material-symbols-outlined text-[48px] text-outline/40">library_books</span><p class="font-ui text-body-base text-on-surface-variant mt-2">No hay escritos para mostrar.</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map(b => `
      <article class="admin-card" data-slug="${b.slug}" data-genre="${b.genre}">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-reading text-headline-sm text-on-surface leading-tight truncate">${b.title}</h3>
            <p class="font-ui text-body-sm text-on-surface-variant truncate">${b.author}</p>
          </div>
          <span class="chip shrink-0 ${b.status === 'published' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}">${b.status === 'published' ? 'Publicado' : 'Borrador'}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap mb-3">
          <span class="chip">${b.genre}</span>
          <span class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant">${b.chapters} caps · ~${b.estimatedPages} pág.</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="admin-btn admin-btn-toggle" data-slug="${b.slug}" data-status="${b.status}" type="button" title="${b.status === 'published' ? 'Marcar como borrador' : 'Publicar'}"><span class="material-symbols-outlined text-[18px]">${b.status === 'published' ? 'visibility_off' : 'visibility'}</span></button>
          <button class="admin-btn admin-btn-order" data-slug="${b.slug}" data-direction="up" type="button" title="Subir" ${b.order <= 0 ? 'disabled' : ''}><span class="material-symbols-outlined text-[18px]">arrow_upward</span></button>
          <button class="admin-btn admin-btn-order" data-slug="${b.slug}" data-direction="down" type="button" title="Bajar"><span class="material-symbols-outlined text-[18px]">arrow_downward</span></button>
          <button class="admin-btn admin-btn-delete" data-slug="${b.slug}" data-title="${b.title}" type="button" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </article>
    `).join('');
  }

  /* ── Eventos ─────────────────────────────────────── */
  filterBar?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-genre-filter]');
    if (!btn) return;
    genre = btn.dataset.genreFilter ?? 'todos';
    filterBar.querySelectorAll('[data-genre-filter]').forEach(el => {
      const active = el === btn;
      el.setAttribute('aria-pressed', String(active));
      el.classList.toggle('bg-surface-container-highest', active);
      el.classList.toggle('text-primary', active);
    });
    renderBooks();
  });

  searchInput?.addEventListener('input', () => { query = searchInput.value; renderBooks(); });
  genreFilter?.addEventListener('change', () => { genre = genreFilter.value; renderBooks(); });

  grid?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.admin-btn');
    if (!btn) return;
    const slug = btn.dataset.slug!;

    if (btn.classList.contains('admin-btn-toggle')) {
      const book = books.find(b => b.slug === slug);
      if (book) {
        book.status = book.status === 'published' ? 'draft' : 'published';
        saveBooks(); renderBooks(); renderStats();
        showToast(book.status === 'published' ? `Publicado: ${book.title}` : `Borrador: ${book.title}`);
      }
    }
    if (btn.classList.contains('admin-btn-order')) {
      const direction = btn.dataset.direction;
      const idx = books.findIndex(b => b.slug === slug);
      if (direction === 'up' && idx > 0) {
        [books[idx - 1], books[idx]] = [books[idx], books[idx - 1]];
        books.forEach((b, i) => b.order = i); saveBooks(); renderBooks(); renderStats();
      }
      if (direction === 'down' && idx < books.length - 1) {
        [books[idx], books[idx + 1]] = [books[idx + 1], books[idx]];
        books.forEach((b, i) => b.order = i); saveBooks(); renderBooks(); renderStats();
      }
    }
    if (btn.classList.contains('admin-btn-delete')) {
      const title = btn.dataset.title;
      if (slug && title) {
        if (confirm(`¿Eliminar "${title}"? Esta acción borrará los archivos reales y no se puede deshacer.`)) {
          deleteBookFromServer(slug).then(() => {
            books = books.filter(b => b.slug !== slug);
            saveBooks(); renderBooks(); renderStats();
            showToast(`Eliminado de la estantería: ${title}`);
          }).catch(err => {
            showToast('Error al eliminar en el servidor');
          });
        }
      }
    }
  });

  /* ── Formulario de añadir ────────────────────────── */
  addForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const title = (formData.get('title') as string).trim();
    const author = (formData.get('author') as string).trim();
    const genre = (formData.get('genre') as string).trim();
    const coverPalette = (formData.get('coverPalette') as string) || 'terracotta';
    if (!title || !author || !genre) { showToast('Completa título, autor y género.'); return; }
    const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (books.find(b => b.slug === slug)) { showToast('Ya existe un escrito con ese slug.'); return; }
    const newBook: AdminBook = {
      slug, title, author, genre, status: 'draft', order: books.length,
      chapters: 0, estimatedPages: 0, readingMinutes: 0,
      coverPalette: coverPalette as 'terracotta' | 'olive' | 'burgundy' | 'ivory', tags: [],
    };
    books.push(newBook); saveBooks(); renderBooks(); renderStats(); addForm.reset();
    showToast(`Escrito "${title}" creado como borrador.`);
  });

  /* ── Persistencia ────────────────────────────────── */
  function saveBooks(): void {
    try { localStorage.setItem('athenaeum:admin-books', JSON.stringify(books)); } catch { /* storage lleno */ }
  }
  function loadBooks(): AdminBook[] {
    try { const saved = localStorage.getItem('athenaeum:admin-books'); if (saved) return JSON.parse(saved); } catch { /* corrupto */ }
    return [...init.books];
  }

  /* ── Toast ───────────────────────────────────────── */
  function showToast(text: string): void {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-toast';
      toast.className = 'pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-300 bg-inverse-surface/90 text-inverse-on-surface px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50 font-ui text-label-sm';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    window.clearTimeout((toast as any)._timer);
    (toast as any)._timer = window.setTimeout(() => { toast!.classList.remove('opacity-100'); toast!.classList.add('opacity-0'); }, 2500);
  }

  /* ── Modal de edición de libro ────────────────────── */
  function showBookModal(bookData: PendingBook): void {
    const existing = document.getElementById('book-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'book-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';

    const defaultTitle = bookData.rawTitle.replace(/^#+\s*/, '').trim() || 'Libro Sin Título';
    const defaultAuthor = bookData.rawAuthor || '';
    const defaultGenre = bookData.rawGenre || 'General';

    let chaptersHtml = bookData.chapters.map((ch, i) => `
      <div class="chapter-edit-card" data-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-ui text-label-sm uppercase text-primary font-bold w-8">Cap ${i + 1}</span>
          <input type="text" class="chapter-title-input flex-1 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" value="${ch.title.replace(/"/g, '&quot;')}" placeholder="Título del capítulo" />
          <input type="number" class="chapter-pages-input w-20 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface text-center" value="${ch.pages}" placeholder="Págs" min="0" />
          <button class="chapter-remove-btn admin-btn-delete" data-idx="${i}" type="button" title="Eliminar capítulo"><span class="material-symbols-outlined text-[18px]">close</span></button>
        </div>
        <textarea class="chapter-content-input w-full h-20 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface resize-none" placeholder="Contenido del capítulo (opcional)">${ch.content}</textarea>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="bg-surface-container-highest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" role="dialog" aria-label="Editar libro">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-reading text-headline-sm text-on-surface">Editar libro</h2>
          <button id="modal-close" class="admin-btn" type="button" title="Cerrar"><span class="material-symbols-outlined text-[24px]">close</span></button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="sm:col-span-2">
            <label class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Título</label>
            <input type="text" id="modal-title" class="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" value="${defaultTitle}" />
          </div>
          <div>
            <label class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Autor</label>
            <input type="text" id="modal-author" class="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" value="${defaultAuthor}" />
          </div>
          <div>
            <label class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Género</label>
            <input type="text" id="modal-genre" class="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" value="${defaultGenre}" />
          </div>
          <div>
            <label class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Año</label>
            <input type="number" id="modal-year" class="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" value="${new Date().getFullYear()}" />
          </div>
          <div>
            <label class="font-ui text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Sinopsis</label>
            <textarea id="modal-synopsis" class="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface resize-none h-20" placeholder="Breve descripción..."></textarea>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-ui text-label-md uppercase tracking-wider text-primary">Capítulos</h3>
            <button id="btn-add-chapter" class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-ui text-label-sm uppercase hover:bg-primary-fixed transition-colors" type="button">+ Agregar capítulo</button>
          </div>
          <div id="chapters-container" class="space-y-3">${chaptersHtml}</div>
        </div>

        <div id="modal-error" class="hidden font-ui text-body-sm text-error mb-4"></div>

        <div class="flex gap-3 justify-end">
          <button id="modal-cancel" class="px-5 py-2.5 rounded-lg bg-surface-container border border-outline-variant/40 font-ui text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors" type="button">Cancelar</button>
          <button id="modal-generate" class="px-5 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-ui text-label-sm uppercase tracking-wider hover:bg-secondary-fixed transition-colors" type="button">Generar ZIP</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = (): void => { modal.remove(); };

    modal.querySelector('#modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('#modal-cancel')?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    /* ── Agregar capítulo ── */
    modal.querySelector('#btn-add-chapter')?.addEventListener('click', () => {
      const container = document.getElementById('chapters-container');
      const idx = container?.children.length || 0;
      const card = document.createElement('div');
      card.className = 'chapter-edit-card';
      card.dataset.idx = String(idx);
      card.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="font-ui text-label-sm uppercase text-primary font-bold w-8">Cap ${idx + 1}</span>
          <input type="text" class="chapter-title-input flex-1 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface" placeholder="Título del capítulo" />
          <input type="number" class="chapter-pages-input w-20 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface text-center" value="0" placeholder="Págs" min="0" />
          <button class="chapter-remove-btn admin-btn-delete" data-idx="${idx}" type="button" title="Eliminar capítulo"><span class="material-symbols-outlined text-[18px]">close</span></button>
        </div>
        <textarea class="chapter-content-input w-full h-20 px-2 py-1.5 rounded bg-surface-container-lowest border border-outline-variant/40 focus:border-primary outline-none font-ui text-body-sm text-on-surface resize-none" placeholder="Contenido del capítulo (opcional)"></textarea>
      `;
      container?.appendChild(card);

      card.querySelector('.chapter-remove-btn')?.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.chapter-remove-btn');
        if (btn) {
          card.remove();
          renumberChapters();
        }
      });
    });

    /* ── Eliminar capítulo ── */
    modal.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chapter-remove-btn');
      if (btn) {
        btn.closest('.chapter-edit-card')?.remove();
        renumberChapters();
      }
    });

    function renumberChapters(): void {
      const container = document.getElementById('chapters-container');
      container?.querySelectorAll('.chapter-edit-card').forEach((card, i) => {
        const label = card.querySelector('.font-ui.text-label-sm') as HTMLElement;
        if (label) label.textContent = `Cap ${i + 1}`;
        const removeBtn = card.querySelector('.chapter-remove-btn') as HTMLButtonElement;
        if (removeBtn) removeBtn.dataset.idx = String(i);
      });
    }

    /* ── Generar ZIP ── */
    modal.querySelector('#modal-generate')?.addEventListener('click', async () => {
      const titleEl = document.getElementById('modal-title') as HTMLInputElement | null;
      const authorEl = document.getElementById('modal-author') as HTMLInputElement | null;
      const genreEl = document.getElementById('modal-genre') as HTMLInputElement | null;
      const yearEl = document.getElementById('modal-year') as HTMLInputElement | null;
      const synopsisEl = document.getElementById('modal-synopsis') as HTMLTextAreaElement | null;

      const title = titleEl?.value.trim() || 'Libro Sin Título';
      const author = authorEl?.value.trim() || 'Autor Desconocido';
      const genre = genreEl?.value.trim() || 'General';
      const year = parseInt((yearEl?.value || String(new Date().getFullYear())).replace(/\D/g, ''), 10) || new Date().getFullYear();
      const synopsis = synopsisEl?.value.trim() || '';
      const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (books.find(b => b.slug === slug)) {
        const errEl = document.getElementById('modal-error');
        if (errEl) { errEl.textContent = 'Ya existe un escrito con ese nombre.'; errEl.classList.remove('hidden'); }
        return;
      }

      const container = document.getElementById('chapters-container');
      const chapterCards = container?.querySelectorAll('.chapter-edit-card') || [];
      const chapters: ChapterEdit[] = [];
      chapterCards.forEach((card) => {
        const tInput = card.querySelector('.chapter-title-input') as HTMLInputElement | null;
        const pInput = card.querySelector('.chapter-pages-input') as HTMLInputElement | null;
        const cInput = card.querySelector('.chapter-content-input') as HTMLTextAreaElement | null;
        if (tInput && tInput.value.trim()) {
          chapters.push({
            title: tInput.value.trim(),
            content: cInput?.value || '',
            pages: parseInt(pInput?.value || '0', 10) || 0,
          });
        }
      });

      if (chapters.length === 0) {
        const errEl = document.getElementById('modal-error');
        if (errEl) { errEl.textContent = 'Debe haber al menos un capítulo.'; errEl.classList.remove('hidden'); }
        return;
      }

      books.push({
        slug, title, author, genre, status: 'draft',
        order: books.length, chapters: chapters.length,
        estimatedPages: chapters.reduce((s, c) => s + c.pages, 0) || chapters.length * 5,
        readingMinutes: chapters.length * 10,
        coverPalette: 'terracotta', tags: [],
      });

      await saveBookToServer(title, author, year, genre, synopsis, chapters);
      saveBooks();
      renderBooks();
      renderStats();
      closeModal();
      showToast(`"${title}" generado con ${chapters.length} capítulo(s).`);
    });
  }

  /* ── Carga de archivos con modal ──────────────────── */
  async function handleFileUpload(file: File): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    if (uploadStatus) {
      uploadStatus.textContent = '⏳ Procesando archivo...';
      uploadStatus.className = 'font-ui text-body-sm text-primary';
    }

    try {
      const { book } = await processUploadedFile(file);

      const pending: PendingBook = {
        rawTitle: book.title,
        rawAuthor: book.author,
        rawGenre: book.genre || 'General',
        chapters: book.chapters,
        rawContent: book.rawContent,
      };

      showBookModal(pending);
      showToast(`"${book.title}" cargado. Editá los detalles antes de generar.`);
    } catch (err: any) {
      if (uploadStatus) {
        uploadStatus.textContent = `❌ Error: ${err.message}`;
        uploadStatus.className = 'font-ui text-body-sm text-error';
      }
      showToast('Error al procesar el archivo.');
    } finally {
      isProcessing = false;
      setTimeout(() => { if (uploadStatus) uploadStatus.textContent = ''; }, 8000);
    }
  }

  /* ── Procesamiento por URL con modal ─────────── */
  async function handleUrlSubmit(url: string): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    if (uploadStatus) {
      uploadStatus.textContent = '⏳ Descargando y procesando desde URL…';
      uploadStatus.className = 'font-ui text-body-sm text-primary';
    }

    try {
      const { book } = await processUrl(url);
      showBookModal({
        rawTitle: book.title,
        rawAuthor: book.author,
        rawGenre: book.genre || 'General',
        chapters: book.chapters,
        rawContent: book.rawContent,
      });
      showToast(`"${book.title}" cargado desde enlace. Editá los detalles antes de generar.`);
    } catch (err: any) {
      if (uploadStatus) {
        uploadStatus.textContent = `❌ Error: ${err.message}`;
        uploadStatus.className = 'font-ui text-body-sm text-error';
      }
      showToast('Error al procesar la URL.');
    } finally {
      isProcessing = false;
      setTimeout(() => { if (uploadStatus) uploadStatus.textContent = ''; }, 8000);
    }
  }

  /* ── Eventos de carga ──────────────────────────── */
  uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('border-primary', 'bg-surface-container-high'); });
  uploadArea?.addEventListener('dragleave', () => { uploadArea.classList.remove('border-primary', 'bg-surface-container-high'); });
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary', 'bg-surface-container-high');
    const file = e.dataTransfer?.files[0];
    if (file) handleFileUpload(file);
  });
  uploadInput?.addEventListener('change', () => { const file = uploadInput.files?.[0]; if (file) handleFileUpload(file); uploadInput.value = ''; });

  /* ── Evento de importación por URL ───── */
  const btnUrlImport = document.getElementById('btn-url-import');
  const urlInput = document.getElementById('url-input') as HTMLInputElement | null;
  const urlStatus = document.getElementById('url-status');

  btnUrlImport?.addEventListener('click', () => {
    const url = urlInput?.value.trim();
    if (!url) {
      if (urlStatus) { urlStatus.textContent = 'Ingresá un enlace válido.'; urlStatus.className = 'font-ui text-body-sm text-error'; }
      return;
    }
    handleUrlSubmit(url).then(() => { if (urlInput) urlInput.value = ''; setTimeout(() => { if (urlStatus) urlStatus.textContent = ''; }, 8000); });
  });
  urlInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnUrlImport?.click(); });

  /* ── Inicializar ─────────────────────────────────── */
  books = loadBooks();
  renderStats();
  renderBooks();

  const genres = [...new Set(books.map(b => b.genre))].sort();
  if (genreFilter) {
    genreFilter.innerHTML = `<option value="todos">Todos (${books.length})</option>` +
      genres.map(g => `<option value="${g}">${g} (${books.filter(b => b.genre === g).length})</option>`).join('');
  }
}
