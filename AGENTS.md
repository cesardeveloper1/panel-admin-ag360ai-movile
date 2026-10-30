# Development rules

- Treat mobile-first design as an absolute requirement for every UI change.
- Start layouts and interactions at the smallest supported mobile viewport, then enhance them progressively for tablets and desktops.
- Validate touch targets, readable type, overflow, navigation, forms, and safe-area behavior on mobile before considering a UI task complete.
- Use `develop` as the integration branch for all changes. Create feature branches from `develop` when needed and target `develop` when merging them.
- Do not commit new product changes directly to `master`.
- Apply an Apple-quality interaction standard to design work: calm hierarchy, minimal visual noise, precise touch targets, native-feeling motion, and transitions that preserve spatial continuity instead of showing unnecessary loaders.

## Mobile design system

- For UI, UX, components, forms and navigation, read `.claude/skills/agiliza-mobile-design/SKILL.md` and the references relevant to the change. This repository copy is the shared design source for Codex, Cursor and Claude Code.
- Work screen by screen within the user's chosen scope: inspect the current screen, reuse the shared system, implement and verify it before expanding to another screen. Do not redesign unrelated screens automatically.
- Maintain design decisions in that skill rather than duplicating them in agent-specific rules. The user's current request takes precedence.
