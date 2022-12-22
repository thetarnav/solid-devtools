import { attachDevtoolsOverlay } from '@solid-devtools/overlay'

!process.env.EXT &&
  attachDevtoolsOverlay({
    defaultOpen: true,
    noPadding: true,
  })
