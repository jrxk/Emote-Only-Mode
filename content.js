console.log()
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.text === 'remove_video') {
        console.log("Remove video");
        document.getElementsByTagName("video")[0].outerHTML = "";
        chrome.tabs.create({url: chrome.extension.getURL("index.html")});
    }
});