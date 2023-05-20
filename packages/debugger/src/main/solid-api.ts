if (!window.SolidDevtools$$)
  throw new Error(
    '[solid-devtools]: Solid API not found. Please make sure you have installed the Solid Devtools extension...',
  )

const SolidApi = window.SolidDevtools$$

export default SolidApi
