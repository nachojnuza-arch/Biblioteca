/** Ajustes de lectura del lector Athenaeum (persistidos en localStorage). */

export type PaperTheme = 'ivory' | 'cream' | 'white' | 'night';
export type FlipEffect = 'flip3d' | 'slide' | 'fade';
export type FontFamilyKey = 'garamond' | 'playfair' | 'merriweather';
export type LineSpacing = 'estrecho' | 'comodo' | 'amplio';

export interface ReaderSettings {
  paper: PaperTheme;
  effect: FlipEffect;
  sound: boolean;
  font: FontFamilyKey;
  /** Tamaño base del cuerpo de texto en px (17–25) */
  fontSize: number;
  lineSpacing: LineSpacing;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  paper: 'ivory',
  effect: 'flip3d',
  sound: true,
  font: 'garamond',
  fontSize: 21,
  lineSpacing: 'comodo',
};

/** Paletas de papel del lector (del prototipo: frente/reverso/notas). */
export const PAPER_THEMES: Record<
  PaperTheme,
  { bg: string; text: string; note: string; label: string }
> = {
  ivory: { bg: '#FAF6EE', text: '#26221F', note: '#F3ECE0', label: 'Marfil' },
  cream: { bg: '#F4EBE1', text: '#2E2721', note: '#E9DDD1', label: 'Pergamino' },
  white: { bg: '#FFFFFF', text: '#1E1B18', note: '#F5F5F5', label: 'Blanco' },
  night: { bg: '#23201D', text: '#D8CEC4', note: '#2F2B27', label: 'Noche' },
};

export const FONT_STACKS: Record<FontFamilyKey, { stack: string; label: string }> = {
  garamond: {
    stack: "'EB Garamond Variable', 'EB Garamond', Georgia, serif",
    label: 'EB Garamond',
  },
  playfair: {
    stack: "'Playfair Display Variable', 'Playfair Display', Georgia, serif",
    label: 'Playfair Display',
  },
  merriweather: {
    stack: "'Merriweather Variable', 'Merriweather', Georgia, serif",
    label: 'Merriweather',
  },
};

export const LINE_SPACINGS: Record<LineSpacing, { multiplier: number; label: string }> = {
  estrecho: { multiplier: 1.3, label: 'Estrecho' },
  comodo: { multiplier: 1.6, label: 'Cómodo' },
  amplio: { multiplier: 1.9, label: 'Amplio' },
};

/** Valida y normaliza un objeto arbitrario (ej. leído de localStorage). */
export function sanitizeSettings(raw: unknown): ReaderSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const s = raw as Partial<ReaderSettings>;
  return {
    paper: isPaper(s.paper) ? s.paper : DEFAULT_SETTINGS.paper,
    effect: isEffect(s.effect) ? s.effect : DEFAULT_SETTINGS.effect,
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    font: isFont(s.font) ? s.font : DEFAULT_SETTINGS.font,
    fontSize:
      typeof s.fontSize === 'number' && Number.isFinite(s.fontSize)
        ? Math.min(25, Math.max(17, Math.round(s.fontSize)))
        : DEFAULT_SETTINGS.fontSize,
    lineSpacing: isSpacing(s.lineSpacing) ? s.lineSpacing : DEFAULT_SETTINGS.lineSpacing,
  };
}

function isPaper(v: unknown): v is PaperTheme {
  return v === 'ivory' || v === 'cream' || v === 'white' || v === 'night';
}
function isEffect(v: unknown): v is FlipEffect {
  return v === 'flip3d' || v === 'slide' || v === 'fade';
}
function isFont(v: unknown): v is FontFamilyKey {
  return v === 'garamond' || v === 'playfair' || v === 'merriweather';
}
function isSpacing(v: unknown): v is LineSpacing {
  return v === 'estrecho' || v === 'comodo' || v === 'amplio';
}
