---
"@ludovicm67/simple-whiteboard": patch
---

Upgrade dependencies: `lucide` to 1.33, `uuid` to 14.0.2, `vite` to 8.2.2, and
TypeScript to 7 — whose native compiler no longer ships the JavaScript compiler
API, so `@typescript/typescript6` comes along with it to keep `unplugin-dts`
able to generate the type declarations.
