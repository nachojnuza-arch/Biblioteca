/**
 * Motor de volteo de hojas Athenaeum.
 *
 * Escenario de libro con tres capas (técnica clásica de flipbook CSS 3D):
 *
 *   ┌─ underlay (página N+1, base estática)
 *   ├─ flipper ─┬─ front  (página N,     visible con rotateY(0))
 *   │           └─ back   (página N+1,   visible con rotateY(-180))
 *
 * flipForward:  front(N) → back(N+1); al terminar, N se convierte en N+1
 *               y el flipper se re-sincroniza sin transición visible.
 * flipBackward: se monta la hoja en estado volteado (back = N, front = N-1)
 *               y se anima -180° → 0°, revelando la página anterior.
 *
 * Efectos alternativos (ajustes): 'slide' y 'fade' para usuarios que
 * prefieren (o necesitan, por accesibilidad) un cambio menos físico.
 */
import type { FlipEffect } from './settings';

export interface FlipBookOptions {
  /** Contenedor del escenario (mide gestos de swipe) */
  stage: HTMLElement;
  /** Página base (capa inferior) */
  underlay: HTMLElement;
  /** Hoja que rota */
  flipper: HTMLElement;
  /** Cara frontal de la hoja */
  front: HTMLElement;
  /** Cara trasera de la hoja (pre-rotada 180°) */
  back: HTMLElement;
  /** Esquina interactiva para avanzar */
  cornerNext: HTMLElement;
  /** Esquina interactiva para retroceder (en la cara trasera) */
  cornerPrev: HTMLElement;
  effect: FlipEffect;
  /** Se llama al confirmarse el cambio de página (ya renderizada) */
  onTurn: (direction: 'forward' | 'backward' | 'jump') => void;
  /** Se llama para pedir el render de una página en una cara */
  renderPage: (target: 'underlay' | 'front' | 'back', pageIndex: number) => void;
  /** Índice de página actual */
  getCurrentIndex: () => number;
  /** Total de páginas (para bloquear en los extremos) */
  getTotalPages: () => number;
  /** Reproducir el sonido de papel */
  playSound: () => void;
  /** Duración base del efecto 3D en ms */
  flipDuration?: number;
}

const FLIP_MS = 850;
const SLIDE_MS = 320;
const REDUCED_MS = 200;

export class FlipBook {
  private opts: FlipBookOptions;
  private animating = false;
  private effect: FlipEffect;
  private prefersReduced = false;
  private cleanupFns: Array<() => void> = [];

  constructor(opts: FlipBookOptions) {
    this.opts = opts;
    this.effect = opts.effect;
    this.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bindInteractions();
  }

  setEffect(effect: FlipEffect): void {
    this.effect = effect;
  }

  get isAnimating(): boolean {
    return this.animating;
  }

  /** ¿Se puede avanzar desde la página actual? */
  canGoForward(): boolean {
    return this.opts.getCurrentIndex() < this.opts.getTotalPages() - 1;
  }

  /** ¿Se puede retroceder? */
  canGoBackward(): boolean {
    return this.opts.getCurrentIndex() > 0;
  }

  goNext(): void {
    if (this.animating || !this.canGoForward()) return;
    this.animating = true;
    this.opts.playSound();
    const current = this.opts.getCurrentIndex();
    const next = current + 1;

    this.opts.renderPage('front', current);
    this.opts.renderPage('back', next);
    this.opts.renderPage('underlay', next);

    const done = () => {
      this.finishAnimation();
      this.opts.onTurn('forward');
    };

    switch (this.effectiveEffect()) {
      case 'slide':
        this.animateSlide('forward', done);
        break;
      case 'fade':
        this.animateFade(done);
        break;
      default:
        this.animate3D('forward', done);
    }
  }

  goPrev(): void {
    if (this.animating || !this.canGoBackward()) return;
    this.animating = true;
    this.opts.playSound();
    const current = this.opts.getCurrentIndex();
    const prev = current - 1;

    this.opts.renderPage('underlay', prev);
    this.opts.renderPage('back', current);
    this.opts.renderPage('front', prev);

    const done = () => {
      this.finishAnimation();
      this.opts.onTurn('backward');
    };

    switch (this.effectiveEffect()) {
      case 'slide':
        this.animateSlide('backward', done);
        break;
      case 'fade':
        this.animateFade(done);
        break;
      default:
        this.animate3D('backward', done);
    }
  }

  /** Salto directo (índice, marcador): sin animación física. */
  jumpTo(pageIndex: number): void {
    if (this.animating) return;
    const total = this.opts.getTotalPages();
    const clamped = Math.max(0, Math.min(total - 1, pageIndex));
    this.opts.renderPage('underlay', Math.min(total - 1, clamped + 1));
    this.opts.renderPage('front', clamped);
    this.opts.renderPage('back', Math.min(total - 1, clamped + 1));
    this.opts.onTurn('jump');
  }

