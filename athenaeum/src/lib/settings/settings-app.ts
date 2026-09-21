/**
 * Ajustes de lectura: editor en vivo de ReaderSettings con
 * previsualización tipográfica y persistencia inmediata.
 */
import { loadSettings, saveSettings } from '@/lib/reader/storage';
import {
  PAPER_THEMES,
  FONT_STACKS,
  LINE_SPACINGS,
  type FlipEffect,
  type FontFamilyKey,
  type LineSpacing,
  type PaperTheme,
} from '@/lib/reader/settings';

export function bootSettings(): void {
  const preview = document.getElementById('settings-preview');
  if (!preview) return;
  const settings = loadSettings();

  const sample =
    'En un rincón de la memoria se conservan aquellos pasajes que marcaron el curso del pensamiento; el papel devuelve, con su crujido suave, las horas lentas de la tarde.';

  /* ── Helpers visuales ─────────────────────────────────── */
  function markActive(group: string, value: string): void {
    document
      .querySelectorAll<HTMLElement>(`[data-setting="${group}"]`)
      .forEach((el) => {
        const active = el.dataset.value === value;
        el.setAttribute('aria-pressed', String(active));
        el.classList.toggle('border-primary', active);
        el.classList.toggle('bg-surface-container-highest', active);
        el.classList.toggle('text-primary', active);
        el.classList.toggle('border-outline-variant/40', !active);
      });
  }

  const applyPreview = (): void => {
    const paper = PAPER_THEMES[settings.paper];
    preview.style.backgroundColor = paper.bg;
    preview.style.color = paper.text;
    preview.style.fontFamily = FONT_STACKS[settings.font].stack;
    preview.style.fontSize = `${settings.fontSize}px`;
    preview.style.lineHeight = String(LINE_SPACINGS[settings.lineSpacing].multiplier);
    preview.textContent = sample;

    const sizeLabel = document.getElementById('font-size-label');
    if (sizeLabel) sizeLabel.textContent = `${settings.fontSize} px`;
  };

  /* ── Bindings ─────────────────────────────────────────── */
  function bindGroup<T extends string>(
    group: string,
    apply: (value: T) => void,
  ): void {
    document
      .querySelectorAll<HTMLElement>(`[data-setting="${group}"]`)
      .forEach((el) => {
        el.addEventListener('click', () => {
          apply(el.dataset.value as T);
          saveSettings(settings);
          markActive(group, el.dataset.value ?? '');
          applyPreview();
        });
      });
  }

  bindGroup<FlipEffect>('effect', (v) => (settings.effect = v));
  bindGroup<PaperTheme>('paper', (v) => (settings.paper = v));
  bindGroup<FontFamilyKey>('font', (v) => (settings.font = v));
  bindGroup<LineSpacing>('lineSpacing', (v) => (settings.lineSpacing = v));

  const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement | null;
  if (soundToggle) {
    soundToggle.checked = settings.sound;
    soundToggle.addEventListener('change', () => {
      settings.sound = soundToggle.checked;
      saveSettings(settings);
    });
  }

  const sizeDec = document.getElementById('font-size-dec');
  const sizeInc = document.getElementById('font-size-inc');
  sizeDec?.addEventListener('click', () => {
    settings.fontSize = Math.max(17, settings.fontSize - 1);
    saveSettings(settings);
    applyPreview();
  });
  sizeInc?.addEventListener('click', () => {
    settings.fontSize = Math.min(25, settings.fontSize + 1);
    saveSettings(settings);
    applyPreview();
  });

  /* ── Estado inicial ───────────────────────────────────── */
  markActive('effect', settings.effect);
  markActive('paper', settings.paper);
  markActive('font', settings.font);
  markActive('lineSpacing', settings.lineSpacing);
  applyPreview();
}
