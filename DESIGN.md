<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: GolfTrackerCaddy
description: A personal golf round tracker with AI-powered caddy analysis.
---

# Design System: GolfTrackerCaddy

## 1. Overview

**Creative North Star: "The Caddy's Notebook"**

GolfTrackerCaddy feels like a well-worn caddy yardage book crossed with the finish of a premium sports app. It carries the gravitas of the game — prestige without pretension — in a tool you reach for without thinking. Masters green grounds the palette; warm parchment tints keep it from feeling cold. Serif headings give the AI caddy's analysis weight; humanist sans keeps the data inputs fast and readable between holes.

This system rejects everything that feels engineered for engineers. No cold grays, no dense data grids, no clinical whites. The anti-reference is anything that makes you feel like you're operating software rather than playing a round. References: Apple's craft and attention to motion detail, Nike's confidence and bold typographic clarity, Malbon Golf's warmth and lifestyle ease.

Motion is Apple-class: every transition earns its place. Entrances are felt, not watched. The app breathes between holes — choreography registers as pleasantness, never as something you wait through.

**Key Characteristics:**
- Deep Masters green as the dominant surface color, not an accent
- Warm parchment neutrals — like scorecard paper, not clinical white
- Serif for moments of weight (AI insight headers, round titles); humanist sans everywhere you tap and enter
- Choreographed motion that appreciates without demanding attention
- Spacious, not sparse — room between data points; the course has rough for a reason

## 2. Colors

A committed-to-full-palette strategy: Masters green carries 30–60% of any surface, supported by warm parchment neutrals and a muted caddy gold reserved for AI moments.

### Primary
- **Masters Green** [to be resolved during implementation]: The dominant hue. Deep, muted forest green — Augusta in tone, never neon. Used on primary actions, key surfaces, and the app's identity anchors. Should feel like the 12th hole at dusk, not a recycling logo.
- **Fairway Green** [to be resolved during implementation]: A lighter, more interactive variant. Hover states, active indicators, secondary UI elements.

### Secondary
- **Caddy Gold** [to be resolved during implementation]: Muted amber or warm sand — the AI caddy's color. Used on insight cards, AI analysis surfaces, and moments that deserve distinction without shouting. Low chroma, warm, like aged brass on a putter.

### Neutral
- **Scorecard Parchment** [to be resolved during implementation]: The base background. Warm off-white tinted toward the green anchor. Never #fff.
- **Fairway Sand** [to be resolved during implementation]: Mid-surface. Cards, input fields, containers.
- **Deep Rough** [to be resolved during implementation]: Near-black with a warm tint. Primary text, heavy UI chrome.
- **Caddy Grey** [to be resolved during implementation]: Secondary text, placeholder copy, muted labels.

**The No Machine Colors Rule.** Cold blue-grays, clinical whites, and pure #000/#fff are prohibited. Every neutral is tinted toward the green anchor hue. If it could belong in a tech dashboard, it does not belong here.

**The Green Ground Rule.** Masters green is the ground this product stands on, not a highlight. It carries 30–60% of any given screen's visual weight. The warm tints support it; they do not compete with it.

## 3. Typography

**Display Font:** Serif with presence — [font pairing to be chosen at implementation; direction: Cormorant Garamond or Playfair Display family]
**Body Font:** Humanist sans — warm, readable, fast [direction: Plus Jakarta Sans or Inter family]

**Character:** The serif carries the game's history and the AI caddy's authority. The humanist sans handles everything you tap, enter, and read mid-round. The contrast between them is the system's personality: expert and approachable in the same breath.

### Hierarchy
- **Display** (serif, light or regular): Round titles, AI caddy insight headers, moment-of-truth screens (round complete, analysis ready). Infrequent and powerful.
- **Headline** (serif, medium): Section headers, course name, key post-round stats.
- **Title** (humanist sans, semibold): Screen titles, card headers, hole numbers.
- **Body** (humanist sans, regular, max 65–75ch): Scorecard data, AI analysis body copy, form labels.
- **Label** (humanist sans, medium, slightly tracked): Stat labels, navigation items, input placeholders. Uppercase only when the context demands formality.

**The Two-Voice Rule.** Serif speaks for the game and the AI. Humanist sans speaks for the tool. Never mix them within a single content unit — a card is one voice or the other, not both.

## 4. Elevation

Layered, not flat. Choreographed motion implies depth — surfaces lift, the AI analysis arrives with presence. Shadows are atmospheric: soft, warm-tinted, diffuse. Nothing sharp or cold.

Depth is primarily tonal: background bleeds into surface bleeds into raised surface, using the warm neutral scale. Shadows are reserved for interactive lift states and the AI insight card, which earns the most elevation in the system.

**The Warm Shadow Rule.** All shadows are tinted warm — never pure black rgba. A shadow from a green-anchored system should carry a hint of the ground it lifts from.

**The Flat-By-Default Rule.** Surfaces rest flat. Elevation appears only as a response to state (hover, active, focus) or semantic importance (the AI caddy card is the highest-elevation element in the system).

## 5. Components

[Components omitted in seed — re-run `/impeccable document` once component code exists.]

## 6. Do's and Don'ts

### Do:
- **Do** use Masters green as a ground color — it carries the surface, not just touches it.
- **Do** tint every neutral toward the green anchor. Chroma 0.005–0.01 is enough to feel warm rather than sterile.
- **Do** use the serif voice for AI caddy outputs. It gives the analysis authority and separates it from the data entry surfaces.
- **Do** let motion breathe. Entrances stagger gently; transitions ease out with exponential curves (ease-out-quart or expo). No bounce, no elastic.
- **Do** size tap targets for a gloved hand in sunlight — 48px minimum. WCAG AA is the floor, not the ceiling.
- **Do** show only what the golfer needs right now. The data that helps on the next hole is different from what helps on the range afterward.

### Don't:
- **Don't** let the UI feel techy or machine-y. No cold gray palettes, no terminal aesthetics, no dense data grids that require a desk to understand.
- **Don't** use pure `#000` or `#fff` anywhere. Every dark and every light is warm-tinted.
- **Don't** use gradient text, glassmorphism, or hero-metric templates (big number, small label, gradient accent). This is a grounded, physical aesthetic — not a SaaS dashboard.
- **Don't** make the user watch an animation. Choreography registers as pleasantness, not as a show. If you would describe it as "loading," it is wrong.
- **Don't** use blue in any role — it has no place in this palette and immediately reads as generic product software.
- **Don't** design for a desk. Every screen is a phone, between holes, with one hand, possibly in sun glare.
- **Don't** reach for a card grid when a simpler list, inline layout, or progressive disclosure will do. Cards used by default are a lazy answer. Nested cards are always wrong.
