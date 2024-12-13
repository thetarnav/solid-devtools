---
"@solid-devtools/shared": minor
---

Improve solid detection.
Check for Symbol("solid-track") in scripts.
Wait for document load before checking.
Check all scripts, even ones loaded with esm import (not added to html).
