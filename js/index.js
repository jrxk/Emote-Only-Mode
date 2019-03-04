var embed = new Twitch.Embed("twitch-embed", {
	width: "100%",
	height: "100%",
	chat: "default",
	theme: "dark",
	video: "359025333"
});

// Right pane view change code.
var words = document.getElementById("words");
var filters = document.getElementById("filters");

var tofilters_button = document.getElementById("tofilters_button");
tofilters_button.onclick = function() {
	words.style.display = "none";
	filters.style.display = "flex";
}
var towords_button = document.getElementById("towords_button");
towords_button.onclick = function() {
	filters.style.display = "none";
	words.style.display = "flex";
}

/*
	Write additional code below here.
*/

// Preprocessed data. Assign it to a variable by doing `var data = { ...data formatted as a JS object... };`.

// D3 visualization. To get the SVG object for the visualization, do `var name = document.getElementById("d3");`.
/*
	To get access to the words and word counts on the right pane, do `document.getElementById("word_#")` and `document.getElementById("word_#_count")` respectively, where # is from 1-5 inclusive. Edit their contents by doing the `element.innerHTML = "string";`.

	Emotes are usually 28px by 28px. I would give room for 10px of space between the top of a bar and an emote. You can get the height of the SVG object by using `element.getBoundingClientRect()` which has a `.width` and `.height` property. There's also `element.offsetWidth` and `element.offsetHeight`. I would check the Mozilla documentation to figure out which to use.

	https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Determining_the_dimensions_of_elements
	https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

	Generally it seems like getBoundingClientRect is the way to go since it's render size.
*/

var d3_width = document.getElementById("d3").getBoundingClientRect().width;
var d3_height = document.getElementById("d3").getBoundingClientRect().height;
// Check your console. Should be some width and a height of probably 170 px. This is just debug code so remove it later
console.log(d3_width + ", " + d3_height);

