/**
 * Hub de Lectura: muestra los libros con progreso guardado
 * ("continuar leyendo") y el resto de la biblioteca para empezar.
 */
import { getAllProgress } from '@/lib/reader/storage';

interface LecturaInit {
  books: Array<{ slug: string; title: string; author: string; subtitle: string }>;
}

export function bootLectura(init: LecturaInit): void {
  const continueList = document.getElementById('continue-list');
  const continueSection = document.getElementById('continue-section');
  const startGrid = document.getElementById('start-grid');
  if (!continueList || !continueSection || !startGrid) return;

  const known = new Map(init.books.map((b) => [b.slug, b]));
  const progress = Object.values(getAllProgress())
    .filter((p) => known.has(p.bookSlug))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const renderContinue = (): void => {
    continueList.replaceChildren();
    continueSection.classList.toggle('hidden', progress.length === 0);

    for (const p of progress) {
      const meta = known.get(p.bookSlug)!;
      const card = document.createElement('article');
      card.className =
        'relative p-4 rounded-lg bg-surface-container-low border border-outline-variant/30 overflow-hidden';

      const bar = document.createElement('div');
      bar.className = 'absolute left-0 top-0 bottom-0 w-1 bg-primary';
      bar.setAttribute('aria-hidden', 'true');

      const head = document.createElement('div');
      head.className = 'flex items-start justify-between gap-4';

      const info = document.createElement('div');
      info.className = 'min-w-0';
      const kicker = document.createElement('span');
      kicker.className = 'font-ui text-label-sm uppercase tracking-widest text-primary';
      kicker.textContent = 'Continuar';
      const title = document.createElement('h3');
      title.className = 'font-reading text-headline-md text-on-surface leading-tight truncate';
      title.textContent = meta.title;
      const author = document.createElement('p');
      author.className = 'font-ui text-body-sm text-on-surface-variant truncate';
      author.textContent = `${meta.author} · ${meta.subtitle}`;
      info.append(kicker, title, author);

      const pct = document.createElement('p');
      pct.className = 'font-ui text-label-sm font-semibold text-primary shrink-0 pt-1';
      pct.textContent = `${p.percent}%`;

      head.append(info, pct);
      card.append(bar, head);

      const rail = document.createElement('div');
      rail.className =
        'mt-3 h-1.5 rounded-full bg-surface-container-high overflow-hidden';
      rail.setAttribute('role', 'progressbar');
      rail.setAttribute('aria-label', `Progreso de ${meta.title}`);
      rail.setAttribute('aria-valuemin', '0');
      rail.setAttribute('aria-valuemax', '100');
      const fill = document.createElement('div');
      fill.className = 'h-full bg-primary rounded-full transition-all duration-500';
      fill.style.width = `${p.percent}%`;
      rail.appendChild(fill);
      card.appendChild(rail);

      const actions = document.createElement('div');
      actions.className = 'mt-3 flex items-center gap-2';
      const resume = document.createElement('a');
      resume.href = `/leer/${p.bookSlug}`;
      resume.className =
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-ui text-label-md uppercase tracking-wider shadow-md hover:bg-primary-container transition-colors';
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined text-[17px]';
      icon.textContent = 'bookmark';
      icon.setAttribute('aria-hidden', 'true');
      resume.append(icon, document.createTextNode('Reanudar'));
      actions.appendChild(resume);
      card.appendChild(actions);

      continueList.appendChild(card);
    }
  };

  const renderStart = (): void => {
    const started = new Set(progress.map((p) => p.bookSlug));
    const pending = init.books.filter((b) => !started.has(b.slug));
    startGrid.classList.toggle('hidden', pending.length === 0);
    startGrid.replaceChildren();

    for (const meta of pending) {
      const a = document.createElement('a');
      a.href = `/leer/${meta.slug}`;
      a.className =
        'flex items-center justify-between gap-3 p-4 rounded-lg bg-surface-container-low border border-outline-variant/25 hover:border-primary/40 hover:bg-surface-container transition-colors';
      const info = document.createElement('div');
      info.className = 'min-w-0';
      const title = document.createElement('h3');
      title.className = 'font-reading text-headline-sm text-on-surface truncate';
      title.textContent = meta.title;
      const sub = document.createElement('p');
      sub.className = 'font-ui text-body-sm text-on-surface-variant truncate';
      sub.textContent = `${meta.author} · ${meta.subtitle}`;
      info.append(title, sub);
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined text-[20px] text-primary shrink-0';
      icon.textContent = 'chevron_right';
      icon.setAttribute('aria-hidden', 'true');
      a.append(info, icon);
      startGrid.appendChild(a);
    }
  };

  renderContinue();
  renderStart();
}
