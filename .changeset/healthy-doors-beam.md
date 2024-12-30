---
"@solid-devtools/frontend": patch
---

Update scroll data in timeout, after the ResizeObserver callback
To prevent this error:
 > ResizeObserver loop completed with undelivered notifications
As changing scroll data can then change el.scrollTop
Fixes #307