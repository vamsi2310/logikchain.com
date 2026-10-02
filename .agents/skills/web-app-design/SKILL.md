---
name: web-app-design
description: >
  Premium web application design skill for logikchain.com. Synthesizes anti-slop frontend taste
  (Leonxlnx/taste-skill), Awwwards-quality site building (MengTo/Skills), and Vercel production
  web interface guidelines. Use whenever building, redesigning, or auditing any web UI.
  Covers design taste, typography, color, layout, motion, interactions, accessibility, and content.
sources:
  - https://github.com/Leonxlnx/taste-skill
  - https://github.com/MengTo/Skills
  - https://github.com/vercel-labs/web-interface-guidelines
---

# Web App Design Skill - logikchain.com

> Applies to every web UI built or modified in this project.
> All rules are contextual. Read the brief first, then apply what fits.
> Do NOT default to AI slop: no AI-purple gradients, no generic card grids, no Inter everywhere.

---

## PART 1 - BRIEF INFERENCE

Before touching code, infer what the user wants. Most LLM design fails because the model jumps to a default aesthetic.

### 1.A Read these signals first
1. Page kind: landing (SaaS/consumer/agency/event), portfolio, redesign, dashboard, editorial/blog, web-app screen.
2. Vibe words: minimalist, calm, Linear-style, Awwwards, brutalist, premium, Apple-y, playful, dark tech.
3. Reference signals: URLs linked, screenshots pasted, brands named.
4. Audience: B2B procurement vs. design-conscious consumer vs. developer.
5. Existing brand assets: logo, color, type, photography - starting material on redesigns.
6. Quiet constraints: accessibility-first, public-sector, regulated industries, trust-first commerce.

### 1.B State a Design Read before generating
Before any code: "Reading this as: [page kind] for [audience], with a [vibe] language, leaning toward [design direction]."

### 1.C Anti-Default Discipline
Never default to: AI-purple/blue glow gradients, centered hero over dark mesh, three equal feature cards,
generic glassmorphism, infinite-loop micro-animations, or Inter + slate-900.

---

## PART 2 - THE THREE DIALS

| Dial | Default | Range |
|---|---|---|
| DESIGN_VARIANCE | 8 | 1=Perfect Symmetry to 10=Artsy Chaos |
| MOTION_INTENSITY | 6 | 1=Static to 10=Cinematic/Physics |
| VISUAL_DENSITY | 4 | 1=Art Gallery/Airy to 10=Cockpit/Packed Data |

| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| minimalist/clean/calm/editorial/Linear-style | 5-6 | 3-4 | 2-3 |
| premium consumer/Apple-y/luxury/brand | 7-8 | 5-7 | 3-4 |
| playful/Awwwards/experimental/agency | 9-10 | 8-10 | 3-4 |
| landing page/portfolio/marketing site | 7-9 | 6-8 | 3-5 |
| trust-first/public-sector/accessibility-critical | 3-4 | 2-3 | 4-5 |
| redesign-preserve | match existing | +1 | match |
| redesign-overhaul | +2 | +2 | match |

---

## PART 3 - STACK AND ARCHITECTURE

- Framework: React or Next.js, default to Server Components (RSC).
  - Global state/interactivity: Client Components (use client) only.
  - Motion/scroll/pointer physics components MUST be isolated use client leaves.
- Styling: Tailwind v4. Use @tailwindcss/postcss or Vite plugin, NOT tailwindcss in postcss.config.js.
- Animation: motion/react (formerly Framer Motion). Import from motion/react.
  - NEVER use useState for continuous mouse/scroll values. Use useMotionValue/useTransform/useScroll.
- Fonts: Always next/font or self-hosted @font-face with font-display: swap. Never Google Fonts link tag in production.
- Icons: @phosphor-icons/react > hugeicons-react > @radix-ui/react-icons > @tabler/icons-react.
  - One family per project. Never hand-roll SVG paths.
- Dependency check: Verify in package.json before importing ANY library.

---

## PART 4 - TYPOGRAPHY

