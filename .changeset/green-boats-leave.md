---
'@solid-devtools/extension': patch
---

Import the debugger using a script tag, instead of a dynamic import,
to prevent showing "Failed to load resource: the server responded with a status of 404" errors.
Fixes #241
