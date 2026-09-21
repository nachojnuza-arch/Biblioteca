/**
 * Cuaderno: lista global de notas del lector (localStorage),
 * agrupadas por libro, con borrado individual.
 *
 * Seguridad: el texto de las notas es input del usuario y se renderiza
 * exclusivamente con createTextNode/textContent (nunca innerHTML).
 */
import { getNotes, deleteNote } from '@/lib/reader/storage';

export function bootNotebook(): void {
  const list = document.getElementById('notebook-list');
  const empty = document.getElementById('notebook-empty');
  const count = document.getElementById('notebook-count');
  if (!list || !empty) return;

  const render = (): void => {
    const notes = getNotes();
    list.replaceChildren();

    if (count) count.textContent = String(notes.length);

    if (notes.length === 0) {
      empty.hidden = false;
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;

    // Agrupar por libro conservando el orden de la lista (más recientes primero).
    const groups = new Map<string, typeof notes>();
    for (const note of notes) {
      const arr = groups.get(note.bookSlug) ?? [];
      arr.push(note);
      groups.set(note.bookSlug, arr);
    }

    for (const [slug, groupNotes] of groups) {
      const section = document.createElement('section');
      section.className = 'p-4 rounded-lg bg-surface-container-low border border-outline-variant/25';

      const head = document.createElement('div');
      head.className = 'flex items-center justify-between gap-3 mb-3';

      const title = document.createElement('h2');
      title.className = 'font-reading text-headline-sm text-on-surface';
      title.textContent = groupNotes[0]!.bookTitle;

      const open = document.createElement('a');
      open.href = `/leer/${encodeURI(slug)}`; // slug validado contra colección al construirse
      open.className =
        'font-ui text-label-sm uppercase tracking-wider text-primary hover:text-tertiary transition-colors shrink-0';
      open.textContent = 'Abrir lector';

      head.append(title, open);
      section.appendChild(head);

      for (const note of groupNotes) {
        const card = document.createElement('article');
        card.className =
          'p-3 rounded-lg bg-surface-container-lowest border-l-4 border-primary shadow-sm flex flex-col gap-1.5 mb-2 last:mb-0';

        const meta = document.createElement('div');
        meta.className =
          'flex items-center justify-between text-on-surface-variant font-ui text-label-sm uppercase tracking-wider';

        const where = document.createElement('span');
        where.className = 'font-semibold text-primary';
        where.textContent = `Pág. ${note.pageNumber} · ${note.chapterTitle}`;

        const when = document.createElement('time');
        when.dateTime = note.createdAt;
        when.textContent = formatDate(note.createdAt);

        const text = document.createElement('p');
        text.className =
          'font-reading text-reading-base italic text-on-surface leading-snug whitespace-pre-wrap';
        text.textContent = note.text;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className =
          'self-start font-ui text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-error transition-colors py-1 px-2 -ml-2';
        remove.textContent = 'Eliminar';
        remove.setAttribute('aria-label', 'Eliminar nota');
        remove.addEventListener('click', () => {
          deleteNote(note.id);
          render();
        });

        meta.append(where, when);
        card.append(meta, text, remove);
        section.appendChild(card);
      }

      list.appendChild(section);
    }
  };

  render();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date(iso));
  } catch {
    return '';
  }
}
