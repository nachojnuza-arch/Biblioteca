---
name: Athenaeum Editorial
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e1'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#55423e'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#88726d'
  outline-variant: '#dbc1bb'
  surface-tint: '#9a4431'
  primary: '#7f301f'
  on-primary: '#ffffff'
  primary-container: '#9e4734'
  on-primary-container: '#ffd4ca'
  inverse-primary: '#ffb4a4'
  secondary: '#546254'
  on-secondary: '#ffffff'
  secondary-container: '#d4e4d2'
  on-secondary-container: '#586658'
  tertiary: '#7e3124'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c4839'
  on-tertiary-container: '#ffd3cb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a4'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#7b2d1d'
  secondary-fixed: '#d7e7d5'
  secondary-fixed-dim: '#bbcbb9'
  on-secondary-fixed: '#111e14'
  on-secondary-fixed-variant: '#3c4a3d'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#ffb4a6'
  on-tertiary-fixed: '#3f0400'
  on-tertiary-fixed-variant: '#7a2e21'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.005em
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: 0em
  headline-md:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  headline-sm:
    fontFamily: EB Garamond
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  reading-lg:
    fontFamily: EB Garamond
    fontSize: 21px
    fontWeight: '400'
    lineHeight: 34px
  reading-base:
    fontFamily: EB Garamond
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-base:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies a contemporary editorial aesthetic tailored for a private digital library, document archive, and long-form reader. It synthesizes the quiet dignity of classical bookbinding with the precision and restraint of modern digital typography. The interface evokes feelings of contemplation, intellectual warmth, tactile permanence, and focused scholarship.

Drawing inspiration from **Tactile Minimalism** and **Classical Editorial Design**, the system prioritizes optical comfort over visual noise. Surfaces simulate the natural warmth of unbleached archival vellum and Japanese paper, while structural lines evoke the delicate deckle edges, subtle crease debossing, and spine bindings of fine printed editions. The emotional signature is studious, serene, and timeless—free from aggressive digital trends or artificial neon glows.

## Colors

The palette establishes an organic, literary atmosphere calibrated for extended screen reading sessions without eye fatigue:

- **Primary (`#9E4734` Terracotta):** Used for primary interactive cues, reading progress indicators, active bookmarks, and curated highlight annotations.
- **Secondary (`#384639` Forest Olive):** Applied to secondary badges, metadata taxonomy tags (e.g., genre, read status), study notes, and peripheral reading tools.
- **Tertiary (`#782D20` Deep Burgundy):** Reserved for high-importance interactions, hero title flourishes, hardbound accents, and active selection states.
- **Neutral (`#2B2724` Soft Charcoal):** Serves as high-contrast body typography, ensuring high legibility while remaining softer and more organic than harsh `#000000`. A deeper shade (`#1C1917`) is used for primary titles.
- **Canvas & Surface Tier:**
  - Base canvas: `#FDFBF7` (Archival Ivory)
  - Container / Shelf surface: `#F4EFE6` (Vellum Cream)
  - Muted Borders / Ruling Lines: `rgba(43, 39, 36, 0.08)` (Etched Graphite)
  - Highlights / Annotations: `rgba(158, 71, 52, 0.12)` (Terracotta wash)

## Typography

The typographical hierarchy is constructed on a deliberate dual-engine pairing:

1. **Editorial & Literary Expression (`EB Garamond`):** Used for book titles, author credits, article headlines, chapter titles, blockquotes, and the continuous reading experience (`reading-base`, `reading-lg`). It possesses humanist warmth, graceful serifs, and classical proportions that lower cognitive fatigue during extended sessions.
2. **Functional System Controls (`Plus Jakarta Sans`):** Selected for UI controls, navigation bars, reading statistics, search bars, tooltips, tags, and tabular data. Its clean geometry creates clear visual separation between the content being studied and the platform interface.

Typographical standards:
- Continuous reading passages maintain an optimal measure of 60 to 75 characters per line.
- Italics in `EB Garamond` are strictly preserved for foreign expressions, citations, book titles, and editorial emphasis.
- Small uppercase styling (`label-sm`, `label-md`) is deployed for book format labels (e.g., `EPUB`, `PDF`, `FOLIO`), sorting headers, and page counters.

## Layout & Spacing

The layout model adapts traditional book margins and typographic grids into a responsive digital space:

- **Library & Catalog Grid (Desktop):** A balanced 12-column grid system with 24px (`1.5rem`) gutters and generous 48px (`3rem`) margins. Content shelves (covers, metadata) span 2, 3, or 4 columns depending on display density.
- **Reader View (Single Column / Dual Spread):** Re-centers into an unconstrained, focused editorial frame. Single-column reading bounds max-width to `720px` centered within the canvas, surrounded by generous quiet space. Dual-page spreads activate at screen widths exceeding `1440px`.
- **Tablet & Mobile Adaptation:**
  - **Tablet (640px – 1024px):** 6-column grid with 20px gutters and 32px canvas margins.
  - **Mobile (< 640px):** 4-column layout with 16px (`1rem`) gutters and 20px (`1.25rem`) margins. The reading experience transitions into continuous vertical scroll or edge-to-edge paging with 20px side margins to emulate a pocket paperback.
