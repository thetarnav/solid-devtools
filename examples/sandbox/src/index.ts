async function attachOverlay() {
  const { attachDevtoolsOverlay } = await import('@solid-devtools/overlay')

  attachDevtoolsOverlay({
    defaultOpen: true,
    noPadding: true,
  })
}

;(async () => {
  if (process.env.BUILD) {
    await import('solid-devtools/setup')
    await attachOverlay()
  } else if (!process.env.EXT) {
    await attachOverlay()
  }

  import('./main')
})()
