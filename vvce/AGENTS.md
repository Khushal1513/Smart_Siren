# Frontend agent instructions

For any task that creates or changes frontend files under `vvce/`:

1. Read [FRONTEND_THEME.md](./FRONTEND_THEME.md) before choosing colors, layout, or components.
2. Follow the documented Smart Siren design tokens and shared UI primitives. Do not introduce a separate visual theme for one screen.
3. Use the active app shell and keep page routes aligned with `src/App.jsx`.
4. Keep mock data, simulated interactions, and hardware/API success states clearly distinguished from real behavior.
5. Keep changes scoped to the requested frontend feature; do not copy starter-template styling into new pages.

If existing source code conflicts with the guide, treat source behavior as the current implementation and update the guide only when a deliberate design decision changes the theme.
