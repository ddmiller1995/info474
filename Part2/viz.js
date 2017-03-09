// Dakota Miller
// INFO 474 Assignment 3 Part 2
// Interactive Visualization D3 and Javascript

// ===== Map Setup =====

var widthMap = 1200,
	heightMap = 650;

var projection = d3.geoMercator();

var geoPath = d3.geoPath()
	.projection(projection);

// Scale for the size of the airport dots
var sizeScale = d3.scaleLinear()
	.domain([4500, 40000])
	.range([3, 10]);

// Scale for the size of each line
var tripsScale = d3.scaleLinear()
	.domain([1, 100])
	.range([1, 3]);

// Create primary svg for the map
var svgMap = d3.select("#map").append("svg")
	.attr("width", widthMap)
	.attr("height", heightMap)
	.attr("class", "map");

// Initilize the tooltip as invisible
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// ===== Graph Setup =====

var margin = {top: 20, right: 20, bottom: 100, left: 80};
var width = 1200 - margin.left - margin.right;
var height = 650 - margin.top - margin.bottom;

// Initilize ranges to size of graph
var x = d3.scaleBand().rangeRound([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// Create SVG to respect margins
var svgGraph = d3.select("#graph").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.attr("class", "graph")
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add x axis label
svgGraph.append("text")
	.attr("y", height + 30)
	.attr("x", width / 2)
	.attr("dy", "1em")
	.style("text-anchor", "middle")
	.text("Year");

// Add y axis label
svgGraph.append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 0 - margin.left)
	.attr("x", 0 - (height / 2))
	.attr("dy", "1em")
	.style("text-anchor", "middle")
	.text("Total Domestic Flights");

var months = ["January", "February", "March", "April", "May", "June", "July",
			  "August", "September", "October", "November", "December"];

// To go from YYYYMM (in dataset) to Month, YYYY
function formatDate(s) {
	return months[parseInt(s.substring(4, 6)) - 1] + ", " + s.substring(0, 4);
}

// Takes a slider value and returns the corresponding YYYYMM format
function rangeToDate(x) {
	var year = 1990 + Math.floor(x/12);
	var month = 1 + (x % 12);
	if(month < 10) {
		month = "0" + month.toString();
	}
	return year.toString() + month.toString();
}

// These variables are for reference throughout different functions
// Range slider default values
var mapSliderMax = 239;
var yearRange = [1990, 2009];
var selectedAirport = "all";
var mapMonth = mapSliderMax;
var totatFlights = "";

// Load data files
queue()
	.defer(d3.json, "data/us.json")
	.defer(d3.csv, "data/airports.csv")
	.defer(d3.csv, "data/flight_edges.csv")
	.await(ready);

function ready(error, us, airportsRaw, flights) {
	if (error) throw error;

	totatFlights = flights;

	// Removing the loading indicator
	$("#map").css("display", "block");
	$("#graph").css("display", "block");
	$("#loading").css("display", "none");

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
			"code": "",
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
			airports[code]["code"] = code;
			airports[code]["lat"] = airportsRaw[i]["lat"];
			airports[code]["long"] = airportsRaw[i]["long"];
			airports[code]["name"] = airportsRaw[i]["airport"];
			airports[code]["city"] = airportsRaw[i]["city"];
			airports[code]["state"] = airportsRaw[i]["state"];
		}
	}

	// ===== Map Code =====

	// Create the timeline slider
	var sliderMap = d3.select("#map").append("div")
		.attr("class", "slider-map-container")
		.append("input")
			.attr("type", "range")
			.attr("min", 0)
			.attr("max", mapSliderMax)
			.attr("step", 1)
			.attr("value", mapSliderMax)
			.attr("class", "slider-map");

	// Initialize the slider label
	var sliderWidth = $(".slider-map").width();
	var xPos = $(".slider-map").position();
	var sliderLabel = d3.select("#map").append("div")
		.html(formatDate(rangeToDate(mapSliderMax)))
		.style("left", (xPos.left + sliderWidth - 30) + "px")
		.style("top", (xPos.top - 25) + "px")
		.attr("class", "label");

	// Update slider label and filter data on slider change
	$(".slider-map").change(function() {
		var val = $(".slider-map").val();
		var label = formatDate(rangeToDate(val));
		var width = $(".slider-map").width();
		var xPos = $(".slider-map").position();
		sliderLabel.html(label)
			.style("left", (xPos.left + (val * width / mapSliderMax) - 30) + "px")
			.style("top", (xPos.top - 25) + "px");
		mapMonth = val;
		drawMap(mapFilter(airports, flights, selectedAirport, rangeToDate(val)));
	})

	// Create Airports Legend
	var legendSVG = d3.select("#map").append("div")
		.attr("class", "airport-legend")
		.text("Airport Legend")
		.append("svg")
			.attr("width", 300)
			.attr("height", 90);

	legendSVG.append("circle")
			.attr("cx", 20)
			.attr("cy", 10)
			.attr("r", 10)
			.attr("fill", "red");

	legendSVG.append("circle")
			.attr("cx", 20)
			.attr("cy", 40)
			.attr("r", 3)
			.attr("fill", "red");

	legendSVG.append("text")
		.attr("x", 35)
		.attr("y", 15)
		.text("40,000 monthly flights");

	legendSVG.append("text")
		.attr("x", 35)
		.attr("y", 45)
		.text("4,500 monthly flights");

	legendSVG.append("text")
		.attr("x", 0)
		.attr("y", 75)
		.text("Click to toggle selected airport");

	// Add the states the page
	svgMap.append("g")
		.attr("class", "states")
	.selectAll("path")
		.data(topojson.feature(us, us.objects.states).features)
	.enter().append("path")
		.attr("d", geoPath)
		.style("fill", "#AED6F1");

	// Draw the map view for the first time
	drawMap(mapFilter(airports, flights, selectedAirport, rangeToDate(mapMonth)));

	// ===== Graph Code =====

	// Append an option for each of the top 50 airports
	$("#airports-select").append("<option value='all'>All</option");
	for(var key in airports) {
		$("#airports-select").append("<option value='" + key + "'>" + airports[key]["name"] + "</option");
	}

	// Update both visualizations when a new dropdown option is selected
	$("#airports-select").change(function() {
		selectedAirport = this.value;
		drawGraph(graphFilter(flights, this.value, yearRange));
		drawMap(mapFilter(airports, flights, this.value, rangeToDate(mapMonth)));
	})
	
	// Handle slider changes
	$(function() {
		$( "#years" ).slider({
			range: true,
			min: 1990,
			max: 2009,
			values: [ 1990, 2009 ],
			slide: function( event, ui ) {
				$( "#year-range" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
				yearRange = ui.values;
				// Draw the graph with the newly filtered data
				drawGraph(graphFilter(flights, selectedAirport, yearRange));;
		 	}
		});
		$( "#year-range" ).val( $( "#years" ).slider( "values", 0 ) +
		" - " + $( "#years" ).slider( "values", 1 ) ); 
	});

	// Draw the graph view for the first time
	drawGraph(graphFilter(flights, selectedAirport, yearRange));

}

