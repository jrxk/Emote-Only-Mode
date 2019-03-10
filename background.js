chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({color: '#3aa757'}, function() {
      console.log("The color is green.");
    });
});

chrome.browserAction.onClicked.addListener(function(tab) {
    if (tab.url.indexOf("https://www.twitch.tv/videos/") !== -1) {
        var videoID = tab.url.split('/')[4];
        console.log(videoID);
        // chrome.runtime.sendMessage({text: 'remove_video'});
        // chrome.tabs.sendMessage(tab.id, {action: 'replace', vid: videoID});
        chrome.tabs.create({url: chrome.extension.getURL("index.html")});
    }
});