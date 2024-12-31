---
"@solid-devtools/debugger": minor
"@solid-devtools/frontend": patch
"@solid-devtools/overlay": patch
"@solid-devtools/shared": patch
"solid-devtools": patch
"@solid-devtools/extension": patch
---

Refactor `useDebugger`.
`useLocator` is removed, instead use `useDebugger().setLocatorOptions()`.
`debugger.meta.versions` moved to `debugger.versions`
