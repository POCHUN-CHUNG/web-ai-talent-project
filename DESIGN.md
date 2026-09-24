---
version: alpha
name: 'Glass Console'
description: 'Translucent white cards on soft blue, yellow and pink accent-wash backgrounds, with pill labels and glass orbs on a monochrome light system; deep navy for the main action; all radii follow the token set (cards 30px, inputs 30px, buttons 25px, nested 20px).'
colors:
  background: '#ebebeb'  # color.light.surface.bg
  on-background: '#000000'  # color.light.surface.text
  surface: '#ffffff'  # color.light.surface.surface
  on-surface: '#000000'  # color.light.surface.text
  surface-container-lowest: '#ffffff'  # surface (lighter than background)
  surface-container-low: '#f7f7f7'  # mix(surface, text, 0.03)
  surface-container: '#f0f0f0'  # mix(surface, text, 0.06)
  surface-container-high: '#e8e8e8'  # mix(surface, text, 0.09)
  surface-container-highest: '#e0e0e0'  # mix(surface, text, 0.12)
  surface-raised: '#ebebeb'  # color.light.surface.surfaceRaised
  outline-variant: '#e6e6e6'  # color.light.surface.border
  outline: '#878787'  # color.light.surface.borderStrong
  on-surface-variant: '#2c2c2c'  # color.light.surface.textMuted
  button-secondary: '#f5f5f5'  # color.light.surface.btnSecondaryBg
  on-button-secondary: '#000000'  # first of text/background reaching 4.5:1 (19.26:1)
  button-inverted: '#000000'  # color.light.surface.btnInvertedBg
  on-button-inverted: '#ffffff'  # color.light.surface.textInverted
  button-outlined-text: '#000000'  # color.light.surface.btnOutlinedText
  primary: '#1e3a8a'  # primary-500 (explicit palette `on`)
  on-primary: '#ffffff'  # color.light.primary.on (10.36:1)
  primary-hover: '#152d78'  # primary-600 (one step darker)
  primary-container: '#d8e5ff'  # primary-100
  on-primary-container: '#030c3d'  # primary-900
  secondary: '#0d9488'  # secondary-500 (explicit palette `on`)
  on-secondary: '#ffffff'  # color.light.secondary.on (3.74:1)
  secondary-hover: '#00756c'  # secondary-600 (one step darker)
  secondary-container: '#daf2ee'  # secondary-100
  on-secondary-container: '#00231f'  # secondary-900
  tertiary: '#f59e0b'  # tertiary-500 (explicit palette `on`)
  on-tertiary: '#000000'  # color.light.tertiary.on (9.78:1)
  tertiary-hover: '#c17b00'  # tertiary-600 (one step darker)
  tertiary-container: '#ffeedc'  # tertiary-100
  on-tertiary-container: '#351e00'  # tertiary-900
  success: '#0d9488'  # color.light.semantic.success
  on-success: '#000000'  # best contrast (5.61:1)
  success-container: '#daf2ee'  # secondary-100
  on-success-container: '#00231f'  # secondary-900
  warning: '#d37200'  # color.light.semantic.warning
  on-warning: '#000000'  # best contrast (6.18:1)
  warning-container: '#f9ebdb'  # derived: warning tinted into surface
  on-warning-container: '#2e1900'  # derived: warning mixed toward text (14.29:1)
  error: '#dc2626'  # color.light.semantic.error
  on-error: '#ffffff'  # best contrast (4.83:1)
  error-container: '#fae1e1'  # derived: error tinted into surface
  on-error-container: '#300808'  # derived: error mixed toward text (14.54:1)
  info: '#2563eb'  # color.light.semantic.info
  on-info: '#ffffff'  # best contrast (5.17:1)
  info-container: '#dfeaff'  # link-100
  on-info-container: '#00124d'  # link-900
  link: '#0a48cf'  # link-600 (≥4.5:1 vs background)
  focus-ring: '#1e3a8a'  # primary (≥3:1 vs background and surface)
  inverse-primary: '#1e3a8a'  # high-contrast inverse of primary
  inverse-secondary: '#0d9488'  # high-contrast inverse of secondary
  inverse-tertiary: '#f59e0b'  # high-contrast inverse of tertiary
  inverse-surface: '#000000'  # for scrims and inverted regions (snackbars etc.)
  inverse-on-surface: '#ffffff'  # label color on inverse-surface
  primary-50: '#f5f8ff'
  primary-100: '#d8e5ff'
  primary-200: '#aec7ff'
  primary-300: '#789bec'
  primary-400: '#4467c0'
  primary-500: '#1e3a8a'
  primary-600: '#152d78'
  primary-700: '#0d2266'
  primary-800: '#061752'
  primary-900: '#030c3d'
  primary-950: '#01052b'
  secondary-50: '#f2fbf9'
  secondary-100: '#daf2ee'
  secondary-200: '#b8e4dd'
  secondary-300: '#88cec4'
  secondary-400: '#50b1a5'
  secondary-500: '#0d9488'
  secondary-600: '#00756c'
  secondary-700: '#005952'
  secondary-800: '#003e39'
  secondary-900: '#00231f'
  secondary-950: '#000f0d'
  tertiary-50: '#fff7ee'
  tertiary-100: '#ffeedc'
  tertiary-200: '#ffe2c1'
  tertiary-300: '#ffce95'
  tertiary-400: '#fdb559'
  tertiary-500: '#f59e0b'
  tertiary-600: '#c17b00'
  tertiary-700: '#915b00'
  tertiary-800: '#633d00'
  tertiary-900: '#351e00'
  tertiary-950: '#140800'
  neutral-50: '#f8f8f8'
  neutral-100: '#ebebeb'
  neutral-200: '#d9d9d9'
  neutral-300: '#bdbdbd'
  neutral-400: '#9d9d9d'
  neutral-500: '#7f7f7f'
  neutral-600: '#646464'
  neutral-700: '#4c4c4c'
  neutral-800: '#353535'
  neutral-900: '#1d1d1d'
  neutral-950: '#0b0b0b'
  link-50: '#f5f9ff'
  link-100: '#dfeaff'
  link-200: '#c0d6ff'
  link-300: '#90b6ff'
  link-400: '#548cff'
  link-500: '#2563eb'
  link-600: '#0a48cf'
  link-700: '#0033a8'
  link-800: '#00237b'
  link-900: '#00124d'
  link-950: '#00062a'
  accent-1-50: '#f5f9ff'
  accent-1-100: '#edf4ff'
  accent-1-200: '#e3edff'
  accent-1-300: '#d2e3ff'
  accent-1-400: '#bfd7fe'
  accent-1-500: '#aecbfa'
  accent-1-600: '#749de1'
  accent-1-700: '#4773bd'
  accent-1-800: '#214b90'
  accent-1-900: '#032359'
  accent-1-950: '#000924'
  accent-2-50: '#ffffff'
  accent-2-100: '#fffef4'
  accent-2-200: '#fffce3'
  accent-2-300: '#fff9ca'
  accent-2-400: '#fef4aa'
  accent-2-500: '#fef08a'
  accent-2-600: '#ceba00'
  accent-2-700: '#988900'
  accent-2-800: '#655b00'
  accent-2-900: '#322d00'
  accent-2-950: '#0e0b00'
  accent-3-50: '#fff6f6'
  accent-3-100: '#fff2f1'
  accent-3-200: '#ffebeb'
  accent-3-300: '#ffe1e1'
  accent-3-400: '#ffd5d5'
  accent-3-500: '#ffc9c9'
  accent-3-600: '#e78a8d'
  accent-3-700: '#c0565c'
  accent-3-800: '#8f2834'
  accent-3-900: '#540012'
  accent-3-950: '#1e0003'
  shadow-tint: '#0f172a'  # appearance.elevation.tintColor