// Filter down the map data using the given parameters, and return the data to display
// as a two part object, the airport data and the flight data
function mapFilter(airports, flights, selectedAirport, month) {
	var result = [];
	// Reset flight counts
	for(var key in airports) {
		airports[key]["count"] = 0;
	}

	// Build up the flight counts and add matching flights to the list
	for(var i = 0; i < flights.length; i++) {
	var flight = flights[i];
		if(flight["FlyDate"] == month) {
			var origin = flight["Origin"];
			var dest = flight["Destination"];
			airports[origin]["count"] += +flight["Flights"];
			airports[dest]["count"] += +flight["Flights"];
			if(selectedAirport == "all" || origin == selectedAirport || dest == selectedAirport) {
				result.push(flight);
			}
		}
	}
	return  {
		filteredAirports: airports,
		filteredFlights: result
	};
}

// Filter down the graph data using the given parameters and return the data to display
function graphFilter(flights, selectedAirport, yearRange) {
	var counts = {};
	// Build the counts of flights in each month for the given airport
	for(var i = 0; i < flights.length; i++) {
		var flight = flights[i];
		if(selectedAirport == "all" || flight["Origin"] == selectedAirport || flight["Destination"] == selectedAirport) {
			if(flight["FlyDate"] in counts) {
				counts[flight["FlyDate"]] += +flight["Flights"];
			} else {
				counts[flight["FlyDate"]] = +flight["Flights"];
			}
		}
	}

	var data = [];
	// Format the data
	for(var key in counts) {
		data.push({"month": key, "flights": +counts[key]});
	}

	// Filter down the time range
	var toVisualize = data.filter(function(d) {
		var year = parseInt(d["month"].substring(0,4));
		return year >= yearRange[0] && year <= yearRange[1];
	});

	return toVisualize;
}



