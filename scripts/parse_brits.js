#!/usr/bin/env node

// parse the CSV files on British baby names from 1996 to 2015
// http://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/adhocs/006073babynames1996to2015

var fs = require("fs");
var csv = require("fast-csv");

var names = [];

function readFile(filename, gender, callback) {
	fs.createReadStream(filename)
	    .pipe(csv({headers : true}))
	    .on("data", function(data) {
	    	for (var year = 1996; year <= 2015; year += 1) {
	    		if (data[String(year)] == ":") {
	    			data[String(year)] = 0;
	    		}
	    	}

	    	data.gender = gender;
	    	data.name = toTitleCase(data.Name).trim();
	    	delete data.Name;
	    	names.push(data);
	    })
	    .on("end", function(){
	        console.log("done with", filename);
	        callback();
	    });
}

var headers_output = ["name","gender","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015"];

readFile("../extra/british_girls.csv", "F", function() {
	readFile("../extra/british_boys.csv", "M", function() {
		names.sort(function(a, b) {
			if (a.gender == b.gender) {
				return parseInt(b["2015"]) - parseInt(a["2015"]);
			} else {
				return b.gender < a.gender;
			}
		});

		var csvStream = csv.createWriteStream({ headers: headers_output }),
		    writableStream = fs.createWriteStream("../flat/british.csv");

		writableStream.on("finish", function(){
			console.log("DONE!");
		});

		csvStream.pipe(writableStream);

		names.forEach(function(d) {
			csvStream.write(d);
		});
 
		csvStream.end();
	});
});




function toTitleCase(str) {
	var parts = str.split("-");
	parts = parts.map(function(d) {
		return d.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	});
	return parts.join("-");
}