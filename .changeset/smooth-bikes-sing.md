---
"@solid-devtools/debugger": minor
"solid-devtools-extension": minor
"@solid-devtools/extension-adapter": minor
"@solid-devtools/locator": minor
"@solid-devtools/logger": minor
"solid-devtools": minor
"@solid-devtools/shared": minor
"@solid-devtools/ui": minor
---

This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.
