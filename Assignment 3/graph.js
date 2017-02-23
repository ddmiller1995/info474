var margin = {top: 20, right: 20, bottom: 100, left: 80},
		width = 1200 - margin.left - margin.right,
		height = 650 - margin.top - margin.bottom;

// Initilize ranges to size of graph
var x = d3.scaleBand().rangeRound([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// Create SVG to respect margins
var svg = d3.select("body").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.attr("class", "graph")
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add x axis label
svg.append("text")
	.attr("y", height + 30)
	.attr("x", width / 2)
	.attr("dy", "1em")
	.style("text-anchor", "middle")
	.text("Year");

// Add y axis label
svg.append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 0 - margin.left)
	.attr("x", 0 - (height / 2))
	.attr("dy", "1em")
	.style("text-anchor", "middle")
	.text("Total Flights");

var months = ["January", "February", "March", "April", "May", "June", "July",
			  "August", "September", "October", "November", "December"];

// To go from YYYYMM (in dataset) to Month, YYYY
function formatDate(s) {
	return months[parseInt(s.substring(4, 6)) - 1] + ", " + s.substring(0, 4);
}

// Load data files
queue()
	.defer(d3.csv, "data/airports.csv")
	.defer(d3.csv, "data/flight_edges.csv")
	.await(ready);

function ready(error, airportsRaw, flights) {
	if (error) throw error;

	// 50 most popular domestic airports
	var top50 = ["ATL","ORD","LAX","DFW","DEN","JFK","IAH","SFO","LAS","PHX","CLT","MIA","MCO","EWR","DTW","MSP","SEA",
				 "PHL","BOS","LGA","IAD","BWI","FLL","SLC","DCA","MDW","SAN","TPA","PDX","STL","MCI","MEM","MKE","OAK",
				 "CLE","RDU","BNA","SMF","HOU","SNA","SJU","AUS","MSY","SJC","PIT","SAT","CVG","IND","DAL","PBI"];

	// Build a dictionary of airport data
	var airports = {};
	for(var i = 0; i < top50.length; i++) {
		airports[top50[i]] = {
			"name": "",
			"city": "",
			"state": "",
		}
	}

	// Populate dictionary using dataset
	for(var i = 0; i < airportsRaw.length; i++) {
		var code = airportsRaw[i]["iata"]
		if(top50.includes(code)) {
			airports[code]["name"] = airportsRaw[i]["airport"];
			airports[code]["city"] = airportsRaw[i]["city"];
			airports[code]["state"] = airportsRaw[i]["state"];
		}
	}

	// Append an option for each of the top 50 airports
	$("#airports-select").append("<option value='all'>All</option");
	for(var key in airports) {
		$("#airports-select").append("<option value='" + key + "'>" + airports[key]["name"] + "</option");
	}

	// Get the full data set
	var data = filterAirport(flights, "all");
	// Range slider default values
	var values = [1990, 2009];

	// Update dataset when a new dropdown option is selected
	$("#airports-select").change(function() {
		data = filterAirport(flights, this.value);
		filterYears(data, values);
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
			values = ui.values;
			// Call filter function
			filterYears(data, ui.values); } });
		$( "#year-range" ).val( $( "#years" ).slider( "values", 0 ) +
		" - " + $( "#years" ).slider( "values", 1 ) ); 
	});

	// Draw the visualization the first time
	drawVis(data);

}

// Recalculates the counts for flights, but only for the selected airport.
// Returns the new array of counts
function filterAirport(flights, selected) {
	var counts = {};
	for(var i = 0; i < flights.length; i++) {
		var flight = flights[i];
		if(selected == "all" || flight["Origin"] == selected || flight["Destination"] == selected) {
			if(flight["FlyDate"] in counts) {
				counts[flight["FlyDate"]] += +flight["Flights"];
			} else {
				counts[flight["FlyDate"]] = +flight["Flights"];
			}
		}
			
	}
	var data = [];
	for(var key in counts) {
		data.push({"month": key, "flights": +counts[key]});
	}
	return data;
}

// Filters the given data down the just the years specified by values
function filterYears(data, values) {
	var toVisualize = data.filter(function(d) {
		var year = parseInt(d["month"].substring(0,4));
		return year >= values[0] && year <= values[1];
	});
	drawVis(toVisualize);
}

// Clears the graph and redraws it with a scale corresponding to the given data
function drawVis(data) {

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

	yAxis = d3.axisLeft(y);

	// Clear pre-existing bars
	svg.selectAll(".bar").remove();
	// Draw new bars
	svg.selectAll(".bar")
	 		.data(data)
	 		.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d) { return x(d["month"]); })
			.attr("width", x.bandwidth())
			.attr("y", function(d) { return y(d["flights"]); })
			.attr("height", function(d) { return height - y(d["flights"]); })
			.append("svg:title")
				.text(function(d) { return formatDate(d["month"]) + ": " + d["flights"]; })

	// Clear old axixes
	svg.selectAll(".x-axis").remove();
	svg.selectAll(".y-axis").remove();

	// Add the x Axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.attr("class", "x-axis")
		.call(xAxis);



	// Add the y Axis
	svg.append("g")
		.attr("class", "y-axis")
		.call(d3.axisLeft(y));


}