- Display/Headlines: text-4xl md:text-6xl tracking-tighter leading-none
- Body/Paragraphs: text-base text-gray-600 leading-relaxed max-w-[65ch]
- Primary sans: Prefer Geist, Outfit, Cabinet Grotesk, Satoshi over Inter.
  - Inter OK for neutral/Linear-style/accessibility-first briefs.
- Serif: Very discouraged. Only if brief explicitly names it or aesthetic is genuinely editorial/luxury/heritage.
  - Banned as defaults: Fraunces, Instrument Serif.
- Mixed-family emphasis ban: Use italic/bold of the SAME font. Never inject serif into a sans headline.
- Italic descender clearance: For italic display with descender letters (y g j p q):
  leading-[1.1] minimum + pb-1 on wrapper.

---

## PART 5 - COLOR

- Max 1 accent color. Saturation < 80%.
- No AI Purple Rule: No purple/blue glow as default. Use neutral bases + one high-contrast accent.
- One palette per project. No mixing warm and cool grays.
- Color Consistency Lock: Accent chosen = applied EVERYWHERE on the page.

### Premium Consumer Palette Ban
For premium/DTC/artisan/luxury briefs, BANNED as defaults (the #1 AI tell):
- Backgrounds: warm beige/cream (#f5f1ea, #f7f5f1, #fbf8f1, #efeae0)
- Accents: brass/clay/oxblood/ochre (#b08947, #b6553a, #9a2436)
- Text: espresso/warm near-black (#1a1714, #1b1814)

Alternatives: Cold Luxury (silver-grey+chrome), Forest (deep green+bone), Black and Tan,
Cobalt+Cream, Terracotta+Slate, Pure monochrome+single saturated pop.

---

## PART 6 - LAYOUT DISCIPLINE (Hard Rules)

Failing any of these = shipping broken work.

- Anti-Center Bias: Centered Hero avoided when DESIGN_VARIANCE > 4.
  Force split-screen, left-aligned, or asymmetric structures.
- Hero must fit in the initial viewport. Max 2-line headline, subtext max 20 words, CTAs visible without scroll.
- Hero top padding cap: Max pt-24 (~6rem) at desktop.
- Hero max 4 text elements: Eyebrow OR brand strip, Headline, Subtext, CTAs (1 primary + max 1 secondary).
  No trust strips/feature bullets inside the hero.
- Logo walls belong UNDER the hero, never inside it.
- Navigation: Single-line on desktop. Max 80px height (default 64-72px).
- Grid over Flex-Math: CSS Grid over complex flexbox % math.
  Use min-h-[100dvh] NOT h-screen (iOS Safari fix).
- Bento grids: Cells count = content count. No empty cells. Must have rhythm.
- Section layout diversity: Each layout family appears at most ONCE per page.
- Zigzag alternation cap: Max 2 consecutive image+text split sections. Break on 3rd.
- Eyebrow restraint: Max 1 eyebrow per 3 sections (Hero counts as 1).
- Split-header ban: Left big headline + right small explainer as section header = banned. Stack vertically.
- Mobile collapse explicit: Declare < 768px fallback in every multi-column layout.
- Shape consistency lock: ONE corner-radius scale throughout the page.

---

## PART 7 - INTERACTIVE STATES (Full Cycle Required)

- Loading: Skeletal loaders matching final layout shape. No generic spinners.
- Empty States: Beautifully composed, indicate how to populate.
- Error States: Inline for forms, toasts for transient only.
- Tactile Feedback: On :active, use -translate-y-[1px] or scale-[0.98].
- Button Contrast: Every button must pass WCAG AA (4.5:1 body, 3:1 large text >= 18px). White-on-white = banned.
- CTA Wrap Ban: Button text must fit one line at desktop. Max 3-word labels or widen button.
- No Duplicate CTA Intent: One label per intent across the whole page.

---

## PART 8 - VERCEL WEB INTERFACE GUIDELINES

Source: https://github.com/vercel-labs/web-interface-guidelines

### Interactions
- Keyboard works everywhere. All flows keyboard-operable per WAI-ARIA Authoring Patterns.
- Clear focus: Use :focus-visible over :focus. Sticky elements never cover focused elements.
- Match visual and hit targets: Visual < 24px expand to >= 24px. Mobile minimum: 44px.
- Mobile input size: font-size >= 16px on mobile (prevents iOS Safari auto-zoom).
- Never disable browser zoom.
- Never disable paste in inputs or textareas.
- Loading buttons: show loading indicator + keep original label.
  Add 150-300ms show-delay, 300-500ms min visible time to avoid flicker.
- URL as state: Persist in URL for share/refresh/Back/Forward.
- Optimistic updates: Update UI immediately, reconcile on server response. On failure: error + rollback.
- Ellipsis for loading/further-input: Rename..., Loading..., Saving..., Generating...
- Confirm destructive actions. Require confirmation or Undo with safe window.
- touch-action: manipulation on controls (prevents double-tap zoom).
- No dead zones: If it looks interactive, it must be interactive.
- Deep-link everything: filters, tabs, pagination, expanded panels, any useState.
- Links are links: Use a or Link for navigation. Never button or div for navigational links.
- Announce async updates: Polite aria-live for toasts and inline validation.

### Animations
- Honor prefers-reduced-motion. Always provide a reduced-motion variant.
- CSS > Web Animations API > JS libraries. Prefer CSS, avoid main-thread JS animations.
- Compositor-friendly: Prioritize transform + opacity. Avoid width, height, top, left (cause reflows).
- Never transition: all. List only intended properties (opacity, transform).
- Interruptible: Animations cancelable by user. Autoplay > 5 seconds needs pause/stop controls.
- Correct transform origin: Anchor to where motion physically starts.
- SVG transforms: Apply to g wrappers + set transform-box: fill-box; transform-origin: center;

### Layout
- Optical alignment: Adjust +/-1px when perception beats geometry.
- Deliberate alignment: Every element aligns to something intentionally.
- Responsive coverage: Verify mobile, laptop, and ultra-wide.
- Respect safe areas: Use CSS env() safe-area variables for notches/insets.
- Let the browser size things: Prefer flex/grid over JS measurement.

### Content
- Inline help first. Tooltips as last resort.
- Stable skeletons: Mirror final content exactly to avoid layout shift.
- Accurate title tag: Reflects current context on every page/route.
- No dead ends: Every screen offers a next step or recovery path.
- All states designed: Empty, sparse, dense, and error states.
- Typographic quotes: Curly quotes over straight quotes.
- Tabular numbers for comparisons: font-variant-numeric: tabular-nums.
- Redundant status cues: Never rely on color alone, include text labels.
- Icons have labels: Text for non-sighted users.
- Semantics before ARIA: Prefer button/a/label/table before aria-* attributes.
- Non-breaking spaces: Use &nbsp; to keep units/shortcuts together (10&nbsp;MB).

---

## PART 9 - AWWWARDS-QUALITY SITE BUILDING

Source: MengTo/Skills - build-awwwards-quality-sites

Use when brief calls for cinematic, premium, motion-rich, or experimental UI.

1. Art direction first: Extract high-level traits from references.
   Generate a materially new identity. Never reproduce reference assets.
2. Write direction before coding: visual thesis, hero focal asset, type hierarchy, color system,
   section sequence, motion narrative, smooth-scroll engine, Three.js decision.
3. Hero = strongest moment: Combine clear message + CTA with original imagery, video,
   pointer-responsive interaction, or Three.js.
4. GSAP intro sequence for hero. Navigation + page elements reveal on scroll/load.
5. Use Solar icons via Iconify. Iconify SVG Logos only for real company marks.
6. Photographs for avatars. Never ship initials, illustrated heads, or silhouettes as real-person representations.
7. Honest asset provenance. Label AI-generated assets in source.

---

## PART 10 - LANDING PAGE STRUCTURE

Source: MengTo/Skills - landing-page

One offer, one audience, one primary action.

Above the fold (must have):
1. Headline (outcome + audience)
2. Subheadline (clarifies how + adds specificity)
3. Primary CTA (clear verb + what they get)
4. One proof signal (logo strip / stat / short testimonial)
5. Hero visual (product screenshot/video) or strong illustration

Mid page (argument):
6. Problem to solution (1 section)
7. Benefits (3-5, outcome-driven)
8. How it works (3 steps)
9. Social proof (testimonials/case study)

Bottom (objection handling):
10. FAQ (6-12 Q/A)
11. Risk reversal (trial, cancel anytime, guarantee)
12. Final CTA (same as top)

---

## PART 11 - VISUAL ASSETS

- Image-gen tool first: If any image-gen tool is available, generate section-specific assets.
- Real web images second: picsum.photos with descriptive seeds, or real stock/brand URLs.
- Last resort: Leave labeled placeholder comments.
- No div-based fake screenshots: Hand-built product previews with div rectangles are banned.
- Real company logos: Simple Icons CDN (https://cdn.simpleicons.org/{slug}/ffffff) or simple-icons npm.
- Logo wall = logos only. Never add category labels below logos.

---

## PART 12 - CONTENT AND COPY

- Default content per section: Headline (<= 8 words) + sub-paragraph (<= 25 words) + one visual OR one CTA.
- No data-dump sections. Use top 3-5 highlights + View full list link, or carousel.
- Long lists: Avoid ul bullets for > 5 items. Use 2-col split, card grid, tabs, accordion,
  scroll-snap, or marquee.
- Copy self-audit before shipping: Re-read every visible string.
  Rewrite broken, unclear, hallucination-sounding, or LLM-pretentious text.
- Banned copy words: Unleash, Elevate, Revolutionize, Next-Gen, Seamless, Delve, Tapestry, Game-changer.
- One copy register per page. No mixing technical, editorial, and marketing tones.

---

## PART 13 - MINIMALIST UI VARIANT

Source: Leonxlnx/taste-skill - minimalist-skill

Activate when brief reads: clean, editorial, document-style, calm, workspace, or Notion-like.

- Fonts: Geist Sans/Helvetica Neue/Switzer (body); Lyon Text/Newsreader (hero headings); Geist Mono (code/metadata).
- Palette: Canvas #FFFFFF or #F7F6F3. Borders #EAEAEA or rgba(0,0,0,0.06). Accent: pale pastels only.
- No shadows (if needed: ultra-diffuse < 0.05 opacity).
- No gradients, neon, 3D glassmorphism.
- No rounded-full for large containers, cards, or primary buttons.
- No emojis. Replace with icons or SVG primitives.
- Bento grids: Asymmetrical CSS Grid. border: 1px solid #EAEAEA. Border-radius max 12px.
  Internal padding p-6 to p-8.

---

## PART 14 - REDESIGN AUDIT CHECKLIST

Source: Leonxlnx/taste-skill - redesign-skill

Typography and Color:
- [ ] Swap default fonts (Inter/Roboto) for a curated choice
- [ ] Desaturate accents, eliminate pure #000000
- [ ] Remove AI purple gradients
- [ ] Ensure one consistent accent color throughout

Layout and Depth:
- [ ] Fix 100vh to 100dvh for iOS Safari
- [ ] Replace 3-column cookie-cutter rows with asymmetric/bento grids
- [ ] Fix misaligned and double-intent CTAs

States and Quality:
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add tactile hover/press states
- [ ] Replace transition: all with specific property transitions
- [ ] Verify keyboard navigation works end-to-end
- [ ] Audit WCAG AA contrast on all text and buttons

---

## PART 15 - PRE-FLIGHT CHECKS (Mandatory Before Shipping)

- [ ] Hero fits in initial viewport (no scroll needed for CTA)
- [ ] No hero top padding > pt-24
- [ ] Navigation single-line at desktop (1024px+)
- [ ] No duplicate CTA intent on the page
- [ ] No button text wrapping at desktop
- [ ] No empty bento grid cells
- [ ] Eyebrow count <= ceil(sectionCount / 3)
- [ ] All buttons pass WCAG AA contrast
- [ ] All form inputs pass WCAG AA contrast
- [ ] No transition: all in CSS
- [ ] min-h-[100dvh] used instead of h-screen
- [ ] CSS Grid used instead of complex flexbox math
- [ ] All images have descriptive alt text
- [ ] Keyboard navigation tested
- [ ] prefers-reduced-motion variant exists for all animations
- [ ] Copy self-audit complete (no banned words, no AI-sounding phrases)
- [ ] All dependencies verified in package.json before import