typography:
  headline-display:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '39px'
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: '-0.025em'
  headline-lg:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '31px'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.02em'
  headline-md:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '25px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  headline-sm:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '0em'
  body-lg:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '20px'
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: '0em'
  body-md:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: '0em'
  body-sm:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: '0em'
  label-lg:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '16px'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '0.01em'
  label-md:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: '0.02em'
  label-sm:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '10px'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '0.04em'
  brand-title:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.2em'
  brand-subtitle:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '17px'
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: '0em'
  form-heading:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '22px'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '0em'
  input-text:
    fontFamily: 'Noto Sans, Noto Sans TC'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: '0em'
rounded:
  sm: '4px'
  md: '6px'
  lg: '18px'
  xl: '24px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  2xl: '48px'
  3xl: '64px'
  gutter: '24px'
  margin: '32px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '8px 24px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-secondary:
    backgroundColor: '{colors.button-secondary}'
    textColor: '{colors.on-button-secondary}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '8px 24px'
  button-inverted:
    backgroundColor: '{colors.button-inverted}'
    textColor: '{colors.on-button-inverted}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '8px 24px'
  button-outlined:
    textColor: '{colors.button-outlined-text}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '8px 24px'
  input:
    backgroundColor: '{colors.surface-container-lowest}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '30px'
    padding: '8px 16px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '30px'
    padding: '20px'
  card-nested:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    rounded: '20px'
    padding: '20px'
  checkbox:
    backgroundColor: '{colors.primary}'
    rounded: '15px'
    size: '20px'
  radio:
    backgroundColor: '{colors.primary}'
    rounded: '{rounded.full}'
    size: '20px'
  slider-track:
    backgroundColor: '{colors.primary-container}'
    rounded: '15px'
    height: '8px'
  slider-thumb:
    backgroundColor: '{colors.primary}'
    rounded: '15px'
    size: '24px'
  chip:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label-md}'
    rounded: '{rounded.full}'
    padding: '4px 8px'
  link:
    textColor: '{colors.link}'
    typography: '{typography.body-md}'
---

# Glass Console

## Brand & Style

**Audience and use.** Traditional Chinese–first (Taiwan) teams who run meetings, events and projects and who also operate dashboards and admin consoles. The same system covers slide decks (agendas, project reviews, timelines), social and graphic cards, and web/app UI. Latin and CJK text always appear together.

**Emotional target.** Light, friendly, orderly, quietly premium. Soft pastel color lives in the background; content sits on clean white cards; one deep navy carries the main action.

**Reference basis.** The visual language is taken from the owner's event/meeting agenda slide template (cover with orbs, contents cards, speaker and project pages, Gantt timeline, next-steps rows) combined with the token set. **All component radii, type sizes and colors come from the tokens**, not from any platform's system UI: cards 30px, inputs 30px, buttons 25px, nested cards 20px (see Shapes).

