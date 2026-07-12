# Development rules

- Treat mobile-first design as an absolute requirement for every UI change.
- Start layouts and interactions at the smallest supported mobile viewport, then enhance them progressively for tablets and desktops.
- Validate touch targets, readable type, overflow, navigation, forms, and safe-area behavior on mobile before considering a UI task complete.
- Use `develop` as the integration branch for all changes. Create feature branches from `develop` when needed and target `develop` when merging them.
- Do not commit new product changes directly to `master`.
- Apply an Apple-quality interaction standard to design work: calm hierarchy, minimal visual noise, precise touch targets, native-feeling motion, and transitions that preserve spatial continuity instead of showing unnecessary loaders.