  /** Sincroniza las tres caras con la página actual (sin animar). */
  sync(pageIndex: number): void {
    const total = this.opts.getTotalPages();
    const next = Math.min(total - 1, pageIndex + 1);
    this.opts.renderPage('underlay', next);
    this.opts.renderPage('front', pageIndex);
    this.opts.renderPage('back', next);
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  /* ── Internos ─────────────────────────────────────────── */

  private effectiveEffect(): FlipEffect {
    // Accesibilidad: movimiento reducido anula el 3D incluso si el usuario
    // eligió "flip3d" manualmente (la preferencia del sistema gana).
    return this.prefersReduced && this.effect === 'flip3d' ? 'fade' : this.effect;
  }

  private finishAnimation(): void {
    this.animating = false;
  }

  private animate3D(direction: 'forward' | 'backward', done: () => void): void {
    const { flipper } = this.opts;
    flipper.style.transition = 'none';
    // Estado inicial instantáneo.
    if (direction === 'forward') {
      this.setTransform('rotateY(0deg)');
    } else {
      this.setTransform('rotateY(-180deg)');
    }
    void flipper.offsetWidth; // forzar reflow antes de animar

    const animClass = direction === 'forward' ? 'page-turn-fwd' : 'page-turn-bwd';
    flipper.classList.remove('page-turn-fwd', 'page-turn-bwd');
    flipper.classList.add(animClass);
    this.withTimeout(FLIP_MS, () => {
      flipper.classList.remove(animClass);
      done(); // sync() is called here, updating static-front and front to the new page
      this.setTransform('rotateY(0deg)'); // snap back seamlessly
    });
  }

  private animateSlide(direction: 'forward' | 'backward', done: () => void): void {
    const { flipper, underlay } = this.opts;
    const shift = direction === 'forward' ? -100 : 100;
    flipper.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.3, 0.8, 0.4, 1)`;
    this.setTransform('rotateY(0deg)');
    flipper.style.transform = `translateX(${shift}%)`;
    flipper.style.opacity = '0.92';
    underlay.style.transition = `opacity ${SLIDE_MS}ms ease`;
    void flipper.offsetWidth;
    this.withTimeout(SLIDE_MS, () => {
      flipper.style.opacity = '';
      flipper.style.transition = 'none';
      flipper.style.transform = '';
      underlay.style.transition = '';
      done();
    });
  }

  private animateFade(done: () => void): void {
    const { flipper } = this.opts;
    this.setTransform('rotateY(0deg)');
    flipper.style.transition = `opacity ${REDUCED_MS}ms ease`;
    flipper.style.opacity = '0.35';
    void flipper.offsetWidth;
    this.withTimeout(REDUCED_MS, () => {
      flipper.style.transition = 'none';
      flipper.style.opacity = '';
      done();
    });
  }

  private setTransform(transform: string): void {
    this.opts.flipper.style.transform = transform;
  }

  /** setTimeout con registro para limpiarlo en destroy(). */
  private withTimeout(ms: number, fn: () => void): void {
    let timerId = window.setTimeout(() => {
      fn();
    }, ms);
    const cancel = () => window.clearTimeout(timerId);
    this.cleanupFns.push(cancel);
  }

  /** Registra interacciones: esquinas, teclado y gestos táctiles. */
  private bindInteractions(): void {
    const { cornerNext, cornerPrev, stage } = this.opts;

    const onNext = () => this.goNext();
    const onPrev = () => this.goPrev();

    cornerNext.addEventListener('click', onNext);
    cornerPrev.addEventListener('click', onPrev);
    this.cleanupFns.push(() => cornerNext.removeEventListener('click', onNext));
    this.cleanupFns.push(() => cornerPrev.removeEventListener('click', onPrev));

    // Anticipación 3D: la hoja se "despega" levemente al rozar la esquina.
    const enter = () => {
      if (!this.animating && this.canGoForward() && this.effectiveEffect() === 'flip3d') {
        const { flipper } = this.opts;
        flipper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)';
        flipper.style.transform = 'rotateY(-14deg) skewY(-0.8deg)';
      }
    };
    const leave = () => {
      if (!this.animating && this.effectiveEffect() === 'flip3d') {
        const { flipper } = this.opts;
        flipper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)';
        flipper.style.transform = 'rotateY(0deg)';
      }
    };
    cornerNext.addEventListener('mouseenter', enter);
    cornerNext.addEventListener('mouseleave', leave);
    this.cleanupFns.push(() => cornerNext.removeEventListener('mouseenter', enter));
    this.cleanupFns.push(() => cornerNext.removeEventListener('mouseleave', leave));

    // Teclado.
    const onKey = (e: KeyboardEvent) => {
      // No interceptar si el foco está en un campo de texto.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    this.cleanupFns.push(() => window.removeEventListener('keydown', onKey));

    // Gestos de swipe.
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.changedTouches[0]?.screenX ?? 0;
      startY = e.changedTouches[0]?.screenY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0]?.screenX ?? 0;
      const endY = e.changedTouches[0]?.screenY ?? 0;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) this.goNext();
        else this.goPrev();
      }
    };
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    this.cleanupFns.push(() => stage.removeEventListener('touchstart', onTouchStart));
    this.cleanupFns.push(() => stage.removeEventListener('touchend', onTouchEnd));
  }
}
