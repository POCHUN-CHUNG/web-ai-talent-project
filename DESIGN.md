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
    fontSize: '16px'
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
    padding: '14px 24px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-secondary:
    backgroundColor: '{colors.button-secondary}'
    textColor: '{colors.on-button-secondary}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '14px 24px'
  button-inverted:
    backgroundColor: '{colors.button-inverted}'
    textColor: '{colors.on-button-inverted}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '14px 24px'
  button-outlined:
    textColor: '{colors.button-outlined-text}'
    typography: '{typography.label-lg}'
    rounded: '25px'
    padding: '14px 24px'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.on-surface}'
    typography: '{typography.input-text}'
    rounded: '30px'
    padding: '12px 24px'
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
- `secondary` and `success` are the same value (#0d9488). Never use secondary for something that could be read as a success state. **Exception — market direction:** following the Taiwan stock-market convention, a fall or a loss is shown in `success` teal-green and a rise or a gain in `error` red (see Components → Financial figures). This is the only place `success`/`error` mean something other than success/failure.
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

**Levels and roles.** On mobile (≤734px) every level is 2px smaller (for example `headline-lg` 29px, `body-md` 14px); `tokens.css` switches them automatically.

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
| `input-text` | 16px (14px on mobile) / 400 / 1.4 | Text typed into any pill-shaped input |

**Hierarchy collision.** `headline-sm` and `body-lg` are both 20px. Never place `body-lg` directly under `headline-sm`; they differ only by weight and would read as one level. Under `headline-sm` use `body-md`. Use `body-lg` only under `headline-md` or larger, or as a standalone statement.

**Small text.** `label-sm` (10px) is below the 12px readability floor. Use it only for uppercase Latin micro-badges or a numeric superscript, never for a CJK sentence and never as the only carrier of information. For CJK labels the minimum is `label-md` (14px; 12px on mobile).

**CJK rules.**

- Headline levels use negative letter-spacing (`headline-display` -0.025em, `headline-lg` -0.02em, `headline-md` -0.01em). This is tuned for Latin. **Set letter-spacing to 0 on any CJK text** in those levels.
- Body line-height for CJK paragraphs is at least 1.6. `body-md` already meets it; `body-lg` and `body-sm` (1.55) are for short CJK strings only. Long CJK paragraphs use `body-md`.
- No italics on CJK; use weight 600 for emphasis. Latin subtitles or role names are set upright in `body-sm` with `on-surface-variant`, not italic.
- Keep a half-width space between CJK text and Latin words or digits; do not mix full-width and half-width punctuation in one sentence.

**Measure.** 60–75 characters per line for Latin, about 30–40 characters per line for CJK.

**Color of text.** `on-surface` for headings and body. `on-surface-variant` for captions, chrome and helper text. `link` only for inline links. On accent fills text is #000000. Never set text in `secondary` or `tertiary` fills below `headline-sm` size.

**Justified text blocks (required).** Any block of text that is wider than its container and wraps onto more than one line is justified (`text-align: justify`), so both edges line up; the last line stays left-aligned. This covers notice boxes, modal and alert messages, the AI analysis paragraphs, form help notes and any similar paragraph. It does not apply to one-line labels, numbers, buttons, table cells or deliberately centered empty-state hints (justifying those would push their single last line to the left).

## Layout & Spacing

**Spacing scale** (4px base; inferred, since the tokens define none): `xs` 4px, `sm` 8px, `md` 16px, `lg` 24px, `xl` 32px, `2xl` 48px, `3xl` 64px, `gutter` 24px, `margin` 32px.

**Where each step goes.**

- Inside components: `xs`–`sm` (icon-to-label gaps, chip padding, marker padding), `md` (input horizontal padding), `lg` (button horizontal padding). Card and nested-card padding is the fixed 20px from the tokens.
- Between cards in a web grid: `gutter`. Between tiles on a slide: `md`. Between unrelated groups: `xl`–`2xl`.
- Between page sections and between the cards stacked on a web page: `lg` (24px) on desktop, `md` (16px) on mobile (≤734px) — the app keeps sections close together; `3xl` is for slides only. Use air, not extra dividers, to separate sections.

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

**Liquid glass (the app's second glass recipe).** Floating chrome and emphasized panels use a lighter, more "liquid" glass than cards: `background: color-mix(in srgb, surface 30–45%, transparent)`, `backdrop-filter: blur(10–20px) saturate(180%)`, a `1px` edge in white at 65% (`--liquid-glass-edge`), and a rim of inner light modelled on the iOS 27 Tab Bar (`--liquid-glass-rim`): `inset 1px 1px 0` white at 85% (brighter top-left highlight), `inset -1px -1px 0` white at 50% (softer bottom-right highlight) and `inset 0 0 12px` white at 30% (a soft inner glow), so the whole edge catches light like glass instead of only the top; then the element's elevation level. There is no dark inner shade at the bottom anymore. Both values are tokens in `tokens.css`; use them rather than repeating the literals. Where it is used:

| Element | Surface opacity / blur |
|---|---|
| Top tab bar (desktop) and mobile bottom tab bar | 30% / 10px — the most transparent; never make it white |
| Notice box (`Notice` component), Settings section cards | 45% / 20px |
| Modal | 75% / 24px, `level-4` |
| Info popover (`InfoPopover`) | 90% / 24px, `level-4`, plus a 1px `on-background` 12% outer ring so it stays visible over a white card |

Popover menus (the account menu and the `⋮` more menu) do **not** use liquid glass; they use the same glass as the page content cards (75% `surface`, `blur(24px) saturate(150%)`, the 1px dark glass edge) with a `level-3` shadow, so they are lighter than an opaque sheet yet stay readable over a dark button underneath.

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

**What this looks like.** At default heights (about 50px buttons, about 48px inputs) the button and input radii exceed half the height, so both render as full pills. Cards at 30px read as generously rounded panels; controls inside them keep smaller radii by their own tokens.

**Nesting.** A nested card is 20px inside a 30px card with 20px padding. Ideal concentric rounding would be 10px (30 − 20), so the corners are not concentric; this is how the source tokens define it and it is kept as specified. Media that runs edge to edge inside a card is clipped by the card's 30px radius.

**Full.** `rounded.full` is allowed for radio buttons, chips, pills, avatars, switch tracks, orbs and circular icon buttons. Checkboxes must not be full circles.

**Checkbox versus radio.** Checkbox radius is 15px on a 20px control, which renders as a circle and looks identical to a radio. They are distinguished by construction: a checked checkbox is a solid `primary` fill with no inner mark; a selected radio is a `primary` ring with an inner dot. Do not use both in the same group.

**Borders.** By default nothing draws a line: `borderWidth` and `subcardBorderWidth` are 0px, and separation comes from air, tone and shadow. Controls keep a 1px `outline` edge because they would otherwise disappear (input, outlined button, unchecked checkbox/radio). Allowed exceptions, and only these:

- the 1px glass edge on glass surfaces (see Elevation & Depth);
- a 1px `outline-variant` hairline under a card's title row (for example the portfolio cards on the list page);
- the 1px `outline-variant` edge of an outline stat tile (see Components);
- the 1px dashed `outline` edge of an empty state (see Components).

## Components

All components use tokens from the frontmatter. Shared state rules: focus-visible is a 2px `focus-ring` outline with a 1px offset; disabled is 38% opacity with no shadow and no hover; pressed reuses the hover color.

**Button primary.** `primary` fill, `on-primary` label in `label-lg`, radius 25px, padding 14px 24px (about 50px tall, so it renders as a pill). Hover `primary-hover`. At most one per page header and one per section card: a long dashboard page may have a primary action in its header (for example 新增持股) and one in the top-right of each section card that owns an action (for example 新增持股 on the holdings card, 進行風險分析 on the analysis-report card).

**Button secondary.** `button-secondary` fill, `on-button-secondary` label, same geometry. Hover `surface-container-high`.

**Button inverted.** `button-inverted` fill, `on-button-inverted` label, same geometry. Hover drops opacity to about 88%. Use on imagery, and as the strong action beside an outlined "Learn more".

**Button outlined.** Transparent fill, `button-outlined-text` label, 1px `outline` edge, same radius and padding. Hover matches the primary button's solid identity rather than a light tint: fill becomes `button-outlined-text`, label becomes `surface`, `level-1` shadow appears.

**Button danger.** Transparent fill, `error` label and 1px `error` edge, same radius and padding — an outlined button in the error color rather than a solid error fill at rest, so it doesn't compete with the one `primary` action on the page. Hover matches the primary button's solid identity: fill becomes `error`, label becomes `on-error`, `level-1` shadow appears. For destructive-but-common actions like signing out (not data-destroying actions, which still want a confirmation step elsewhere).

**Meta pill / link pill.** `rounded.full`, `surface` fill, `on-surface` label in `label-lg` (or `label-md` for chrome-sized pills), padding `sm` (8px) vertical and `lg` (24px) horizontal. Used on washes and photos for company name, date, "Add a link" and speaker-name captions. On a white card use `button-secondary` fill instead so the pill remains visible. No shadow.

**Input.** Transparent fill (no `surface-container-lowest`, no translucent surface tint — revised: a filled or even tinted pill read as one visual step too many stacked on a glass card), `on-surface` text in `body-md` (or `input-text` on an entry-page pill input), radius 30px, padding 12px 24px, 1px `outline` edge, placeholder in `on-surface-variant`. Focus: the 1px edge switches to `focus-ring` and an inset 1px `focus-ring` shadow is added inside it, so it reads as a 2px ring while the border width and the layout never shift. Error: edge in `error`, helper text in `body-sm` using `on-error-container` on `error-container`. Labels sit above in `label-lg`. Never rely on the browser's native validation bubble (`required`'s default tooltip) — submit with `noValidate` and show the same failure as an inline status chip below the form, styled like any other error.

**Input placeholder (required).** Every text, number and password field shows a placeholder by default, in Traditional Chinese. It always starts with 「請」 and only says what to enter (for example 「請輸入投資組合名稱」, 「請輸入代號或名稱」, 「請輸入股數」, 「請輸入新密碼」); it never gives an example value such as 「如 1000」. Placeholder text is `on-surface-variant` at 60% opacity, and it never replaces the visible label above the field.

**Buttons are never disabled (required).** Submit, save, create and similar action buttons are never greyed out because of missing or invalid input. They stay clickable; on click the form checks every field (required values, formats, lookups such as an unknown stock code) and shows what is wrong in the red error chip (see Form messages). The only allowed non-clickable state is the brief `busy` spinner while a request is in flight.

**Numeric inputs.** Quantity and amount fields are plain text inputs without browser spin buttons; the user just types the number. A share quantity (「數量」) accepts whole numbers greater than 0 only (`inputMode="numeric"`, non-digits are filtered out as the user types, and the error reads 「數量須為大於 0 的整數」).

**Search box with attached results (combobox).** A search field (for example the 標的 picker) sits in a fixed-height slot; while results are open, the field and its result list become **one floating box** above the form (so nothing below shifts): `rounded.xl`, `level-3` shadow, the field part on `surface-container` and the list part on `surface`, with a single frame all the way round — a 1px `focus-ring` border plus a 1px `focus-ring` outline drawn just inside it on top of everything, so the frame reads as 2px (the same weight as a focused input), never breaks at the joint and never shows a line between the field and the list. The list shows at most six options (row height = `body-sm` × 1.5 + 20px) and scrolls beyond that. Each option is a rounded row (`rounded.lg`); the current option (moved to with the arrow keys or by the mouse — hovering makes that row current, so only one row is ever gray) turns `surface-container`. **Keyboard:** ↑/↓ move the current option (stopping at the first and last option — never wrapping around — opening the list if it was collapsed, and scrolling it into view while keeping the list's 4px inner padding between the current option and the list edge, so the highlight never touches the edge); Enter fills in the current option; if no option is current, Enter fills it in directly when the match is unambiguous — only one result, or a code that exactly matches the typed text (for example 「2330」) — even if the user presses Enter before the search has finished; otherwise Enter just opens the list with the first row current. After a keyboard selection the cursor moves on to the next text field (數量). Esc with the list open only closes the list, not the modal. Enter in the search box never submits the form. Clearing the text closes the list. A query with no matches shows a single non-selectable 「查無資料」 row in the list (neutral `on-surface-variant`, never red text or an error chip). While there is a query, the field's right side is a collapse/expand icon button: collapsing keeps the typed text, and clicking the field again reopens the list. Clicking anywhere else also only closes the list — the typed text is always kept. After a selection the field shows the chosen value (for example 「2330 台積電」) with a clear icon button to choose again. When the value may not be changed (for example the 標的 of a record being edited), it is shown as a read-only value field (see Read-only value fields) instead of a search box.

**Date picker.** Modelled on the iOS date picker: a white rounded popover (`rounded.xl`, `level-3`) under a plain text trigger field (no calendar icon inside the field). Header: bold 「2026 年 9 月」 on the left followed by a blue `chevron_right`, and previous/next month arrows on the right in `on-surface`. Tapping the title switches the body to Apple-style year/month wheels — two side-by-side scrolling columns that snap to one row, with a `surface-container` rounded band marking the selected row and the top and bottom rows fading out; the chevron turns downward while the wheels are shown, months outside the data range are faded, and tapping the title again returns to the calendar. Weekday headings are small `on-surface-variant` labels and **weeks start on Sunday**. Days are round cells; today is a solid black circle (`button-inverted`) with white text, the selected day a solid primary-blue circle (`primary`) with white text (`on-primary`), and unavailable days (for example market holidays with no price data) are faded and cannot be picked. When a stock is chosen and no date is set yet, the picker pre-selects the most recent date that has data, so users do not accidentally enter a holiday.

**Read-only value fields.** Values the system fills in (for example the purchase-date price and the resulting cost) look like inputs but with a `surface-container-highest` fill (dark enough to read as a field on a translucent modal) and no edge; they show 「—」 until a value is available and 「查詢中…」 while loading. Never place a separate explanatory paragraph box inside a form to describe them.

**Form messages (required).** Error messages for input fields (and a form's success message, such as a changed password) use the status chip: the `Chip` component with the `error` variant (or `success`) — `*-container` fill, the raw status color for text and the leading icon, a 1px edge at 35% of that color, `rounded.full`. It sits **between the last input field and the button row**, never below the buttons and never as plain red text next to a field. A form shows one message at a time in that slot. This applies to every form: login and register, change password, new portfolio, rename, add purchase, questionnaire and any new one.

**Checkbox and radio backgrounds follow the same rule**: per Shapes → Checkbox/Radio below, the unchecked/unselected state is already transparent (just the 1px `outline` edge) — that hasn't changed, it's restated here because inputs now match it: no control's resting background should compete with the glass card behind it.

**Card.** `surface` fill (glass at 75% over a wash; opaque over photography), `on-surface` text, radius 30px, padding 20px, `level-1`, no border. Anatomy for contents/agenda cards: number in `label-lg` top-left, optional accent dot top-right (16px, `accent-N-500`), title in `headline-md` (`headline-sm` in six-column layouts) in the middle, reference in `label-md` `on-surface-variant` at the bottom ("Slide 03").

**Corner-gradient card.** A card may carry one accent gradient in its top-left corner: `radial-gradient(90% 90% at 0% 0%, accent-N-500, transparent 70%)` over `surface`, for hero statements and key stats (yellow for goals, pink for people). Text stays `on-surface`.

**Nested card / stat tile.** `surface-raised` fill (or an accent tint: `accent-1-200`, `accent-2-300`, `accent-3-200`), radius 20px, padding 20px, no border, no shadow. Stat tile: numeral in `headline-lg`, caption in `body-md`. Text color is `on-surface` on `surface-raised` and #000000 on accent tints.

**Outline stat tile.** Inside a glass card (for example the portfolio overview), small stat tiles have no background, no blur and no shadow — only a 1px `outline-variant` edge and the nested-card radius (20px) — so they never become glass on glass. Title in bold `label-lg`, value centered. **Values never wrap:** a figure always stays on one line. On mobile (≤734px) the tiles use 12px padding, the value drops to `headline-sm` and the ▲/▼ % line to `body-md`; if a value still does not fit (a very large amount or a very narrow phone), its font size is scaled down just enough to fit on one line (the `FitLine` helper in the detail page).

**Checkbox.** 20px, radius 15px. Unchecked: transparent with a 1px `outline` edge. Checked: solid `primary` fill, no glyph.

**Radio.** 20px, `rounded.full`. Unselected: 1px `outline` ring. Selected: `primary` ring with an inner dot.

**Slider.** Track 8px high in `primary-container`, radius 15px; filled portion and thumb in `primary`; thumb 24px, radius 15px. Show the current value as text next to the label, in `label-md`.

**Chip.** Neutral chip: `surface-container-high` fill, `on-surface` text in `label-md`, radius `rounded.full`, padding 4px 8px. Status chips use the `*-container` fill with the raw status color (not `on-*-container`) as the text/icon color — `error` text on `error-container`, etc. — plus a 1px edge at `color-mix(in srgb, [status] 35%, transparent)`: at the container tint's usual low contrast, a status chip on a busy wash background reads as "roughly the same beige as the page" without the saturated text and the edge doing the work of separating it. Never use `secondary-container` or `tertiary-container` for a neutral chip; they look like the success and warning containers.

**Link.** `link` color, `body-md`, underlined with a small offset. Hover darkens one step (`link-700`).

**Number pill and category dot.** Number pill: `rounded.full`, `surface` fill, `label-lg`, padding `xs` (4px) vertical and `sm` (8px) horizontal (e.g. "01"). Legend circle: `rounded.full`, accent-N-500 fill with #000000 number. Category dot: 16px circle in `accent-N-500`. The accent order is fixed: 1 = pink (`accent-3`), 2 = yellow (`accent-2`), 3 = blue (`accent-1`), matching the template's phase order.

**Agenda / next-steps row.** Full-width row card: radius 30px (a pill at row height), `surface` fill, padding `md` (16px) vertical and `lg` (24px) horizontal; columns: date (`label-lg`, fixed width), step description (`headline-sm`, flexible), owner (`label-lg`, right-aligned). Rows are separated by `md` (16px), no lines.

**Gantt bar and legend.** Bar: `rounded.full`, phase accent fill, #000000 label in `label-md` ("Date – Date"), height at least `xl` (32px). Legend: a `surface-container-high` pill holding three legend circles with phase names in `label-lg`. Month header in `label-md` `on-surface-variant`; month dividers are 1px `outline` vertical lines; task labels in `body-md` with a category dot.

**Photo tile and avatar.** Photo tile: image clipped by the card radius (30px), same height as the row's cards. Avatar: circle (`rounded.full`), optional 3px rim in `accent-2-500` on one side. Name in `label-lg`, role in `body-sm` `on-surface-variant`. A speaker-name caption may overlay the photo as a meta pill.

**Toolbar / navigation bar.** Sticky, glass at `level-2`, radius `rounded.full` when floating or full-width with no radius when docked. Title in `label-lg`, actions as circular icon buttons (40×40px button, 22×22px icon, transparent at rest; see Iconography).

**Entry header.** Fixed to the top of Login, Register and Settings, transparent (no glass, no shadow, sits directly on the page backdrop), edge-to-edge — **no max-width or centered content column**: the logo sits flush against the true left edge of the viewport and the account icon flush against the true right edge, each inset only by `margin` (32px), `lg` (24px) top/bottom padding. Left: a 40px circular `primary` badge with an `on-primary` icon (the product mark); signed in, "診股整股" appears beside it in `label-lg`/700/`primary`, and the whole logo-plus-text block becomes a plain click target back to Home — no hover state, since it's identity chrome rather than a button. Signed out (Login/Register), it's icon-only and inert. Right: one circular icon button, 36px, transparent, `on-surface-variant` icon, hover fill a translucent `on-surface` overlay (not a flat token, so it reads as gray over any part of the wash) — the account icon (`person`). The icon button's `:focus-visible` state is the standard 2px `focus-ring` outline with 1px offset, not the browser default.

**Account menu.** When signed in, the account icon opens a popover instead of navigating directly: the page-card glass (75% `surface`, 24px blur, 1px glass edge, `level-3` shadow — see Elevation & Depth), `rounded.xl`, anchored top-right under the icon, closes on an outside click. Two items, each full-width, `body-md`, centered, hover fill (a translucent `on-surface` overlay); item radius scales with the popover's own radius rather than using a fixed token — `rounded.xl` minus the popover's own padding, the same concentric-rounding relationship as a nested card: "設定" (navigates to Settings) and "登出" in `error` color (calls `/auth/logout`, clears the session, navigates to Login). Signed out (only possible on Login/Register, since Settings requires a session), the account icon is inert — there is no menu to show.

**More menu (`⋮`).** Cards that can be edited or deleted (for example a portfolio card) carry a `more_vert` icon button (40×40px, see Iconography) in their top-right corner, vertically centered with the card title. It opens a popover styled exactly like the account menu (page-card glass, `rounded.xl`, centered full-width items); destructive items such as 刪除 use the `error` color. The button sits outside the card's link so clicking it never opens the card. Choosing 刪除 never deletes directly — it always opens a confirmation modal first. In code this is the `MoreMenu` component.

**Empty state.** When a page or section has no data yet (no questionnaire, no portfolios, no holdings), show one block with a 1px dashed `outline` edge, `radius-card` (30px), no background and no shadow, containing a single centered sentence that points at the action button in the header — for example 「請點擊右上角「新增持股」，建立完整的庫存明細」 (no icon, no title, no trailing period). The action button itself stays in the page header's top-right, never inside the empty block. While a page is empty, hide the notice box, the data-update time and any action that needs data (such as 進行風險分析).

**Sidebar.** `surface-container-low` panel, grouped lists with `label-md` section labels in `on-surface-variant`. Selected row: `surface-container-high` fill with `rounded.md`.

**Form / list group.** One nested card per group; one row per setting; label left in `body-md`, value or control right in `on-surface-variant` or the control itself. Rows are separated by `sm` spacing, not lines.

**Enter to continue (required).** Every screen or modal with input fields is a real form with a submit button. Pressing Enter in a field moves focus to the next field; pressing Enter in the last field runs the form's confirm/submit action (save, create, log in, change password…), so the user never has to reach for the mouse to continue. If the submit button is disabled (for example a required field is still empty), Enter does nothing. Enter while an input method is composing text (Zhuyin, Cangjie and similar) only confirms the characters and never jumps or submits. In code, attach the shared `enterToNextField` handler (`frontend/src/formKeys.ts`) to the form's `onKeyDown`.

**Switch.** Track `rounded.full`, about 44px by 28px; off `surface-container-highest` with a 1px `outline` edge, on `primary`; thumb 24px in `surface`.

**Segmented control / tabs.** Pill container in `surface-container-high`; the selected segment is a `surface` pill at `level-1`; labels in `label-md`. The selected pill is one sliding indicator, animated exactly like the top navigation bar's tab indicator: it slides to the new segment with a slightly springy curve (`cubic-bezier(0.32, 0.72, 0.35, 1)`, 0.38s for position and width) and briefly scales up when pressed (quick 0.16s grow, 0.32s settle); no animation when the user prefers reduced motion.

**Modal / sheet.** Liquid glass (see Elevation & Depth → Liquid glass) at 75% white with `level-4`, radius 30px, padding 20px; the scrim is `on-surface` at 22% plus `blur(20px) saturate(140%)`. Title `headline-sm`, actions in one row: `button-secondary` then `button-primary` (see the rules below). No focus ring (outline) on the modal container itself when clicked.

- **No close button (required).** Modals and dialogs never have a close (×) icon in the top-right corner.
- **Close only by a button (required).** A modal closes only when the user clicks one of its buttons (取消, 確認, 刪除, 關閉…). Clicking the scrim or blank space inside the modal does nothing, so nothing is dismissed by accident. The Esc key is the one keyboard exception: it does exactly what the modal's cancel button does (取消, or the single 關閉/確認 button on a one-button alert). Every modal therefore needs at least one button that closes it; a form modal always has 取消 next to its submit button.
- **Width (required).** On desktop every modal is **450px** wide; on narrow screens it shrinks to the viewport minus the `md` (16px) side padding.
- **Never blur the navigation, block everything behind (required).** The scrim blurs and dims the page but sits **below** the top bar and the mobile bottom tab bar (scrim z-index 40, top bar 50), so both stay sharp and visible. Above them sits a transparent interaction layer (z-index 60) that holds the centered modal, so while a modal is open nothing behind it can be used: the page does not scroll (scrolling is locked) and the top bar and tab bar cannot be clicked. Only the modal responds. Never open a modal with the native `<dialog>.showModal()` top layer, which renders above everything including the top bar. In code, every modal and alert (including one-button alerts and gate prompts) uses the shared `Modal` component; no page builds its own scrim.
- **Full-width actions (required).** The action buttons at the bottom share the full width equally: two buttons (for example 取消 + 儲存, or 取消 + 刪除) each take half; a single button (for example 建立) takes the whole row. Secondary on the left, primary on the right, always in one horizontal row — on mobile too; they never stack into multiple rows.

**Tooltip / popover.** Glass at `level-3`, radius `rounded.xl`, text in `body-sm`.

**Info popover (iOS style).** When a title note does not fit on mobile, show only a 40×40px `info` icon button (see Iconography); the note opens in a popover below it — liquid glass (see the table above), `rounded.xl`, padding 12px 16px, `body-md` `on-surface` (large enough to read on a phone), justified, with **no arrow** — it simply appears 8px below the icon (growing out from the icon's position), with a 1px outer ring so it stays visible over a white card. It opens on mouse hover or on click/tap; a tap on the icon again, a tap outside or Esc closes it, and it follows the icon while the page scrolls, staying at least 16px from the screen edges. In code this is the `InfoPopover` component.

**Financial figures.**

- **Units** (元, %) follow the number, are smaller (`body-sm`, 400) and `on-surface-variant`, with a 4px gap; when the value is missing ("-") the unit is hidden.
- **Up/down color follows the Taiwan market convention:** a gain or a rise is `error` red, a loss or a fall is `success` teal-green, zero is neutral `on-surface`. This applies to P&L amounts, returns and annualized returns, and to the mini trend charts beside them (the chart color follows its number's color; a number that is not colored, such as total market value or invested cost, gets a neutral gray chart).
- **Percentages inside tables** (for example an unrealized return under its P&L amount) use the same ▲/▼ triangle, no sign, and a small `%` unit — here the `%` takes the same up/down color as the number instead of neutral gray.
- **Change percentages** sit on the line below the amount, one size smaller (`headline-sm`), in the same color, led by a solid triangle — ▲ for up, ▼ for down, drawn at about 70% of the number's size — with no plus or minus sign, and the `%` in the small unit style.
- **No value is always 「N/A」 (system-wide).** Any value that is missing, cannot be computed or has no data yet — an annualized return for a holding under 30 days old, a value with no price, a read-only field that has nothing to show yet (for example 每股價格 and 持有成本 before a stock and date are chosen), an empty timestamp — shows 「N/A」. Never use 「-」, 「—」 or a blank for this, and do not show a unit (元, %) after 「N/A」. In code the text comes from the `NA` constant in `frontend/src/format.ts`, and the shared formatters (`money`, `signedMoney`, `decimal`, `pct`, `formatDateTime`) already return it for empty values. A loading state is different: while a value is being fetched, show a loading text such as 「查詢中…」, not 「N/A」. In an overview metric card, 「N/A」 replaces both the number and the mini chart and is centered in that whole area below the card title.
- **Mini trend charts** use the card number's up/down color, except amounts that have no up/down meaning — 目前總市值 and 總投入成本 — which use the primary blue (`primary-500`, the same as the market-value line).
- **Mini trend charts** (overview cards) show the last month — or all available data when there is less than a month of history. Each chart starts at its own first real data point and stretches across the full width; never fill in or estimate values just to make charts start on the same day (for example, the daily-P&L chart starts on the second day, because the first day has nothing to compare with); their zero line sits on the bottom edge unless the month has negative values, in which case room is left below zero.

**Table.** Header in `label-md` on `on-surface-variant`, rows on `surface`, hover `surface-container-low`, numeric columns right-aligned, no gridlines or borders.

**Chart captions.** A chart card's caption row has the bold title on the left and a short `body-sm` `on-surface-variant` note on the right (for example 「依目前市值」, 「面積：市值，顏色：報酬率」); explanatory pairs use the full-width colon 「：」, never 「＝」, and several pairs are separated by 「｜」 (for example 「面積：市值｜顏色：報酬率」).

**History trend (歷史走勢).** One section card (24px padding) with **no section title**. At the top is a full-width segmented range control with equal-width segments (1 個月, 3 個月, 6 個月, 1 年, 3 年, 5 年, 10 年, 全部 — only ranges shorter than the available history are offered, plus 全部). Below it, two stacked blocks that share the range and the time axis. Neither chart draws grid lines; instead both draw a light `outline-variant` line at the top and bottom limits of the plot and a neutral **0 baseline**. The amount axis always includes 0 (the market-value chart starts at 0) and uses round steps (1, 2, 2.5 or 5 × a power of ten, about four steps), so both limit lines and the 0 baseline sit exactly on labelled ticks.
- **Block header.** The chart title in bold `headline-sm` on the left (「市值變化」, 「損益變化」) immediately followed by the range's period — a `schedule` icon and 「2026-06-09 ~ 2026-09-24」 in `body-sm` `on-surface-variant` — and the readout on the right in the same row, vertically centered (wrapping when there is no room). There is no explanatory note.
- **市值變化** — the market value as a 2px `primary-500` line over a flat light fill of the same color (12% opacity, no gradient), and the cumulative invested cost as a 1.5px dashed neutral line. 280px tall (230px on mobile).
- **損益變化** — one P&L line with its area, red above the 0 line and green below it (Taiwan convention), and a solid neutral 0 line. 200px tall (170px on mobile).
- **Readout.** Each series with its line key (solid or dashed) as the legend, the label, the amount in bold `body-md` and 「元」 as a small unit; the P&L return follows 「元」 directly (the full-width bracket already carries its own spacing) and reads 「（ **+6.71** % ）」 — a half-width space inside each bracket and between the number and 「%」 — the number bold like the amount, the parentheses and 「%」 in the small unit style, with a half-width space before 「%」 — all in the up/down color. It shows the values of the last day of the range until the user points at a chart (the pointed date appears in the crosshair's date label).
- **Time axis.** Ranges of one month or less show five evenly spaced trading days. Longer ranges put every tick on the 1st of a month, using the first interval that fits — every month, every quarter (1/1, 4/1, 7/1, 10/1), every year, every 2 years, every 5 years — with at most 8 ticks on desktop and 4 on mobile; so 3 and 6 months tick monthly, 1 year ticks quarterly, and 全部 ticks quarterly or yearly depending on its length. Labels read 「M/D」; when the range crosses a year boundary the first label carries the year (「2025/10/1」), and yearly-or-longer ticks always carry the year. Amount axis labels use the compact form (「150萬」).
- **Crosshair (trading-software style).** Pointing at either chart (mouse move; tap or drag on touch, with vertical page scrolling still allowed) snaps a **solid** vertical line to the nearest trading day on **both** charts at once, with hollow dots on each series at that day; the chart under the pointer also draws a **solid** horizontal line at the pointer height, with dark `on-surface` pill labels showing the amount at that height on the left axis and the full date on the time axis. Leaving the chart, changing the range or resizing the window clears it. There is no floating tooltip — the readouts carry the values.
- **Smoothness.** The crosshair lives on its own transparent layer above the chart and updates at most once per animation frame; the chart underneath only redraws when the data, range or width changes, never while the pointer moves.

**Chart legend list.** The treemap cards (產業別, 個股別) have a fixed height of exactly six list rows, so the two cards in a row are equal; a treemap without a gradient scale fills that height to its bottom with no extra space underneath. Donut and treemap cards share one layout: a 200px chart column, a 24px gap, then the list, so the lists of all cards in a grid start at the same left edge. The list (dot, name, value) grows with its items up to the full height of the chart beside it (including any gradient scale under it, so a full list lines up with the chart at both top and bottom) and then scrolls inside itself; when there are few items it is vertically centered against the chart. List text is never shrunk for long lists. **Scrolling snaps one whole row at a time** (scroll snap on each row), so a list only ever shows complete rows — never a row cut in half at its top or bottom edge; visually only the content changes while the list box stays put. Donut lists are at most five rows tall on desktop too. On mobile (≤480px) the list moves under the chart, the card grows with the number of items, and the list is exactly five rows tall at most (row height = text size × 1.6 + 12px) before it scrolls; donut lists follow the same five-row rule on mobile. Names that do not fit end in an ellipsis and never overflow the card. Donut slices and treemap tiles show the pointer (hand) cursor on hover. Hovering or clicking a row highlights the matching slice or tile, and hovering a slice or tile scrolls the list to its row.

**Title note.** A short explanatory note can sit right after a page or section title in the same row; its icon is vertically centered with the text (the same applies to notice boxes) — `body-sm` `on-surface-variant` with a leading 16px `info` icon, 12px from the title, wrapping below it when space runs out (for example the questionnaire's 「共 14 題，皆為必填」 and the holdings card's unit-price note). On mobile (≤734px) the holdings card's note collapses to the `info` icon button of an Info popover instead of wrapping; other title notes are unchanged.

**Section card header on mobile.** The action button always stays on the right of the header row; the title and its note take the remaining width and wrap instead of pushing the button onto a new line.

**Section card header.** Every large section card on a page uses the same 24px (`lg`) inner padding, so the distance from each section title to the card edge is identical across the page. A section card (for example 庫存明細, 歷史分析報告) starts with a row: the section title in bold `headline-sm` on the left and, if the section owns an action, its button on the right (primary). No counts or badges next to the title. The button is taller than the title, so it must not make the row taller: it stays vertically centered on the title and overhangs the row above and below, which keeps the title exactly 24px from the card's top edge, the same as cards without a button (for example 市場別); the row then leaves 24px (`lg`) before the content so the button still has room below it.

**Expandable table (holdings).** A table whose rows can open a detail panel.

- **Main row.** Body cells in `body-md` (16px; rows are compact on desktop and mobile alike — 8px vertical padding, a 4px gap between rows, and the 40px expand button overhangs the row instead of setting its height; on mobile the line height is 1.35 and cells are 16px with secondary lines at 14px, never smaller than 14px; the expanded purchase-history panel uses exactly the same sizes as the main rows), headers in `label-lg` (16px) `on-surface-variant`, each header carrying its unit on a second line in `body-sm` — for example 「單價」 over 「(元)」, 「股數」 over 「(股)」, 「年化報酬率」 over 「(%)」 — so the cells show bare numbers without repeating the unit. Right after the section title, in the same row, a short info note (with the `info` icon) explains how prices are determined — 「每股價格為系統依買進日期自動帶入，可能與實際成交價略有不同。」; every column (header and cells) is **center-aligned** except the identity column 「標的」, which is left-aligned; values stay on one line. Column widths are fixed and balanced (`table-layout: fixed`): 「標的」 20%, the expand column 64px, all other columns share the rest equally. Hovered and open rows use `surface-container` (the same gray as a hovered legend row). Main rows are separated by a 4px gap — made with empty spacer rows rather than `border-spacing`, so an open row stays joined to its detail panel. **Alignment with the card:** the table is pulled out by 16px on each side so that the first column's text lines up exactly with the section title (both 24px from the card edge) and the expand arrow's icon lines up with the right edge of the header button (24px from the card edge); the row highlight extends 16px beyond the text on the left. The expand column is right-aligned with 8px right padding. The first column merges identity fields into one column whose header reads 「代號/名稱」 with 「(市場別/產業別)」 as its unit line (the other main-table headers are 平均單價, 持有數量, 持有成本, 最新價格, 未實現損益, 年化報酬率 and 市值權重). The header row scrolls with the table (it is not pinned), and the table scrolls sideways when it is wider than the card: code in bold plus name on the first line, the market and industry separated by an 8px gap like the code and name above them, with no slash (for example 「上市 半導體業」) in `body-sm` `on-surface-variant` on the second line. A share-of-total column shows the amount (market value) above a 6px `rounded.full` bar whose length is the weight; the weight is not printed as a number. The last cell is only an expand arrow (a 40×40 icon button, `expand_more`, rotating 180° when open), vertically centered on the row's content (it is laid out as a block, not an inline element, so it never sits on the text baseline) — no counts.
- **Open state.** The open row and the panel under it share one `surface-container` tint with continuous rounded corners; the tint is painted on the cells (not the table row) so the corners join without a notch. Inside sits a panel with the same background as the section card (`rgba(255, 255, 255, 0.75)`), radius 20px, with visually equal space above its title and below its last row: a header row — the title 「歷史批次買進明細」 on the left (`on-surface`) and the record count (for example 「2 筆交易紀錄」) on the right in neutral gray (`neutral-600`), both bold `label-lg` — then the records as one compact block: column headers without units (買進日期, 每股價格, 買進股數, 持有成本, 未實現損益, 目前市值, 持有天數, 操作), dates as `YYYY-MM-DD`, P&L in regular weight (color only) with its ▲/▼ percentage on a second line, and rows with no gaps, no separate backgrounds and no divider lines, each only as tall as its buttons. The panel title, the first column header and the dates share one left edge, inset so their distance from the panel edge matches the distance from the delete icon to the right edge (the actions column is exactly as wide as its two 40px buttons). Row actions sit on the right: edit is a normal icon button that opens the same modal used for adding, pre-filled with that record (never an inline edit row inside the table); delete is an icon button whose icon is `error` red with no fill at rest and becomes a solid `error` circle with an `on-error` icon on hover; it always asks for confirmation in a modal.
- **Compact panel.** The purchase-history panel is compact like the main rows: 19px padding at the top and 8px at the bottom — the last row's date is centered against the two-line P&L cell, which already leaves about 10px under it, so this makes the gap from the panel's top edge to the title text and from the last date's text to the bottom edge look the same (about 24px); on mobile it is compact like the outer rows — 16px side and top padding, 4px bottom padding, the title-to-column-header and column-header-to-date spacing scaled down from desktop in the same proportion (about 13px and 18px text to text, versus about 18px and 25px on desktop) — which still keeps the top and bottom text gaps visually equal (about 18px) — a 4px gap under its title, 4px vertical padding on its header row and on each record row, line height 1.35, and the 40px edit/delete buttons overhang the row instead of setting its height.
- **Panel gap.** The panel starts right under the open row with no extra margin, so the gap between the row's content and the panel equals the row's own top padding (8px), on desktop and mobile.
- **Card bottom.** The holdings card's bottom padding is 8px, so the last row (or an open panel under it) is exactly as far from the card's bottom edge as from its left and right edges.
- **No extra footers.** The panel has no "add one more" button or explanatory footnote; adding happens through the section's primary button.

**AI Processing / Waiting State.** When the user is waiting for an AI operation to complete (e.g., analyzing results), apply a full-screen blurred inner gradient glow (the `AnalyzingGlow` component) that breathes (pulses opacity). The glow is created using an oversized pseudo-element with a thick `border-image` gradient (`accent-1-500` to `accent-2-500` to `accent-3-500`) and a strong Gaussian blur (`filter: blur`), clipping the outer edge to the viewport to create a continuous, soft, multi-color inner boundary. Do not use standard loading spinners or solid sharp borders for AI analysis states.

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

**App chart palette (product UI).** In the web app, categorical charts (allocation donuts, treemaps) use the 20 chart tokens `chart-1` … `chart-20` in `tokens.css`, always in numeric order and never reordered or skipped. They are the system hues (brand blue, sky blue, teal, amber, rose, olive yellow and neighbouring hues) at two lightness steps (OKLCH L 0.55 / 0.70), ordered so the first five are all mutually distinguishable (a chart with few categories never shows two similar hues, such as two blues), and every adjacent pair after that stays distinguishable, in normal vision and under color-vision-deficiency simulation. More than 20 categories fold into a neutral-gray "其他". Every chart that uses them has a legend list beside it (name and value as text), so identity never relies on color alone.

## Iconography

Material Symbols Rounded icons, about 1.5–2px stroke at 20–24px, round caps and joins, no fills except selected states. Section markers and corner arrows are a solid `button-inverted` circle with an `on-button-inverted` glyph (for example a small arrow before a title, or a corner arrow on a tile). Circular icon buttons have a transparent background at rest and show a translucent `on-surface` circle (about 14%) on hover, with the icon turning `on-surface`; pressing scales them to 95%. A selected state fills the circle with `primary` and the icon with `on-primary`. Icon color is `on-surface` or `on-surface-variant`, never a palette shade.

**Icon button size (required).** Every icon-only button in the web app (edit, delete, close, password visibility, account menu and similar) is one size: the button is **40×40px** (circular, `rounded.full`, no border, no padding) and the icon inside is **22×22px**, centered. Do not scale them per page or per context. In code this is the `IconButton` component's default; use it for any icon-only button and don't override its width, height or `iconSize`. Hover and pressed states keep the same 40px footprint.

**Leading icons for info, tooltip and time text (required).** Whenever a page shows one of the text types below, the text is preceded by its matching icon, inline in the same row, with a `xs` (4px) gap. The icon takes the same color as the text (`on-surface-variant` for meta text and notices).

| Text type | Icon | Size | Examples |
|---|---|---|---|
| Info note, disclaimer, notice box | `info` | 16px inline meta; 24px in a notice box | 「未納入手續費與交易稅」、風險屬性有效期限提示 |
| Tooltip / hint / help text | `help` | 16px | 欄位說明、「?」提示 |
| Time or date-time | `schedule` | 16px | 「資料更新時間：2026-09-25 16:00:41」、「上次填寫時間：…」 |
| Warning | `warning` | 16px | 缺少最新報價 |

Times shown to users are local time down to the second (`YYYY-MM-DD HH:mm:ss`). A page-level time (for example the price data update time) sits in the header's top-right, left of the header action button, and moves under the page title on mobile (≤734px). Chart tooltips (the hover cards on Nivo charts) are exempt: they are already anchored to the data point.

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