// Draw the given airports and lines onto the map
function drawMap(data) {
	
	var airports = data.filteredAirports;

	svgMap.selectAll("line").remove();

	svgMap.selectAll("circle").remove();

	// Add all the new lines
	svgMap.selectAll("line")
		.data(data.filteredFlights)
		.enter().append("line")
		.attr("x1", function(d) { return projection([airports[d["Origin"]]["long"], airports[d["Origin"]]["lat"]])[0]; })
		.attr("y1", function(d) { return projection([airports[d["Origin"]]["long"], airports[d["Origin"]]["lat"]])[1]; })
		.attr("x2", function(d) { return projection([airports[d["Destination"]]["long"], airports[d["Destination"]]["lat"]])[0]; })
		.attr("y2", function(d) { return projection([airports[d["Destination"]]["long"], airports[d["Destination"]]["lat"]])[1]; })
		.attr("stroke", "black")
		.attr("stroke-width", function(d) { return tripsScale(d["Flights"]); })
		.style("opacity", .02)

	
	// Add all the new circles
	svgMap.selectAll("circle")
		.data(d3.values(data.filteredAirports))
		.enter().append("circle")
		.attr("cx", function (d) { return projection([d["long"], d["lat"]])[0]; })
		.attr("cy", function (d) { return projection([d["long"], d["lat"]])[1]; })
		.attr("r", function (d) { return sizeScale(d["count"]); })
		.attr("fill", "red")
		.style("z-index", 10)
		.attr("class", "airport-circle")
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
		// Onclick event filters both map and graph to the click airport
		.on("click", function(d) {
			// Acts as a toggle
			if(selectedAirport == d["code"]) {
				selectedAirport = "all";
			} else {
				selectedAirport = d["code"];
			}
			$("#airports-select").val(selectedAirport);
			drawGraph(graphFilter(totatFlights, selectedAirport, yearRange));
			drawMap(mapFilter(airports, totatFlights, selectedAirport, rangeToDate(mapMonth)));
		})
}

// Clears the graph and redraws it with a scale corresponding to the given data
function drawGraph(data) {

	// Create axis domains
	x.domain(data.map(function(d) { return d["month"]; }))
	y.domain([0, d3.max(data, function(d) { return d["flights"]; })])

	xAxis = d3.axisBottom(x);
	// Only labels ticks with the year
	xAxis.tickFormat(function(d) {
		if(d.substring(4,6) == "01") {
			return d.substring(0, 4);
		} else {
			return "";
		}
	})

	// Sets the axis lines to the full width
	yAxis = d3.axisLeft(y)
		.tickSize(-width, 0, 0);

	// Clear pre-existing bars
	svgGraph.selectAll(".bar").remove();
	// Draw new bars
	svgGraph.selectAll(".bar")
	 		.data(data)
	 		.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d) { return x(d["month"]); })
			.attr("width", x.bandwidth())
			.attr("y", function(d) { return y(d["flights"]); })
			.attr("height", function(d) { return height - y(d["flights"]); })
			.append("svgGraph:title")
				.text(function(d) { return formatDate(d["month"]) + ": " + d["flights"]; })

	// Clear old axixes
	svgGraph.selectAll(".x-axis").remove();
	svgGraph.selectAll(".y-axis").remove();

	// Add the x Axis
	svgGraph.append("g")
		.attr("transform", "translate(0," + height + ")")
		.attr("class", "x-axis")
		.call(xAxis);

	// Add the y Axis
	svgGraph.append("g")
		.attr("class", "y-axis")
		.call(customYAxis);

	// Customize the y-axis tick lines
	function customYAxis(g) {
		g.call(yAxis);
		g.select(".domain").remove();
		g.selectAll(".tick line")
			.attr("stroke", "lightgrey")
			.attr("opacity", "0.8");
	}
}
