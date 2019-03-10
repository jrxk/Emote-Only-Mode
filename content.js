chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.action === 'replace') {
        console.log(msg.vid)
        var vid = document.getElementsByClassName("video-player-hosting-ui__container")[0];
        if (vid != undefined) {
            vid.innerHTML = '';
            var embedDiv = document.createElement("div");     
            embedDiv.setAttribute("id", "twitch-embed");
            vid.appendChild(embedDiv);

            var embed = new Twitch.Embed("twitch-embed", {
                width: "100%",
                height: "100%",
                chat: "default",
                theme: "dark",
                video: msg.vid
            });
        }
    }
});