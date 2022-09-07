---
"@solid-devtools/debugger": minor
"@solid-devtools/ext-adapter": patch
"@solid-devtools/shared": patch
---

Changes to the way roots and sub roots are handled.
Now every sub root will track their own graph immediately, instead of being attached to parent tree.

Additionally the roots() and serializedRoots() signals were replaced with event emitter. (#108)
