const fetcher = new Bundle.EmoteFetcher();

let isInjected = {}; // tracks injected tabs

chrome.browserAction.onClicked.addListener(function(tab) {
    if (tab.url.indexOf("https://www.twitch.tv/videos/") !== -1) {
        // Asks content script whether the page is already injected
        chrome.tabs.sendMessage(tab.id, {command: "injected?"}, function(response) { 
            if (response == "No") {
                // Only inject if not injected
                let videoID = tab.url.split('/')[4].match(/^\d+/)[0]; // get leading digits
                console.log(videoID);
        
                chrome.tabs.sendMessage(tab.id, {command: "inject"});
                isInjected[tab.id] = true;
        
                (async () => {
                    console.log("async");
                    let videoInfo = await fetchVideoInfo(videoID);
                    let messages = await fetchCommentsBlocks(videoID, "");
                    let parsedComments = await parseEmotes(fetcher, messages, videoInfo.channel.name);
                    let aggregatedComments = await aggregateComments(parsedComments);
                    
                    chrome.tabs.sendMessage(tab.id, {command: "loadComments", data: aggregatedComments});
                    console.log("Message sent");
                })();
            }
        });
    }
})


chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (isInjected[tabId] && tab.active && change.url) {
        // current injected tab changes url
        chrome.tabs.sendMessage(tab.id, {command: "remove"});
        isInjected[tabId] = false;
    }
});