---
'solid-devtools-extension': minor
'@solid-devtools/debugger': minor
'@solid-devtools/frontend': minor
'@solid-devtools/overlay': minor
'@solid-devtools/logger': minor
'@solid-devtools/shared': minor
'solid-devtools': minor
---

#### Dependency graph

Adds a dependency graph to the debugger. It collcts observers and sources of currently inspected computation or signal.

Breaking changes to the debugger emitter API - instead of events being emitted and listened to individually, now they all can be listened to at once which makes it easier to add new events in the future and maintaining the debugger - devtools bridge implementation in packages that use it.

Closes #113
Closes #208
Closes #213
Fixes #210
