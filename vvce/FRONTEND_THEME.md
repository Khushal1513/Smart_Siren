# Smart Siren Frontend Theme Guide

This guide describes the frontend visual system for developers and AI coding assistants creating or updating files under `vvce/`. Read it before building a new page or component. The goal is to make new work look like the existing Smart Siren emergency-operations dashboard while using its shared tokens and components instead of inventing a separate theme.

## Product and visual intent

Smart Siren is an emergency-response traffic dashboard. Its interface should help an operator quickly scan ambulance activity, traffic-signal state, routes, and emergency actions.

The current frontend theme is best described as:

- A light, clean operations dashboard with pale blue-gray backgrounds and cards.
- A softly tinted mint-green navigation sidebar.
- Teal/green for normal or active traffic-signal states.
- Red for emergency and destructive states.
- Compact, information-dense panels, cards, tables, status badges, and maps.
- Lucide icons used as small, functional visual cues.
- Responsive navigation: a fixed-width sidebar on desktop and a slide-in sidebar on narrow screens.

This is a description of the current code, not a fully consistent design system. Some screens still contain starter styles, hard-coded colors, inline styles, or inconsistent component patterns. New work should favor the shared theme tokens and shared UI components documented below.

## Source of truth

Use these files as references when implementing visual changes:

- `src/index.css` — CSS variables, global styles, and signal/map utility classes.
- `tailwind.config.js` — semantic Tailwind color names, radius tokens, and animation names.
- `src/components/ui/` — shared button, card, badge, table, form, dialog, toast, and other UI primitives.
- `src/components/Layouts/AppLayout.jsx` — active page shell and content spacing.
- `src/components/Layouts/Sidebar.jsx` and `Navbar.jsx` — navigation and responsive dashboard chrome.
- `src/pages/Dashboard.jsx` and `src/components/dashboard/` — examples of dashboard composition.

`src/App.jsx` uses `src/components/Layouts/AppLayout.jsx`. The top-level `AppLayout.jsx` in the `vvce/` folder is an older layout and should not be used as the current layout reference.

## Color palette and semantic tokens

