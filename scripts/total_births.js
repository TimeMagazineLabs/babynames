#!/usr/bin/env node

// get the total number of babies born from SSA
// http://www.ssa.gov/oact/babynames/numberUSbirths.html

const fs = require("fs");
const fetch = require('node-fetch');
const cheerio = require("cheerio");

let data = {};
let csv = "year,male,female,total\n";

fetch("http://www.ssa.gov/oact/babynames/numberUSbirths.html")
	.then(res => res.text())
    .then(body => {

		const $ = cheerio.load(body);
		$("table.t-stripe tbody tr").each(function(i, tr) {
			// if (i === 0) { return; } // header row
			let $tr = $(tr);

			let datum = {
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

		fs.writeFileSync(__dirname + "/../data/totals.json", JSON.stringify(data, null, 2));
		fs.writeFileSync(__dirname + "/../data/totals.csv", csv);
    })
    .catch(err => console.error(err));