var comment_data;
var emote_data;
var requestURL = 'https://raw.githubusercontent.com/kys2/emote_only_mode/master/aggregate-emotes.json';
var request = new XMLHttpRequest();
request.open('GET', requestURL);
request.responseType = 'json';
request.send();
request.onload = function() {
	var data = request.response;
	comment_data = data.comments;
	emote_data = data.emotes;
	
	var margin = {top: 0, right: 0, bottom: 15, left: 20},
	width = d3_width - margin.left - margin.right,
	height = d3_height - margin.top - margin.bottom;

var x = d3.scaleLinear()
	.domain([0, comment_data[Object.keys(comment_data).length-1].content_offset_seconds])
	.range([0, width]);

var y = d3.scaleLinear()
        .domain([0, d3.max(comment_data, function(d) {
            var total = 0
            for (var key in d.emotes) {
                total += d.emotes[key];
            }
            return total;
        })])
        .range([height, 0]);

var xAxis = d3.axisBottom(x);

var yAxis = d3.axisLeft(y);

function padLeft(num) {
	return ("00"+num).slice(-2);
}
	
function formatTime(d) {
    var hours = Math.floor(d / 3600),
	d = (d - (hours * 3600));
   	var minutes = Math.floor(d / 60);
    var seconds = d - (minutes * 60);
    var output = hours+':'+padLeft(minutes)+':'+padLeft(seconds);
    return output;
}
	
xAxis.tickFormat(formatTime);
	
yAxis.tickFormat(d3.format("d"));

var area = d3.area()
	.x(function(d) { return x(d.content_offset_seconds); })
	.y0(height)
	.y1(function(d) {
		var total = 0;
		for (var key in d.emotes) {
			total += d.emotes[key];
		}
		return y(total);
	});

var svg = d3.select("svg#d3")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("path")
        .datum(comment_data)
        .attr("class", "area")
        .attr("d", area);

svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
        
svg.append("g")
        .attr("class", "y axis")
		.attr("transform", "translate(0 ,0)")
        .call(yAxis);

var focus = svg.append("g")
	.attr("class", "focus")
	.style("display", "none");
    
focus.append("circle")
	.attr("r", 4.5);

focus.append("image")
	.attr("x", -45)
	.attr("y", -30)
	.attr("id", "emote1")
	.attr("height", "25px")
	.attr("width", "25px");
    
focus.append("text")
	.attr("x", -15)
	.attr("y", -15)
	.attr("id", "emoteCount1");

focus.append("image")
	.attr("x", -5)
	.attr("y", -30)
	.attr("id", "emote2")
	.attr("height", "25px")
	.attr("width", "25px");
    
focus.append("text")
	.attr("x", 25)
	.attr("y", -15)
	.attr("id", "emoteCount2");

focus.append("image")
	.attr("x", 35)
	.attr("y", -30)
	.attr("id", "emote3")
	.attr("height", "25px")
	.attr("width", "25px");
    
focus.append("text")
	.attr("x", 65)
	.attr("y", -15)
	.attr("id", "emoteCount3");
    
svg.append("rect")
	.attr("class", "overlay")
	.attr("width", width)
	.attr("height", height)
	.on("mouseover", function() { focus.style("display", null); })
	.on("mouseout", function() { focus.style("display", "none") })
	.on("mousemove", function() {
		var x0 = x.invert(d3.mouse(this)[0]);
		focus.select("text").text("");
		var prev = 0,
			curr = null,
			index = 0;
		for (var key in comment_data) {
			curr = comment_data[key].content_offset_seconds;
			if (x0 > prev && x0 <= curr) {
				if (x0 - prev < curr - x0) {
					index = key - 1;
				} else {
					index = key;
				}
				break;
			}
			prev = curr;
		}
		var total = 0;
		for (var key in comment_data[index].emotes) {
			total += comment_data[index].emotes[key];
		}
		emote_string = "";
		emotes = ["", "", ""];
		emote_count = [0, 0, 0];
		for (var i = 0; i < 3; i++) {
			for (var key in comment_data[index].emotes) {
				var count = comment_data[index].emotes[key];
				if (count > emote_count[i] && emotes.indexOf(emote_data[key].link) == -1) {
					emotes[i] = emote_data[key].link;
					emote_count[i] = count;
				}
			}
		}
		//console.log(total);
		focus.attr("transform", "translate(" + x(comment_data[index].content_offset_seconds) + "," + y(total) + ")");
		focus.select("#emote1").attr("xlink:href", emotes[0]);
		focus.select("#emoteCount1").text(emote_count[0]);
		focus.select("#emote2").attr("xlink:href", emotes[1]);
		focus.select("#emoteCount2").text(emote_count[1]);
		focus.select("#emote3").attr("xlink:href", emotes[2]);
		focus.select("#emoteCount3").text(emote_count[2]);
	})
	.on("click", function() {
		var x0 = x.invert(d3.mouse(this)[0]);
		var prev = 0,
			curr = null,
			index = 0;
		for (var key in comment_data) {
			curr = comment_data[key].content_offset_seconds;
			if (x0 > prev && x0 <= curr) {
				if (x0 - prev < curr - x0) {
					index = key - 1;
				} else {
					index = key;
				}
				break;
			}
			prev = curr;
		}
		embed.player.seek(comment_data[index].content_offset_seconds);
	
	
		var words = ["", "", "", "", ""];
		var word_count = [0, 0, 0, 0, 0];
		for (var i = 0; i < 5; i++) {
			for (var key in comment_data[index].words) {
				var count = comment_data[index].words[key];
				if (count > word_count[i] && words.indexOf(key) == -1) {
					words[i] = key;
					word_count[i] = count;
				}
			}
		}
		document.getElementById("word_1").innerHTML = words[0];
		document.getElementById("word_2").innerHTML = words[1];
		document.getElementById("word_3").innerHTML = words[2];
		document.getElementById("word_4").innerHTML = words[3];
		document.getElementById("word_5").innerHTML = words[4];
		document.getElementById("word_1_count").innerHTML = word_count[0];
		document.getElementById("word_2_count").innerHTML = word_count[1];
		document.getElementById("word_3_count").innerHTML = word_count[2];
		document.getElementById("word_4_count").innerHTML = word_count[3];
		document.getElementById("word_5_count").innerHTML = word_count[4];
	});
}