- **Vertical Cadence:** Multiples of 4px and 8px govern line rhythm, card internal padding, and margin separations between book sections.

## Elevation & Depth

Rather than synthetic multi-color drop shadows or glowing blurs, the design system utilizes physical paper metaphors: debossed letterpress rulings, stacked vellum layers, book spine gradients, and gentle crease shadows.

- **Level 0 (Flat Page):** Direct surface on `#FDFBF7`. Flat borders using `rgba(43, 39, 36, 0.08)` define structural dividers and tabular separators.
- **Level 1 (Paper Leaf / Document Card):** Simulates a standalone sheet laid over vellum. Rendered with an ambient, warm shadow:
  `box-shadow: 0 1px 3px rgba(43, 39, 36, 0.04), 0 4px 12px rgba(43, 39, 36, 0.03)`.
- **Level 2 (Bound Tome / Floating Panel):** Used for book covers in the library shelf and active reading sidebars. Includes a spine crease shadow along the inner spine edge (`inset 3px 0 6px -2px rgba(28, 25, 23, 0.15)`) coupled with an asymmetric paper-edge drop shadow (`box-shadow: 2px 4px 16px rgba(43, 39, 36, 0.07)`).
- **Level 3 (Modal / Reader Settings Overlay):** Floated palettes and TOC drawers utilize an ambient wash with a warm undertone:
  `box-shadow: 0 12px 32px -4px rgba(43, 39, 36, 0.12), 0 2px 6px rgba(43, 39, 36, 0.04)`.

## Shapes

The shape architecture relies on subtle, soft corners (`roundedness: 1`), honoring the trimmed edges of book blocks and hand-bound bindings without appearing rounded or app-like.

- **Base Corner Radius (`0.25rem` / `4px`):** Applied to buttons, standard input fields, tags, checkboxes, and menu overlays.
- **Medium Corner Radius (`rounded-lg` - `0.5rem` / `8px`):** Applied to book card containers, modal dialogue boxes, and document thumbnails.
- **Asymmetric Radii:** Book covers simulate physical spine bindings by featuring `0px` radius on the spine edge (left in LTR layouts) and `4px` radius on the outer edge (right in LTR layouts).
- **Pills / Circles:** Strictly reserved for round page indicator dots, circular icon-only bookmark toggles, and avatar seals.

## Components

### Buttons & Interactive Links
- **Primary Button:** Solid terracotta background (`#9E4734`), white/ivory text (`#FDFBF7`), subtle 4px corner radius. On hover: deep burgundy tone (`#782D20`) with smooth 150ms transition.
- **Secondary Button:** Surface tint `#F4EFE6`, framed with a 1px border (`rgba(43, 39, 36, 0.14)`), text in `#2B2724`. On hover: `rgba(43, 39, 36, 0.05)` background fill.
- **Text / Editorial Action:** Styled in `Plus Jakarta Sans` medium, terracotta underline offset by 4px, transitioning to burgundy on hover.

### Chips & Metadata Badges
- **Status / Genre Chips:** Background `#F4EFE6`, border `1px solid rgba(43, 39, 36, 0.08)`, typography `label-sm` uppercase. 
- **Olive Taxonomy Chips:** Background `rgba(56, 70, 57, 0.08)`, text `#384639`, indicating progress (e.g., "Finished", "Annotated").

### Cards & Book Items
- **Library Tome Card:** Ratio approximating 2:3. Includes an ivory card base, book jacket thumbnail with a 1px inner border, a subtle left spine gradient, and title rendered in `headline-sm` (`EB Garamond`). Author attribution displayed below in `body-sm` (`Plus Jakarta Sans`).
- **Reading Note Card:** Styled as a loose leaf page with an Ivory tint (`#FDFBF7`), left border highlight in `#9E4734` (Terracotta) or `#384639` (Olive) indicating quotation vs. personal note.

### Input Fields & Search
- **Search Bar:** Minimalist line or enclosed pill with `#F4EFE6` fill, `1px solid rgba(43, 39, 36, 0.12)`, placeholder text in `rgba(43, 39, 36, 0.45)`. Focus state features a crisp 1px `#9E4734` border with no harsh blue halos.
- **Checkboxes & Radios:** Hand-inked character; subtle square checkboxes with 2px radius and circular radio buttons. Checked state fills with `#9E4734` displaying a crisp ivory checkmark or dot.

### Specialized Literary Components
- **Reading Progress Spine:** A discreet vertical or horizontal 2px line rendered in `#9E4734` over a `rgba(43, 39, 36, 0.06)` base track.
- **Deckle Divider:** A delicate horizontal rule featuring a subtle diamond or centered glyph ornament in `rgba(43, 39, 36, 0.2)` to separate sections or chapters.
- **Margin Annotation Drawer:** Retractable overlay mimicking marginalia notes, set against a `#F4EFE6` sheet with `EB Garamond` italicized references.