**Light only** (`background` #ebebeb, `surface` #ffffff). There is no dark mode.

Signature traits (what makes it recognizable):

1. **Accent-wash backgrounds** — pages sit on soft gradients built from the three accent palettes: blue `accent-1` (#aecbfa), yellow `accent-2` (#fef08a), pink `accent-3` (#ffc9c9).
2. **White rounded cards on color** — neutral cards (glass at 75% opacity, 24px blur, 150% saturation, a 1px edge) float on the wash and carry all the reading content.
3. **Glass orbs** on covers and closing pages: three overlapping translucent circles in the three accents.
4. **Pill labels** for meta information (company, date, numbers, links) and monochrome chrome; deep navy `primary` (#1e3a8a) only for the main action.
5. **Depth, not lines** — separation comes from color, blur and soft shadow, plus the thin glass edge (see Elevation & Depth).

## Colors

**Proportion.** The page canvas may be `background` or one accent wash. On top of it, neutrals (`surface`, `surface-container-*`, `surface-raised`, text) make up roughly 85–90% of the *content* area. `primary` and `button-inverted` together stay under about 8% of the content area. Secondary, tertiary, semantic colors and solid accent fills (markers, tiles, dots, bars) together stay under about 7%. The wash itself is background, not UI color.

**Surface layering.** `background` (#ebebeb) is the page canvas (or the base under a wash). `surface` (#ffffff) is the top layer: cards, sheets, popovers. `surface-raised` (#ebebeb) is the nested-card fill; it equals the page color, so nested cards read as recessed wells inside white cards. The surface/background step is only about 1.2:1, so glass blur, shadow and the wash, not color steps, do most of the separation work.

**Containers.** `surface-container-lowest` is the input fill. `surface-container-low` → `surface-container-highest` are tonal steps: `surface-container-low` for grouped list rows and table hover, `surface-container-high` for secondary-button hover and neutral chips, `surface-container-highest` for inactive tracks and switch-off states.

**Text.** `on-surface` (#000000) is primary text. `on-surface-variant` (#2c2c2c) is secondary text — nearly black, so primary/secondary hierarchy must come from size and weight, never from color alone. Text on accent fills is always #000000 (the `on` value of the accent palettes; it equals `on-tertiary`).

**Outlines.** `outline` (#878787) is the control boundary for input, outlined button and unchecked checkbox/radio, and the month/axis divider lines in charts. `outline-variant` (#e6e6e6) is a hairline color that is almost invisible; it is not used for decoration because borders are off (see Shapes).

**Buttons and actions.**

- `primary` (#1e3a8a) with `on-primary` (#ffffff), 10.36:1: the single main action per view. Hover uses `primary-hover` (#152d78).
- `button-inverted` (#000000 with `on-button-inverted` #ffffff): the strongest polarity. Choose it over `primary` when the button sits on imagery, when `primary` would separate poorly, or for the "Continue / Register" action next to an outlined "Learn more".
- `button-secondary` (#f5f5f5) with `on-button-secondary`: supporting action on a white card.
- `button-outlined-text` (#000000): label of the outlined button (transparent, 1px `outline` edge).

**Secondary (teal) and tertiary (amber).**

- `secondary` (#0d9488) with `on-secondary` (#ffffff) is a deliberate pairing at 3.74:1, below the 4.5:1 text ratio. The rule that goes with it: labels set on a `secondary` fill are `headline-sm` (20px, 600) or larger, or the fill carries icons and graphics only. Smaller text in teal uses `secondary-container` (#daf2ee) with `on-secondary-container`.
- `secondary` and `success` are the same value (#0d9488). Never use secondary for something that could be read as a success state.
- `tertiary` (#f59e0b) with `on-tertiary` (#000000) is for highlights and "new" markers. It is only 1.8:1 against `background`, so it cannot be the only boundary of a button; pair it with a shadow or place it on `surface`.

**Semantic.** `success` (#0d9488), `warning` (#d37200), `error` (#dc2626), `info` (#2563eb), each with an `on-*` label color. These fills are for icons, badges and solid status buttons. Status text on the page uses `on-*-container` on `*-container`, because success and warning fills are below 4.5:1 on `surface`. Status chips are the one deliberate exception — see Components → Chip — they use the raw status color plus a matching-color edge instead, because they need to read clearly against the page wash.

**Link and focus.** `link` (#0a48cf). `focus-ring` is #1e3a8a.

**Inverse.** `inverse-surface` (#000000) with `inverse-on-surface` (#ffffff) for snackbars, scrims and inverted regions.

**Accent washes (page backgrounds).** The accent palettes are the background system. Every wash is a gradient over `background`; the wash never carries content directly, cards do.

| Wash | Light recipe | Typical use |
|---|---|---|
| Blue (`accent-1`) | `linear-gradient(135deg, accent-1-200 (#e3edff) 0%, accent-1-500 (#aecbfa) 100%)`, optionally with one large `surface` circle at 40% opacity, partly off-canvas at top center-right | Contents, next steps, program and information pages; the calm default wash |
| Yellow (`accent-2`) | `linear-gradient(90deg, accent-2-500 (#fef08a) 0%, transparent 60%)` over `background` (vertical edge glow on the left) | Projects, goals, metrics, progress |
| Pink (`accent-3`) | `radial-gradient(70% 80% at 0% 0%, accent-3-500 (#ffc9c9), transparent 70%)` over `background` | People, welcome, celebration, timeline |

**Superseded by Elevation & Depth → Page backdrop below**: the per-page single-accent wash system (one of the three washes chosen per page) is no longer how page backgrounds work. Every page now uses the one shared diagonal three-accent wash. The per-page wash recipes above remain valid for narrower decorative uses (a card's corner-gradient, an orb cluster, a slide background) — just not for the page canvas itself.

Rules for washes: a wash never sits behind small body text without a card; do not stack a wash on a wash; the orb cluster and phase-coded charts remain the only places multiple accents are allowed to mix outside the shared page backdrop.

**Solid accent fills.** The same pastels are used for: stat tiles (`accent-1-200` (#e3edff), `accent-2-300` (#fff9ca), `accent-3-200` (#ffebeb)), category dots, phase bars and legend circles. Their label color is always #000000; contrast against it is above 12:1 for the 500 shades. Never pair them with `on-surface`.

**Palettes.** `primary-50…950`, `secondary-*`, `tertiary-*`, `link-*`, `neutral-*` exist for charts and illustration.

## Typography

**Family.** One family for all roles: Noto Sans for Latin and numerals, Noto Sans TC as the Traditional Chinese fallback. Weights in use: 400, 500, 600, 700.

**Levels and roles.**

| Level | Size / weight / line-height | Role |
|---|---|---|
| `headline-display` | 39px / 700 / 1.05 | Page or slide title; cover title at 2× (see Media Adaptation) |
| `headline-lg` | 31px / 700 / 1.15 | Section title, large stat numerals |
| `headline-md` | 25px / 600 / 1.25 | Card title, contents card title |
| `headline-sm` | 20px / 600 / 1.3 | Tile title, dialog title, row titles |
| `body-lg` | 20px / 400 / 1.55 | Lead paragraph, short statements |
| `body-md` | 16px / 400 / 1.6 | Default reading text |
| `body-sm` | 14px / 400 / 1.55 | Captions, footnotes, helper text |
| `label-lg` | 16px / 500 / 1.4 | Button and pill labels, form field labels |
| `label-md` | 14px / 500 / 1.35 | Slide chrome (company, date, page number), chips, table headers, "Slide 03" references |
| `label-sm` | 10px / 600 / 1.3 | Micro badges only (see below) |
| `brand-title` | 36px / 700 / 1.2, `0.2em` tracking (28px on mobile, ≤734px) | Wordmark only (the product name on the entry pages' card, e.g. Login) |
| `brand-subtitle` | 17px / 700 / 1.6 | Wordmark subtitle only (the platform description on the entry pages' card) |
| `form-heading` | 22px / 700 / 1.3 | Form title inside an entry card (Login / Register / Settings section heading) |
| `input-text` | 14px / 400 / 1.4 | Text typed into a pill-shaped entry-page input (Login, Settings password fields) |

**Hierarchy collision.** `headline-sm` and `body-lg` are both 20px. Never place `body-lg` directly under `headline-sm`; they differ only by weight and would read as one level. Under `headline-sm` use `body-md`. Use `body-lg` only under `headline-md` or larger, or as a standalone statement.

**Small text.** `label-sm` (10px) is below the 12px readability floor. Use it only for uppercase Latin micro-badges or a numeric superscript, never for a CJK sentence and never as the only carrier of information. For CJK labels the minimum is `label-md` (13px).

**CJK rules.**

- Headline levels use negative letter-spacing (`headline-display` -0.025em, `headline-lg` -0.02em, `headline-md` -0.01em). This is tuned for Latin. **Set letter-spacing to 0 on any CJK text** in those levels.
- Body line-height for CJK paragraphs is at least 1.6. `body-md` already meets it; `body-lg` and `body-sm` (1.55) are for short CJK strings only. Long CJK paragraphs use `body-md`.
- No italics on CJK; use weight 600 for emphasis. Latin subtitles or role names are set upright in `body-sm` with `on-surface-variant`, not italic.
- Keep a half-width space between CJK text and Latin words or digits; do not mix full-width and half-width punctuation in one sentence.

**Measure.** 60–75 characters per line for Latin, about 30–40 characters per line for CJK.

**Color of text.** `on-surface` for headings and body. `on-surface-variant` for captions, chrome and helper text. `link` only for inline links. On accent fills text is #000000. Never set text in `secondary` or `tertiary` fills below `headline-sm` size.

## Layout & Spacing

**Spacing scale** (4px base; inferred, since the tokens define none): `xs` 4px, `sm` 8px, `md` 16px, `lg` 24px, `xl` 32px, `2xl` 48px, `3xl` 64px, `gutter` 24px, `margin` 32px.

**Where each step goes.**

- Inside components: `xs`–`sm` (icon-to-label gaps, chip padding, marker padding), `md` (input horizontal padding), `lg` (button horizontal padding). Card and nested-card padding is the fixed 20px from the tokens.
- Between cards in a web grid: `gutter`. Between tiles on a slide: `md`. Between unrelated groups: `xl`–`2xl`.
- Between page sections: `3xl`. Use larger air, not extra dividers, to separate sections.

**Web grid.** Desktop: 12 columns, `gutter` between columns, `margin` (32px) side margins, content column about 1080px wide (a guideline, not a token). Mobile: 4 columns, `md` (16px) side margins. Breakpoints (guideline): up to about 734px single column, about 735–1068px two columns, above about 1068px three or four columns.

**Slide grid (1280×720 base canvas).** Side margins `margin` (32px). Top chrome row (company left, date right) about `2xl` (48px) from the top edge. Title block starts about 96px from the top. Content ends `3xl` (64px) above the bottom edge; the page number sits bottom-right on the margin. Tiles and cards are separated by `md` (16px). Columns: 4 or 6 equal columns for contents and people; a 2-column split (text left, media right) for project pages; a stacked list of full-width rows for next steps.

**Density.** Airy and tile-based. One idea per tile; a tile holds a short heading, one to three lines of text and at most two buttons. Dashboards use the same card units at `gutter` spacing; they do not switch to compact table density.

**Chrome pattern (every slide except cover and closing).** `label-md` in `on-surface-variant`: company name top-left, date top-right, page number bottom-right. On photography the chrome uses `inverse-on-surface`.

**Application patterns for UI.** Tile dashboards: a grid of cards with a stat tile, a control card and a list card. Settings/forms: one nested card per group, one row per setting, label left, value or control right. Sidebar plus content: sidebar in `surface-container-low`, section labels in `label-md`.

## Elevation & Depth

**Strategy: glass.** Depth is built from a translucent surface, a backdrop blur and a soft tinted shadow. The source tokens use `intensity` 0.35 and tint `shadow-tint` (#0f172a).

**Glass surface.** `background-color: rgba(255, 255, 255, 0.75)` (surface opacity 0.75) with `backdrop-filter: blur(24px) saturate(150%)` (increased blur and saturation to maintain text legibility and create a richer glass effect over the diagonal wash), plus the 1px edge described below.

**Shadow levels** (tinted shadows):

| Level | Shadow |
|---|---|
| `level-1` | `0px 1px 3px 0px rgba(15, 23, 42, 0.08)` |
| `level-2` | `0px 4px 8px -1px rgba(15, 23, 42, 0.1)` |
| `level-3` | `0px 10px 20px -3px rgba(15, 23, 42, 0.12)` |
| `level-4` | `0px 16px 30px -4px rgba(15, 23, 42, 0.16)` |
| `level-5` | `0px 24px 48px -6px rgba(15, 23, 42, 0.2)` |

**Which level for what.** `card` uses `level-1` (the only assignment given by the tokens). The rest is guidance: `level-2` for hovered or raised tiles and sticky toolbars, `level-3` for menus, popovers and tooltips, `level-4` for modal sheets and dialogs, `level-5` for full-screen overlays. Nested cards, pills and chips have no shadow.

**Page backdrop (revised — this is now the one default for every page, not a per-page choice).** Earlier drafts had each page pick one of three radial washes; the product now uses a single diagonal wash everywhere, applied once on `body` rather than per page, so it is automatically consistent across the whole app: `linear-gradient(135deg, color-mix(in srgb, accent-1-500 32%, transparent) 0%, color-mix(in srgb, accent-2-500 22%, transparent) 50%, color-mix(in srgb, accent-3-500 28%, transparent) 100%)` over `background`, direction fixed top-left to bottom-right (135deg), `background-attachment: fixed` so it does not scroll with page content. There is no flat, wash-less page anymore — every page sits on this gradient; a glass card over it always has something to read as "glass" against.

**Rules.**

- One glass level only. Never place a glass surface directly on another glass surface. Anything nested inside a glass card is opaque (`surface-raised`), not glass.
- Over photography, cards are opaque `surface` (no blur, full opacity) so text stays legible; glass is for cards on washes.
- Text over glass must remain legible on the worst-case backdrop pixel; set text in `on-surface`.
- **Revised: glass now always draws a 1px edge** — `color-mix(in srgb, on-background 10%, transparent)`, which resolves to roughly `rgba(0, 0, 0, 0.1)`. This supersedes the source tokens' `borderStrategy: none`: at 0.8 surface opacity a hairline edge reads as refined rather than decorative, and it's the main thing that keeps a glass card legible as a distinct shape against a busy multi-color wash.

## Shapes

**Corner strategy: `rounded-mixed`.** Radius encodes hierarchy: the largest containers are the roundest and small selection controls are the tightest. **All radii below come from `design-tokens.json`; do not substitute platform, OS or template radii.**

**Hybrid radius system (deliberate).** The token file has a global scale plus independent per-component radii, and they do not line up on purpose. The global `rounded` scale (`sm` 4px, `md` 6px, `lg` 18px, `xl` 24px, `full` 9999px) is for elements that have no dedicated component radius. Named components keep their own fixed radii:

| Component | Radius |
|---|---|
| Card | 30px |
| Input | 30px |
| Button | 25px |
| Nested card | 20px |
| Checkbox | 15px |
| Slider track and thumb | 15px |
| Radio, chip | `rounded.full` |

**Where each radius applies on pages and slides.**

| Element | Radius |
|---|---|
| Cards, glass panels, agenda and contents cards | 30px (card) |
| Photo tiles placed in the same grid as cards | 30px (card radius, so a row of cards and photos aligns) |
| Stat tiles, sub-panels, list rows inside a card | 20px (nested card) |
| Next-steps rows and other full-width rows | 30px (card); they render as pills at row height |
| Meta pills, number pills, legend pills, Gantt bars, avatars, orbs, dots | `rounded.full` |
| Standalone images outside the grid | `rounded.lg` (18px); large hero media `rounded.xl` (24px) |
| Tooltips, popovers | `rounded.xl` |

**What this looks like.** At default heights (about 38px buttons, about 42px inputs) the button and input radii exceed half the height, so both render as full pills. Cards at 30px read as generously rounded panels; controls inside them keep smaller radii by their own tokens.

**Nesting.** A nested card is 20px inside a 30px card with 20px padding. Ideal concentric rounding would be 10px (30 − 20), so the corners are not concentric; this is how the source tokens define it and it is kept as specified. Media that runs edge to edge inside a card is clipped by the card's 30px radius.

**Full.** `rounded.full` is allowed for radio buttons, chips, pills, avatars, switch tracks, orbs and circular icon buttons. Checkboxes must not be full circles.

**Checkbox versus radio.** Checkbox radius is 15px on a 20px control, which renders as a circle and looks identical to a radio. They are distinguished by construction: a checked checkbox is a solid `primary` fill with no inner mark; a selected radio is a `primary` ring with an inner dot. Do not use both in the same group.

**Borders.** `borderWidth` is 0px and `subcardBorderWidth` is 0px: no card, nested card, divider or glass edge. Controls keep a 1px `outline` edge because they would otherwise disappear (input, outlined button, unchecked checkbox/radio).

## Components

All components use tokens from the frontmatter. Shared state rules: focus-visible is a 2px `focus-ring` outline with a 1px offset; disabled is 38% opacity with no shadow and no hover; pressed reuses the hover color.

**Button primary.** `primary` fill, `on-primary` label in `label-lg`, radius 25px, padding 8px 24px. Hover `primary-hover`. One per view.

**Button secondary.** `button-secondary` fill, `on-button-secondary` label, same geometry. Hover `surface-container-high`.

**Button inverted.** `button-inverted` fill, `on-button-inverted` label, same geometry. Hover drops opacity to about 88%. Use on imagery, and as the strong action beside an outlined "Learn more".

**Button outlined.** Transparent fill, `button-outlined-text` label, 1px `outline` edge, same radius and padding. Hover matches the primary button's solid identity rather than a light tint: fill becomes `button-outlined-text`, label becomes `surface`, `level-1` shadow appears.

**Button danger.** Transparent fill, `error` label and 1px `error` edge, same radius and padding — an outlined button in the error color rather than a solid error fill at rest, so it doesn't compete with the one `primary` action on the page. Hover matches the primary button's solid identity: fill becomes `error`, label becomes `on-error`, `level-1` shadow appears. For destructive-but-common actions like signing out (not data-destroying actions, which still want a confirmation step elsewhere).

**Meta pill / link pill.** `rounded.full`, `surface` fill, `on-surface` label in `label-lg` (or `label-md` for chrome-sized pills), padding `sm` (8px) vertical and `lg` (24px) horizontal. Used on washes and photos for company name, date, "Add a link" and speaker-name captions. On a white card use `button-secondary` fill instead so the pill remains visible. No shadow.

**Input.** Transparent fill (no `surface-container-lowest`, no translucent surface tint — revised: a filled or even tinted pill read as one visual step too many stacked on a glass card), `on-surface` text in `body-md` (or `input-text` on an entry-page pill input), radius 30px, padding 8px 16px, 1px `outline` edge, placeholder in `on-surface-variant`. It still carries its own `backdrop-filter: blur(16px)`, so typed text stays legible against the wash even with no background color. Focus: the 1px edge itself switches to `focus-ring` — width and position stay put, only the color changes, so the border never visibly shifts (revised from a 2px outline replacing the edge, which read as a jump). Error: edge in `error`, helper text in `body-sm` using `on-error-container` on `error-container`. Labels sit above in `label-lg`. Never rely on the browser's native validation bubble (`required`'s default tooltip) — submit with `noValidate` and show the same failure as an inline status chip below the form, styled like any other error.

**Checkbox and radio backgrounds follow the same rule**: per Shapes → Checkbox/Radio below, the unchecked/unselected state is already transparent (just the 1px `outline` edge) — that hasn't changed, it's restated here because inputs now match it: no control's resting background should compete with the glass card behind it.

**Card.** `surface` fill (glass at 75% over a wash; opaque over photography), `on-surface` text, radius 30px, padding 20px, `level-1`, no border. Anatomy for contents/agenda cards: number in `label-lg` top-left, optional accent dot top-right (16px, `accent-N-500`), title in `headline-md` (`headline-sm` in six-column layouts) in the middle, reference in `label-md` `on-surface-variant` at the bottom ("Slide 03").

**Corner-gradient card.** A card may carry one accent gradient in its top-left corner: `radial-gradient(90% 90% at 0% 0%, accent-N-500, transparent 70%)` over `surface`, for hero statements and key stats (yellow for goals, pink for people). Text stays `on-surface`.

**Nested card / stat tile.** `surface-raised` fill (or an accent tint: `accent-1-200`, `accent-2-300`, `accent-3-200`), radius 20px, padding 20px, no border, no shadow. Stat tile: numeral in `headline-lg`, caption in `body-md`. Text color is `on-surface` on `surface-raised` and #000000 on accent tints.

**Checkbox.** 20px, radius 15px. Unchecked: transparent with a 1px `outline` edge. Checked: solid `primary` fill, no glyph.

**Radio.** 20px, `rounded.full`. Unselected: 1px `outline` ring. Selected: `primary` ring with an inner dot.

**Slider.** Track 8px high in `primary-container`, radius 15px; filled portion and thumb in `primary`; thumb 24px, radius 15px. Show the current value as text next to the label, in `label-md`.

**Chip.** Neutral chip: `surface-container-high` fill, `on-surface` text in `label-md`, radius `rounded.full`, padding 4px 8px. Status chips use the `*-container` fill with the raw status color (not `on-*-container`) as the text/icon color — `error` text on `error-container`, etc. — plus a 1px edge at `color-mix(in srgb, [status] 35%, transparent)`: at the container tint's usual low contrast, a status chip on a busy wash background reads as "roughly the same beige as the page" without the saturated text and the edge doing the work of separating it. Never use `secondary-container` or `tertiary-container` for a neutral chip; they look like the success and warning containers.

**Link.** `link` color, `body-md`, underlined with a small offset. Hover darkens one step (`link-700`).

**Number pill and category dot.** Number pill: `rounded.full`, `surface` fill, `label-lg`, padding `xs` (4px) vertical and `sm` (8px) horizontal (e.g. "01"). Legend circle: `rounded.full`, accent-N-500 fill with #000000 number. Category dot: 16px circle in `accent-N-500`. The accent order is fixed: 1 = pink (`accent-3`), 2 = yellow (`accent-2`), 3 = blue (`accent-1`), matching the template's phase order.

**Agenda / next-steps row.** Full-width row card: radius 30px (a pill at row height), `surface` fill, padding `md` (16px) vertical and `lg` (24px) horizontal; columns: date (`label-lg`, fixed width), step description (`headline-sm`, flexible), owner (`label-lg`, right-aligned). Rows are separated by `md` (16px), no lines.

**Gantt bar and legend.** Bar: `rounded.full`, phase accent fill, #000000 label in `label-md` ("Date – Date"), height at least `xl` (32px). Legend: a `surface-container-high` pill holding three legend circles with phase names in `label-lg`. Month header in `label-md` `on-surface-variant`; month dividers are 1px `outline` vertical lines; task labels in `body-md` with a category dot.

**Photo tile and avatar.** Photo tile: image clipped by the card radius (30px), same height as the row's cards. Avatar: circle (`rounded.full`), optional 3px rim in `accent-2-500` on one side. Name in `label-lg`, role in `body-sm` `on-surface-variant`. A speaker-name caption may overlay the photo as a meta pill.

**Toolbar / navigation bar.** Sticky, glass at `level-2`, radius `rounded.full` when floating or full-width with no radius when docked. Title in `label-lg`, actions as circular icon buttons (44px hit target) on `surface-container-high`.

**Entry header.** Fixed to the top of Login, Register and Settings, transparent (no glass, no shadow, sits directly on the page backdrop), edge-to-edge — **no max-width or centered content column**: the logo sits flush against the true left edge of the viewport and the account icon flush against the true right edge, each inset only by `margin` (32px), `lg` (24px) top/bottom padding. Left: a 40px circular `primary` badge with an `on-primary` icon (the product mark); signed in, "診股整股" appears beside it in `label-lg`/700/`primary`, and the whole logo-plus-text block becomes a plain click target back to Home — no hover state, since it's identity chrome rather than a button. Signed out (Login/Register), it's icon-only and inert. Right: one circular icon button, 36px, transparent, `on-surface-variant` icon, hover fill a translucent `on-surface` overlay (not a flat token, so it reads as gray over any part of the wash) — the account icon (`person`). The icon button's `:focus-visible` state is the standard 2px `focus-ring` outline with 1px offset, not the browser default.

**Account menu.** When signed in, the account icon opens a popover instead of navigating directly: `Tooltip / popover` glass (`level-3`, `rounded.xl`), anchored top-right under the icon, closes on an outside click. Two items, each full-width, `body-md`, centered, hover fill (a translucent `on-surface` overlay); item radius scales with the popover's own radius rather than using a fixed token — `rounded.xl` minus the popover's own padding, the same concentric-rounding relationship as a nested card: "設定" (navigates to Settings) and "登出" in `error` color (calls `/auth/logout`, clears the session, navigates to Login). Signed out (only possible on Login/Register, since Settings requires a session), the account icon is inert — there is no menu to show.

**Sidebar.** `surface-container-low` panel, grouped lists with `label-md` section labels in `on-surface-variant`. Selected row: `surface-container-high` fill with `rounded.md`.

**Form / list group.** One nested card per group; one row per setting; label left in `body-md`, value or control right in `on-surface-variant` or the control itself. Rows are separated by `sm` spacing, not lines.

**Switch.** Track `rounded.full`, about 44px by 28px; off `surface-container-highest` with a 1px `outline` edge, on `primary`; thumb 24px in `surface`.

**Segmented control / tabs.** Pill container in `surface-container-high`; the selected segment is a `surface` pill at `level-1`; labels in `label-md`.

**Modal / sheet.** Glass at `level-4`, radius 30px, padding 20px; scrim is `on-surface` at about 40%. Title `headline-sm`, actions in a row: `button-secondary` then `button-primary`, or stacked on mobile.

**Tooltip / popover.** Glass at `level-3`, radius `rounded.xl`, text in `body-sm`.

**Table.** Header in `label-md` on `on-surface-variant`, rows on `surface`, hover `surface-container-low`, numeric columns right-aligned, no gridlines or borders.

## Media Adaptation

**Slides (16:9).** Design on a **1280×720** canvas where token sizes apply at 1:1 (`headline-display` 39px titles, `headline-md` card titles, `body-md`/`body-lg` text, `label-md` chrome, radii and padding exactly as tokens). Export at 1920×1080 by scaling the whole canvas uniformly by 1.5 (type, radii, padding, gaps together). The cover title is `headline-display` at 2× (about 78px). One idea per slide; at most a title, one short paragraph and one group of tiles. Slide archetypes:

| Slide | Background | Layout |
|---|---|---|
| Cover | `background` with the orb cluster | Title top-left (bold, 2× display), company and date meta pills bottom-left, orbs at the right edge |
| Contents (4 or 6 items) | Blue wash | Title, one row of equal agenda cards |
| Speakers / team | Blue or pink wash, or `background` | Row of six circular avatars in one card, or six photo tiles with bios beneath |
| Welcome / people | Pink (or yellow) wash | Title and one short text left, large photo tile right, name as meta pill |
| Promotion / achievements | `background`, yellow or pink corner-gradient cards | Photo tile beside a gradient title card and a text card |
| Program / information | Blue wash (flat) | Text left, "At a glance" card center, image tile right |
| Goals / metrics | Yellow wash or corner-gradient card | Large statement card, accent-tint stat tile, photo tile, bullet card |
| Project overview / highlight | Yellow wash (left edge) or `background` | Photo tiles and a project details card; pill link at the bottom |
| Timeline / Gantt | `background` | Title left, phase legend pill right, bars on a month grid |
| Next steps | Blue wash | Four full-width rows: date, step, owner |
| Feedback / thanks | `background` (orbs on thank-you) | One glass card with three question pills; contact card with avatar |

**Orb cluster.** Three overlapping circles about 30% of the canvas width in diameter, stacked vertically at the right edge and partly off-canvas top and bottom. Top (back): `linear-gradient(180deg, accent-2-500, transparent 75%)`. Middle (front, glass): `linear-gradient(180deg, accent-1-500, transparent 70%)` with 65% `surface` and a 12px blur. Bottom (back): `linear-gradient(0deg, accent-3-500, transparent 75%)`. Orbs are decoration only; no text on them.

**Full-bleed photo slide.** Photo fills the canvas with a `inverse-surface` scrim at about 35%; title and chrome in `inverse-on-surface`; text cards are opaque `surface`.

**Social and graphic cards (1080×1350 and 1200×630).** Same recipe as a slide: one accent wash, one opaque or glass white card, one headline in `headline-display`, one meta pill. Safe margin is 6% of the shorter edge. At most two type levels. Do not put text directly over a busy image without a card.

**Image generation prompt fragment.** "Soft pastel gradient backdrop in powder blue, butter yellow and blush pink on a light gray background; overlapping translucent frosted-glass spheres with smooth gradients and gentle diffused studio lighting; clean, airy, friendly, minimal, generous negative space; no text in the image." Avoid: saturated neon, heavy outlines, harsh drop shadows, cluttered compositions, skeuomorphic chrome or metal, film grain, embedded lettering.

**Charts.** Categorical or phase-coded data uses the accent order pink `accent-3-500`, yellow `accent-2-500`, blue `accent-1-500` with #000000 labels on the fills. Quantitative series order: `primary-500`, `secondary-500`, `tertiary-500`, `link-500`, then the accents. Gridlines and month dividers are 1px `outline`. Axis labels in `label-md` `on-surface-variant`. Bars and pills use `rounded.full`; chart containers sit in a card and use `rounded.lg`. Never encode meaning by color alone; add direct labels.

## Iconography

Material Symbols Rounded icons, about 1.5–2px stroke at 20–24px, round caps and joins, no fills except selected states. Section markers and corner arrows are a solid `button-inverted` circle with an `on-button-inverted` glyph (for example a small arrow before a title, or a corner arrow on a tile). Circular icon buttons (44px hit target minimum) sit on `surface-container-high`; a selected state fills the circle with `primary` and the icon with `on-primary`. Icon color is `on-surface` or `on-surface-variant`, never a palette shade.

## Imagery

Two image families. **Portraits:** bright, evenly lit studio portraits with plain or softly blurred light backgrounds; circular avatars or rounded-corner tiles at the card radius. **Landscapes:** soft, misty, desaturated nature and horizon scenes in cool blue-gray and neutral tones (forest, mountains, snow, clouds) that sit quietly beside pastel washes. Images are clipped to the card radius; never place text directly over a photo without a card or scrim; do not mix busy multicolor photos with a saturated wash.

## Do's and Don'ts

**Do**

- Put reading content on white (glass) cards over the shared diagonal accent wash — see Elevation & Depth → Page backdrop.
- Use the 30px card radius for cards and same-row photo tiles, 20px for tiles inside cards, and `rounded.full` for pills, bars and avatars, exactly as the tokens define.
- Reserve `primary` fills for one main action per view; use `button-inverted` for a second strong action or on imagery.
- Use the fixed phase order pink, yellow, blue for staged content and charts.
- Keep neutrals at roughly 85–90% of the content area; separate content with `md`, `gutter`, `xl`, `3xl` spacing and tonal steps, not lines.
- Set letter-spacing to 0 on CJK headlines and keep CJK body line-height at 1.6 or more.
- Use `on-*-container` on `*-container` for status text, and keep the 1px `outline` edge on inputs, outlined buttons and unchecked selection controls.

**Don't**

- Don't copy radii, sizes or weights from a template, OS or platform when the tokens define them.
- Don't mix multiple accent washes outside of the shared page backdrop, the orb cluster or phase-coded charts, and don't put small body text on a wash without a card.
- Don't pair accent fills with `on-surface`; their label color is always #000000.
- Don't draw a border around a nested card or a list row (those still have none); a glass card's own 1px edge is the one allowed exception, not a general license to add borders.
- Don't stack glass on glass, and don't use blurred glass cards over photography; use opaque `surface`.
- Don't set text smaller than `headline-sm` on a `secondary` (#0d9488) fill, or rely on `tertiary` as a lone button boundary.
- Don't use `label-sm` (10px) for CJK text, and don't use italics on CJK.
- Don't put a checkbox and a radio in the same group.
- Don't wrap text and icons inside flex containers (like buttons or tabs) in an extra `<span>`; pass them as direct children and use `line-height: 1` to ensure perfect vertical alignment.