Prefer semantic Tailwind classes (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-emergency`, `bg-signal-green`) over newly hard-coded hex values.

### Light theme

Defined in `src/index.css` under `:root`:

| Token | Current value | Intended use |
|---|---|---|
| `--background` | `210, 25%, 98%` | Main page background; a very light, cool gray-blue. |
| `--foreground` | `222.2 84% 4.9%` | Main text; very dark navy/charcoal. |
| `--card` | `210, 91%, 93%` | Card surfaces; a pale blue tint. |
| `--card-foreground` | `222.2 84% 4.9%` | Text on card surfaces. |
| `--popover` | `0 0% 100%` | Popover and floating surface background. |
| `--popover-foreground` | `222.2 84% 4.9%` | Text in popovers. |
| `--primary` | `222.2 47.4% 11.2%` | Primary actions and selected elements; dark blue/navy. |
| `--primary-foreground` | `210 40% 98%` | Content on primary backgrounds. |
| `--secondary` | `210 40% 96.1%` | Secondary controls and soft surfaces. |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | Content on secondary surfaces. |
| `--muted` | `210 40% 96.1%` | Quiet backgrounds and disabled/low-emphasis surfaces. |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Helper text, metadata, and secondary labels. |
| `--accent` | `210 40% 96.1%` | Hover and accent surfaces. |
| `--accent-foreground` | `222.2 47.4% 11.2%` | Text on accent surfaces. |
| `--destructive` | `0 84.2% 60.2%` | Destructive control background. |
| `--destructive-foreground` | `210 40% 98%` | Text on destructive controls. |
| `--border` | `214.3 31.8% 91.4%` | Borders and separators. |
| `--input` | `214.3 31.8% 91.4%` | Input borders. |
| `--ring` | `222.2 84% 4.9%` | Keyboard-focus ring. |
| `--radius` | `0.5rem` | Base rounding used by shared controls. |

### Operational status colors

Defined as Tailwind colors in `tailwind.config.js`:

| Tailwind class | Color | Meaning |
|---|---|---|
| `text-emergency`, `bg-emergency` | `#e63946` | Emergency attention and urgent actions. |
| `bg-emergency-light` | `#ff6b6b` | Lighter emergency accent. |
| `bg-emergency-dark` | `#d32f2f` | Darker emergency accent. |
| `bg-signal-green` | `#2a9d8f` | Green/active signal state; teal rather than neon green. |
| `bg-signal-yellow` | `#e9c46a` | Caution/yellow signal state; pair with dark text. |
| `bg-signal-red` | `#e76f51` | Red signal state; a warm red-orange distinct from emergency red. |

There are also CSS utility classes in `src/index.css`:

- `.signal-status-green`, `.signal-status-yellow`, and `.signal-status-red` render rounded signal labels with readable foreground colors.
- `.emergency-badge` renders a red emergency badge with the `pulse-emergency` animation.
- `.map-container` gives a map a full-size, rounded, bordered container with a small shadow.

Keep the distinction between *emergency* and *traffic signal red*: emergency uses the stronger crimson `#e63946`; signal red uses `#e76f51`.

### Sidebar colors

The Tailwind sidebar semantic tokens are defined in `src/index.css`. The current `Sidebar.jsx` also sets a literal mint background (`hsl(130,70%,93%)`) for its container. Preserve the soft green character when changing the sidebar, but prefer a shared token if one is introduced consistently across the sidebar styles.

### Dark mode

Dark color variables exist under `.dark` in `src/index.css`, and Tailwind is configured for class-based dark mode. However, the current app does not have a clearly wired theme-selection provider in its active app shell, and some components use literal light backgrounds. Do not promise complete dark-mode support for new UI unless the feature is deliberately completed and tested across the shell and all surfaces.

## Typography

- The project does not define a dedicated brand font or a typography scale in its Tailwind configuration.
- Follow the existing Tailwind utility pattern: page headings commonly use `text-2xl font-bold`; card headings often use `text-lg font-medium`; supporting labels and descriptions use `text-sm` or `text-xs text-muted-foreground`.
- Use semantic headings (`h1` for the page title, then `h2`/`h3` for sections) and keep secondary text visibly lower-emphasis.
- Do not add a remote font dependency or a new typeface just for one page. If a global font is requested, define it intentionally as a shared design decision.

## Layout, spacing, and shape

- The active layout is a full-height app shell with a sidebar and a flexible content column.
- The navbar is sticky at the top and approximately `h-16`.
- Main content uses responsive horizontal padding: `px-4`, `sm:px-6`, and `lg:px-8`, with vertical padding `py-4`.
- Pages commonly use `space-y-6` between major sections and `gap-4`/`gap-6` in grids.
- The shared card uses `rounded-lg border bg-card text-card-foreground shadow-sm`.
- Form inputs and buttons generally use `rounded-md`; the base radius is `0.5rem`.
- Use the `container` only when a page needs a centered maximum width; its configured 2xl width is 1400px and its horizontal padding is 2rem.
- Prefer a responsive grid (`grid-cols-1`, then `md:`/`lg:` columns) over fixed-width content that can overflow.

## Responsive behavior

- Tailwind breakpoints are used throughout; the app's mobile sidebar threshold is 768px (`md`).
- Below desktop width, the sidebar is hidden off-canvas and can open over a dark backdrop. Close it after navigation on mobile.
- On desktop, the sidebar is part of the layout and remains visible.
- Use flexible page headers, wrapping rows, and scrollable tables/maps to avoid narrow-screen horizontal overflow.
- For multi-column content, stack panels on small screens and add columns at `md:` or `lg:` only when the content can fit.
- The `useIsMobile()` hook in `src/hooks/use-mobile.jsx` defines its own 768px threshold. Keep responsive behavior consistent with this breakpoint.

## Component conventions

### Imports and class names

- Use the `@/` alias for files within `src/`, for example `@/components/ui/card`.
- Use shared UI primitives instead of recreating their styling in a page.
- Use `cn()` from `@/lib/utils` to combine conditional Tailwind classes and merge conflicting utilities.
- Use `lucide-react` icons for interface icons, usually sized around `h-4 w-4` for controls and `h-5 w-5` for navigation.
- Use `react-router-dom` navigation for internal links. Keep destinations aligned with `src/App.jsx`.

### Buttons and actions

Use `Button` from `@/components/ui/button`. Supported variants are `default`, `destructive`, `outline`, `secondary`, `ghost`, and `link`; sizes are `default`, `sm`, `lg`, and `icon`.

- Use the primary/default variant for the main action in a section.
- Use outline/secondary/ghost for secondary actions.
- Reserve destructive styling for destructive or clearly urgent actions.
- Give icon-only buttons an accessible name (`aria-label` or screen-reader text).
- Preserve focus-visible rings and disabled states; do not remove them for visual reasons.

### Cards and data panels

Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` from `@/components/ui/card`.

- Use cards to group related operational content such as counts, lists, maps, and settings.
- Use a concise title; optional descriptions should use muted text.
- Keep card actions and status visually distinct from informational values.
- Avoid putting unrelated dashboard metrics into one card.

### Status badges and emergency information

Use the shared `Badge` component when a compact status label is appropriate.

- Use explicit text as well as color so status is not communicated by color alone.
- For emergency state, use the emergency token and a clear label such as “Emergency”.
- For signal state, use the signal green/yellow/red tokens and the actual status word.
- Avoid animating ordinary statuses; reserve pulsing for the existing emergency badge pattern and only where attention is needed.
- Do not use signal green to imply an emergency acknowledgement unless the underlying operation actually succeeded.

### Forms and feedback

- Use shared `Input`, `Label`, `Select`, `Checkbox`, `Switch`, `Textarea`, and `Form` primitives where appropriate.
- Associate each form control with a visible label; placeholder text is not a replacement for a label.
- Show validation errors next to the relevant field and preserve focus/keyboard support.
- Show pending state during asynchronous actions and prevent accidental duplicate submissions.
- Use `useToast` from `@/hooks/use-toast` for transient success/error messages; use inline alerts for persistent form-level or page-level messages.
- Do not display success feedback until the operation actually succeeds. If the operation is simulated, label it as a demo.

### Tables, filters, and charts

- Use `Table` primitives for operational lists, and ensure the table can scroll horizontally on smaller viewports.
- Put search and filter controls near the list they affect; provide a useful empty state.
- Use Recharts and `@/components/ui/chart` helpers if charting is needed.
- Keep chart data sourced from the feature/API rather than inventing values. If sample data is unavoidable, mark it clearly as sample/demo data.
- Charts should have readable legends, labels, and tooltips; do not rely on color alone to distinguish series.

### Maps

- Map components use `VITE_GOOGLE_MAPS_API_KEY`.
- Read the key from `import.meta.env`; never hard-code a real key.
- Follow the existing pattern of showing a clear fallback when the key is absent.
- Do not label a map “live” or show moving vehicles unless data is actually being refreshed and rendered.
- Use a responsive container and preserve usable map height on mobile.

## Accessibility and safety

- Use semantic HTML, labels, accessible names, and keyboard-operable controls.
- Keep contrast readable, especially for muted text, yellow statuses, and text on colored badges.
- Pair every critical state with text, not color alone.
- Make loading, empty, error, and success states visible to users.
- A button that dispatches an emergency or signal action must clearly communicate what will happen and the result. Never present a mock or unconfirmed hardware command as a completed real-world signal change.

## Current theme limitations to avoid copying into new code

- `src/App.css` contains Vite starter styles, including a centered, max-width `#root`; these can conflict with a full-width dashboard layout.
- The navbar uses literal white for its light background, while most surfaces use semantic tokens.
- The sidebar uses a literal mint HSL color rather than a Tailwind sidebar token.
- Some existing feature screens use inline styles or hard-coded color classes.
- Dark-mode tokens exist, but dark mode is not consistently activated or applied.
- Existing dashboard metrics, signal examples, and route data may be mock data rather than live API data.

When creating a new file, follow the shared semantic tokens and primitives above rather than repeating these inconsistencies. Do not refactor unrelated styling just to match this guide; keep changes scoped to the requested feature.

## AI implementation checklist

Before returning a new or modified frontend file, verify:

1. It uses the active `src/components/Layouts/AppLayout.jsx` shell and a route registered in `src/App.jsx`, when the feature needs a page.
2. Its colors come from existing semantic tokens or documented status colors rather than an unrelated palette.
3. It uses shared primitives and `cn()` where appropriate.
4. It has a clear heading, sensible spacing, and responsive behavior at mobile/tablet/desktop widths.
5. It has accessible labels, focus states, and text labels for status colors.
6. It includes loading, error, empty, and success feedback for real asynchronous behavior.
7. Any sample data or simulated behavior is clearly identified as such.
8. It does not expose credentials or assume that a visual control is connected to a live backend/hardware operation.
