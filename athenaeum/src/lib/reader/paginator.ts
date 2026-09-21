/**
 * Motor de paginación Athenaeum.
 *
 * Divide el HTML de los capítulos en páginas midiendo el renderizado real
 * en un contenedor oculto con LOS MISMOS ESTILOS EXACTOS que la hoja del lector.
 */
import type { BookPage, ChapterDoc, TocEntry } from './types';
import { FONT_STACKS, LINE_SPACINGS, type ReaderSettings } from './settings';

const SPLITTABLE = new Set(['P', 'BLOCKQUOTE', 'LI']);

export interface PaginationResult {
  pages: BookPage[];
  toc: TocEntry[];
}

export class Paginator {
  private measureEl: HTMLElement;

  constructor(measureEl: HTMLElement) {
    this.measureEl = measureEl;
  }

  applyStyles(settings: ReaderSettings): void {
    const s = this.measureEl.style;
    s.fontFamily = FONT_STACKS[settings.font].stack;
    s.fontSize = `${settings.fontSize}px`;
    s.lineHeight = String(LINE_SPACINGS[settings.lineSpacing].multiplier);
    s.textAlign = 'justify';
  }

  paginate(chapters: ChapterDoc[]): PaginationResult {
    const pages: BookPage[] = [];
    const toc: TocEntry[] = [];

    chapters.forEach((chapter, chapterIndex) => {
      const template = document.createElement('template');
      template.innerHTML = chapter.html;
      const blocks = [...template.content.childNodes].filter(
        (n): n is Element => n.nodeType === Node.ELEMENT_NODE,
      );

      let currentPageNodes: Node[] = [];
      const chapterStartIndex = pages.length;

      const flush = () => {
        if (currentPageNodes.length === 0) return;
        pages.push({
          index: pages.length,
          chapterIndex,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          location: chapter.location,
          nodes: currentPageNodes,
          isChapterStart: pages.length === chapterStartIndex,
        });
        currentPageNodes = [];
      };

      currentPageNodes.push(buildChapterHeader(chapter));
      if (!this.fitsInContainer(currentPageNodes)) {
         flush(); // Si por algún motivo el header no entra (rarísimo), forzar.
      }

      let i = 0;
      while (i < blocks.length) {
        const block = blocks[i]!;
        const clone = block.cloneNode(true) as Element;
        
        if (this.fitsInContainer([...currentPageNodes, clone])) {
          currentPageNodes.push(clone);
          i++;
          continue;
        }

        // El bloque no entra entero.
        if (currentPageNodes.length === 0) {
          // La página está vacía pero el bloque es más grande que el contenedor entero.
          if (SPLITTABLE.has(block.tagName)) {
            const split = this.splitBlock(currentPageNodes, clone);
            if (split.fits) {
              currentPageNodes.push(split.fits);
              flush();
              if (split.rest) {
                blocks[i] = split.rest;
              } else {
                i++;
              }
              continue;
            }
          }
          // No se puede partir o falló, forzamos su inserción
          currentPageNodes.push(clone);
          flush();
          i++;
          continue;
        }

        // La página no está vacía.
        if (SPLITTABLE.has(block.tagName)) {
          const split = this.splitBlock(currentPageNodes, clone);
          if (split.fits) {
            currentPageNodes.push(split.fits);
            flush();
            if (split.rest) {
              blocks[i] = split.rest;
            } else {
              i++;
            }
            continue;
          }
        }

        // Si no es partible o no cupo ni un fragmento (split.fits == null),
        // cerramos la página y lo intentamos en la siguiente.
        flush();
      }

      flush();
      toc.push({
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        location: chapter.location,
        pageIndex: chapterStartIndex,
        pageNumber: chapterStartIndex + 1,
      });
    });

    return { pages, toc };
  }

  private fitsInContainer(nodes: Node[]): boolean {
    const m = this.measureEl;
    m.replaceChildren(...nodes.map((n) => n.cloneNode(true)));
    
    // 1. Chequeo clásico de scroll (funciona bien en Chrome/Safari)
    if (m.scrollWidth > m.clientWidth + 2 || m.scrollHeight > m.clientHeight + 2) {
      return false;
    }

    // 2. Fallback robusto para Firefox / Safari antiguo
    // Revisamos la posición final (bounding box) de cada elemento generado
    const containerRect = m.getBoundingClientRect();
    for (const child of Array.from(m.children)) {
      const rect = child.getBoundingClientRect();
      // Si la caja del elemento termina más abajo o más a la derecha que el contenedor
      if (rect.bottom > containerRect.bottom + 2 || rect.right > containerRect.right + 2) {
        return false;
      }
    }

    return true;
  }

