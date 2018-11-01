#!/usr/bin/env node

// get the total number of babies born from SSA
// http://www.ssa.gov/oact/babynames/numberUSbirths.html

var request = require("request");
var cheerio = require("cheerio");
var fs = require("fs");

var data = {};
var csv = "year,male,female,total\n";

request("http://www.ssa.gov/oact/babynames/numberUSbirths.html", function(err, response, body) {
	var $ = cheerio.load(body);
	$("center table tr").each(function(i, tr) {
		if (i === 0) { return; } // header row
		var $tr = $(tr);
		var datum = {
			year: 	parseInt($tr.children("td:nth-child(1)").text(), 10),
			M: 	parseInt($tr.children("td:nth-child(2)").text().replace(/,/g, ""), 10),
			F: parseInt($tr.children("td:nth-child(3)").text().replace(/,/g, ""), 10),
			both: 	parseInt($tr.children("td:nth-child(4)").text().replace(/,/g, ""), 10)
		};

		if (datum.year) {
			data[String(datum.year)] = datum;
		}

		csv += [datum.year, datum.M, datum.F, datum.both].join(",") + "\n";
	});
	fs.writeFileSync(__dirname + "/../extra/totals.json", JSON.stringify(data, null, 2));
	fs.writeFileSync(__dirname + "/../extra/totals.csv", csv);
});