console.log("background script working")
console.log("background script working")
console.log("background script working")

chrome.runtime.onConnect.addListener(port => {
  console.log(port)
})