  private splitBlock(
    currentPageNodes: Node[],
    block: Element
  ): { fits: Element | null; rest: Element | null } {
    if (this.fitsInContainer([...currentPageNodes, block])) {
        return { fits: block.cloneNode(true) as Element, rest: null };
    }

    const working = block.cloneNode(true) as Element;
    const range = document.createRange();
    range.selectNodeContents(working);

    const totalChars = range.toString().length;
    if (totalChars === 0) return { fits: null, rest: block.cloneNode(true) as Element };

    let lo = 0;
    let hi = totalChars;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.fitsUpTo(currentPageNodes, working, mid)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    let cut = best;
    if (cut < totalChars) {
      const text = block.textContent ?? '';
      const lastSpace = text.lastIndexOf(' ', cut);
      if (lastSpace > 0) cut = lastSpace;
    }
    if (cut <= 0) return { fits: null, rest: block.cloneNode(true) as Element };

    const workRange = document.createRange();
    workRange.selectNodeContents(working);
    const boundary = findBoundary(working, cut);
    if (!boundary) return { fits: null, rest: block.cloneNode(true) as Element };
    workRange.setStart(boundary.node, boundary.offset);
    const restFragment = workRange.extractContents();

    if (this.fitsInContainer([...currentPageNodes, working])) {
      const rest = block.cloneNode(false) as Element;
      rest.appendChild(restFragment);
      if ((rest.textContent ?? '').trim().length === 0) {
        return { fits: working, rest: null };
      }
      return { fits: working, rest };
    }

    // Fallback: Si al recortar en un espacio el texto misteriosamente ocupa más alto 
    // y ya no entra, usamos el corte en 'best' que sabemos que SÍ entraba.
    const fallbackWorking = block.cloneNode(true) as Element;
    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(fallbackWorking);
    const fallbackBoundary = findBoundary(fallbackWorking, best);
    if (fallbackBoundary) {
      fallbackRange.setStart(fallbackBoundary.node, fallbackBoundary.offset);
      const fallbackRestFragment = fallbackRange.extractContents();
      
      if (this.fitsInContainer([...currentPageNodes, fallbackWorking])) {
        const rest = block.cloneNode(false) as Element;
        rest.appendChild(fallbackRestFragment);
        if ((rest.textContent ?? '').trim().length === 0) return { fits: fallbackWorking, rest: null };
        return { fits: fallbackWorking, rest };
      }
    }

    return { fits: null, rest: block.cloneNode(true) as Element };
  }

  private fitsUpTo(currentPageNodes: Node[], el: Element, offset: number): boolean {
    const clone = el.cloneNode(true) as Element;
    const boundary = findBoundary(clone, offset);
    if (!boundary) return false;
    
    const range = document.createRange();
    range.selectNodeContents(clone);
    range.setStart(boundary.node, boundary.offset);
    range.deleteContents();
    
    return this.fitsInContainer([...currentPageNodes, clone]);
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

function findBoundary(root: Element, offset: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
    node = walker.nextNode();
  }
  const last = lastTextNode(root);
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
}

function lastTextNode(root: Element): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  let n = walker.nextNode();
  while (n) {
    last = n as Text;
    n = walker.nextNode();
  }
  return last;
}

function buildChapterHeader(chapter: ChapterDoc): Node {
  const wrap = document.createElement('header');
  wrap.className = 'chapter-head';
  wrap.innerHTML =
    '<span class="chapter-kicker"></span>' +
    '<h2 class="chapter-title"></h2>' +
    '<div class="deckle-divider" aria-hidden="true"><span class="material-symbols-outlined text-[14px]">auto_stories</span></div>';
  (wrap.querySelector('.chapter-kicker') as HTMLElement).textContent = `Capítulo ${toRoman(chapter.number)}`;
  (wrap.querySelector('.chapter-title') as HTMLElement).textContent = chapter.title;
  return wrap;
}

export function toRoman(n: number): string {
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rest = n;
  for (const [value, symbol] of table) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out || 'I';
}
