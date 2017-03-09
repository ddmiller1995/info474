var width = 1200,
	height = 650;

var projection = d3.geoMercator();

var path = d3.geoPath()
	.projection(projection);

// Scale for the size of the airport dots
var sizeScale = d3.scaleLinear()
	.domain([4500, 40000])
	.range([3, 10]);

// Scale for the size of each line
var tripsScale = d3.scaleLinear()
	.domain([1, 100])
	.range([1, 3]);

var svg = d3.select("body").append("svg")
	.attr("width", width)
	.attr("height", height)
	.attr("class", "map");

var sliderMax = 239;

// Create the timeline slider
var slider = d3.select("body").append("div")
	.attr("class", "slider-container")
	.append("input")
		.attr("type", "range")
		.attr("min", 0)
		.attr("max", sliderMax)
		.attr("step", 1)
		.attr("value", sliderMax)
		.attr("class", "slider");

// Initialize the slider label
var width = $(".slider").width();
var x = $(".slider").position();
var sliderLabel = d3.select("body").append("div")
	.html(formatDate(rangeToDate(sliderMax)))
	.style("left", (x.left + width - 30) + "px")
	.style("top", (x.top - 25) + "px")
	.attr("class", "label");

// Takes a slider value and returns the corresponding YYYYMM format
function rangeToDate(x) {
	var year = 1990 + Math.floor(x/12);
	var month = 1 + (x % 12);
	if(month < 10) {
		month = "0" + month.toString();
	}
	return year.toString() + month.toString();
}

// To go from YYYYMM (in dataset) to Month, YYYY
function formatDate(s) {
	return s.substring(4, 6) + ", " + s.substring(0, 4);
}

// Initilize the tooltip as invisible
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// Load data files
queue()
	.defer(d3.json, "data/us.json")
	.defer(d3.csv, "data/airports.csv")
	.defer(d3.csv, "data/flight_edges.csv")
	.await(ready);

function ready(error, us, airportsRaw, flights) {
	if (error) throw error;

	projection
		.scale(1100)
		.center([-100, 40])

	// 50 most popular domestic airports
	var top50 = ["ATL","ORD","LAX","DFW","DEN","JFK","IAH","SFO","LAS","PHX","CLT","MIA","MCO","EWR","DTW","MSP","SEA",
				 "PHL","BOS","LGA","IAD","BWI","FLL","SLC","DCA","MDW","SAN","TPA","PDX","STL","MCI","MEM","MKE","OAK",
				 "CLE","RDU","BNA","SMF","HOU","SNA","SJU","AUS","MSY","SJC","PIT","SAT","CVG","IND","DAL","PBI"];

	// Build a dictionary of airport data
	var airports = {};
	for(var i = 0; i < top50.length; i++) {
		airports[top50[i]] = {
			"count": 0,
			"lat": "",
			"long": "",
			"name": "",
			"city": "",
			"state": "",
		}
	}

	// Populate dictionary using dataset
	for(var i = 0; i < airportsRaw.length; i++) {
		var code = airportsRaw[i]["iata"]
		if(top50.includes(code)) {
			airports[code]["lat"] = airportsRaw[i]["lat"];
			airports[code]["long"] = airportsRaw[i]["long"];
			airports[code]["name"] = airportsRaw[i]["airport"];
			airports[code]["city"] = airportsRaw[i]["city"];
			airports[code]["state"] = airportsRaw[i]["state"];
		}
	}

	// Update slider label and filter data on slider change
	$(".slider").change(function() {
		var val = $(".slider").val();
		var label = formatDate(rangeToDate(val));
		var width = $(".slider").width();
		var x = $(".slider").position();
		sliderLabel.html(label)
			.style("left", (x.left + (val * width / sliderMax) - 30) + "px")
			.style("top", (x.top - 25) + "px");
		filterMonth(rangeToDate(val), airports, flights)
	})

	// Add the states the page
	svg.append("g")
		.attr("class", "states")
	.selectAll("path")
		.data(topojson.feature(us, us.objects.states).features)
	.enter().append("path")
		.attr("d", path)
		.style("fill", "#AED6F1");

	// draw airports using lat, long, and scaled size
	filterMonth(rangeToDate(sliderMax), airports, flights);
}

// Filter the data to just the given month
function filterMonth(date, airports, flights) {
	var result = [];
	// Reset flight counts
	for(var key in airports) {
		airports[key]["count"] = 0;
	}

	// Build up the flight counts and add matching flights to the list
	for(var i = 0; i < flights.length; i++) {
	var flight = flights[i];
		if(flight["FlyDate"] == date) {
			var origin = flight["Origin"];
			var dest = flight["Destination"];
			airports[origin]["count"] += +flight["Flights"];
			airports[dest]["count"] += +flight["Flights"];
			result.push(flight);
		}
	}
	drawVis(airports, result);
}

// Draw the given airports and lines onto the map
function drawVis(airports, lines) {

	var lines = svg.selectAll("line")
		.data(lines);

	var circles = svg.selectAll("circle")
		.data(d3.values(airports));

	// Clear any old lines or airports
	lines.exit().remove();
	circles.exit().remove();

	// Add all the new lines
	lines.enter()
		.append("line")
		.attr("x1", function(d) { return projection([airports[d["Origin"]]["long"], airports[d["Origin"]]["lat"]])[0]; })
		.attr("y1", function(d) { return projection([airports[d["Origin"]]["long"], airports[d["Origin"]]["lat"]])[1]; })
		.attr("x2", function(d) { return projection([airports[d["Destination"]]["long"], airports[d["Destination"]]["lat"]])[0]; })
		.attr("y2", function(d) { return projection([airports[d["Destination"]]["long"], airports[d["Destination"]]["lat"]])[1]; })
		.attr("stroke", "black")
		.attr("stroke-width", function(d) { return tripsScale(d["Flights"]); })
		.style("opacity", .02)

	
	// Add all the new circles
	circles.enter()
		.append("circle")
		.attr("cx", function (d) { return projection([d["long"], d["lat"]])[0]; })
		.attr("cy", function (d) { return projection([d["long"], d["lat"]])[1]; })
		.attr("r", function (d) { return sizeScale(d["count"]); })
		.attr("fill", "red")
		// Mouseover events for tooltip
		.on("mouseover", function(d) {
			tooltip.transition()
				.duration(200)
				.style("opacity", .9);
			tooltip.html(d["name"] + "<br/>" + d["city"] + ", " + d["state"] + "<br/>Flights: " +  d["count"])
				.style("left", (d3.event.pageX + 5) + "px")
				.style("top", (d3.event.pageY + 5) + "px")
				.style("opacity", .9);
		})
		.on("mouseout", function(d) {
			tooltip.transition()
				.duration(200)
				.style("opacity", 0);
		})
}