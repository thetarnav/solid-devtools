console.log("DEVTOOOOLS")

chrome.devtools.panels.create(
  "Solid Devtools", // title
  "assets/icons/solid-normal-32.png", // icon
  "src/index.html", // content
  panel => {
    console.log("panel", panel)

    // newPanel.onShown.addListener(initialisePanel);
    // newPanel.onHidden.addListener(unInitialisePanel);
  }
)
