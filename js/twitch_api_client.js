const twitch_api = 'https://api.twitch.tv/v5/'

const fetchVideoInfo = async (videoId) => {
	let params = {
		"client_id": "lilafa2xzc63rj3vgpjhq312hjoax9",
  	}

	let query = Object.keys(params)
	.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
	.join('&');

	const response = await fetch(`${twitch_api}videos/${videoId}?` + query);
	const videoInfo = await response.json();
	console.log("Video Info:", videoInfo);
	return videoInfo;
}

// Fetch all comments for a video and save to a file
// Example: fetchComments("405684183","");
const saveComments = async (videoId, cursor) => {
	let video = await fetchCommentsBlocks(videoId, cursor);
	let videoJSON = {
		comments: video
	}
	// console.log(JSON.stringify(video, null, 2));
	saveText( JSON.stringify(videoJSON), "video.json" );
}

// Sequentially fetch the comment blocks for a video. Initial cursor should be ""
const fetchCommentsBlocks = async (videoId, cursor) => {
	let video = [];
	let params = {
  		"client_id": "lilafa2xzc63rj3vgpjhq312hjoax9",
	}
	while (cursor != undefined) {
		if (cursor != '') {
			params["cursor"] = cursor
		}

		let query = Object.keys(params)
	             .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
	             .join('&');

		const response = await fetch(`${twitch_api}videos/${videoId}/comments?` + query);
		const commentsBlock = await response.json(); //extract JSON from the http response
		// video["comments"] += commentsBlock["comments"];
		for (let comment in commentsBlock["comments"]) {
			video.push(commentsBlock["comments"][comment]);
		}

		// console.log(commentsBlock);
		cursor = commentsBlock["_next"];
	}
	console.log(video)
	return video;
}

const saveText = async (text, filename) => {
    var a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-u,'+encodeURIComponent(text));
    a.setAttribute('download', filename);
    a.click();
}

const parseEmotes = async (fetcher, messages, channelName) => {
	const wordRegex = /\b([^ ]+?)\b/g; // Matches whole words only
    // We populate the emote cache by calling these three functions
    // We don't need the results of the calls
    // These might take several seconds to complete
    await Promise.all([
		fetcher.fetchTwitchEmotes(),
        fetcher.fetchBTTVEmotes(channelName),
        fetcher.fetchFFZEmotes(channelName)
    ]).catch(err => { 
		console.log("Fetching emotes:", err);
		return; 
	});

    const allEmotes = {};
    const prunedMessages = messages.map(messageObj => {
        const emotes = {};
        const words = {};
        const tokens = messageObj.message.body.match(wordRegex);
        if (tokens !== null) {
            tokens.forEach(token => {
                const emote = fetcher.emotes.get(token);
                if (emote != null) {
                    const name = emote.toString();
                    if (!(name in emotes)) emotes[name] = 0;
                    emotes[name]++;

                    // Add emote to the global cache
                    if (!(name in allEmotes)) {
                        allEmotes[name] = {
                            name,
                            type: emote.type,
                            link: emote.toLink()
                        };
                    }
                } else {
                    const word = token.toLowerCase();
                    if (!(token in words)) words[word] = 0;
                    words[word]++;
                }
            });
        }

        return {
            //text: messageObj.message.body,
            content_offset_seconds: messageObj.content_offset_seconds,
            emotes,
            words
        };
    });

    let parsedComments = {
        comments: prunedMessages,
        emotes: allEmotes
    };

    // Pretty-print the result
    console.log(JSON.stringify(parsedComments, null, 2));
    return parsedComments;
}

const aggregateComments = ({comments, emotes}) => {
	const AGGREGATION_INTERVAL = 10; // seconds

	// Merges an array of elements. Does not modify the originals.
	const mergeComments = function (entries) {
	    const sumEntry = {
	        content_offset_seconds: 0,
	        emotes: {},
	        words: {}
	    };
	    
	    entries.forEach(entry => {
	        for (let emote in entry.emotes) {
	            if (emote in sumEntry.emotes) {
	                sumEntry.emotes[emote] += entry.emotes[emote];
	            } else {
	                sumEntry.emotes[emote] = entry.emotes[emote];
	            }
	        }
	        for (let word in entry.words) {
	            if (word in sumEntry.words) {
	                sumEntry.words[word] += entry.words[word];
	            } else {
	                sumEntry.words[word] = entry.words[word];
	            }
	        }
	    });

	    return sumEntry;
	}

	let timestamps = [];
	let currTimestamp = 0;
	// Store the index of the first comment we care about (after (currTimestamp-10))
	let firstCommentIndex = 0;

	while (firstCommentIndex < comments.length) {
	    // list of comments to merge
	    let toMerge = [];
	    for (let index = firstCommentIndex; index < comments.length; index++) {
	        if (comments[index].content_offset_seconds > (currTimestamp + 1)) break;
	        toMerge.push(comments[index]);
	    }

	    if (toMerge.length > 0) {
	        const merged = mergeComments(toMerge);
	        merged.content_offset_seconds = currTimestamp;
	        timestamps.push(merged);
	    }
	    currTimestamp += 1;

	    // Advance comments until their timestamp we care about again
	    while (firstCommentIndex < comments.length &&
	        comments[firstCommentIndex].content_offset_seconds < 
	        (currTimestamp - AGGREGATION_INTERVAL + 1)) 
	        firstCommentIndex++;
	}

	let aggregatedComments = { comments: timestamps, emotes }
	console.log(JSON.stringify(aggregatedComments, null, 2));
	return aggregatedComments
}