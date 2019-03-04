chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({color: '#3aa757'}, function() {
      console.log("The color is green.");
    });
});

chrome.browserAction.onClicked.addListener(function(tab) {
    if (tab.url.indexOf("https://www.twitch.tv/videos/") !== -1) {
        // chrome.runtime.sendMessage({text: 'remove_video'});
        chrome.tabs.sendMessage(tab.id, {text: 'remove_video'});
        chrome.tabs.create({url: chrome.extension.getURL("index.html")});
    }
});