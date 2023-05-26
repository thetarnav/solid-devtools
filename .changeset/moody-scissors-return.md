---
'@solid-devtools/extension': minor
'@solid-devtools/debugger': minor
'@solid-devtools/frontend': minor
'@solid-devtools/overlay': minor
'@solid-devtools/logger': minor
'@solid-devtools/shared': minor
'solid-devtools': minor
---

Breaking Changes!

Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.
