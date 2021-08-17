// Takes the raw year-by-year data from SSA and aggregates by name and gender
// First you must download the raw data with `./index.js download`

const fs = require("fs");
const log = require("npmlog");
const ProgressBar = require('progress');
const totals = require(__dirname + "/../data/totals.json");
const d3 = require('d3'); // Common convenience.

let getYear = function(year) {
	try {
		let data = fs.readFileSync(__dirname + "/../data/national/yob" + year + ".txt", "utf8").split("\n");
		return data.map(function(d) {
			return d.split(",");
		});
	} catch (e) {
		if (new Date().getFullYear() - year > 1) {
			log.warn("Couldn't find data for " + year + " because: ", e);
		}
		return null;
	}
};

let loadData = function(opts) {
	// range of years to consider
	opts.start = typeof opts.start !== "undefined" ? parseInt(opts.start, 10) : 1880;

	// if end is not specified, assume the previous year's data is out by June 1
	opts.end   = typeof opts.end !== "undefined" ? parseInt(opts.end, 10) : (new Date().getFullYear() - (new Date().getMonth() < 5 ? 2 : 1));

	let data = [];

	for (let year = opts.start; year <= opts.end; year += 1) {
		let names = getYear(year);

		if (!names) {
			continue;
		}

		names = names.map(n => {
			return {
				name: n[0],
				gender: n[1],
				id: (n[0] + "-" + n[1]).toLowerCase(),
				value: +n[2]
			};
		});

		names.forEach(n => {
			n.percent = n.value / totals[year][n.gender];
		});

		data.push({
			year: year,
			totals: totals[year],
			names: names
		});

	}
	return data;
}

// organize data by name
// opts.min: Don't include names that don't show up at least this many times in at least one year. Ex: `--min=25`. Default is 1
// opts.cutoff: Don't include names that don't show up in at least this many individual years. Ex: --cutoff=50. Default is 1
// opts.names: Comma-delimited list of specific names to inspect
// opts.types: Which unit to use for opts.min. Default is values, but can pass "percent"

module.exports = function(opts) {
	opts.min = parseFloat(opts.min, 10) || 0;
	opts.cutoff = typeof opts.cutoff !== "undefined" ? parseFloat(opts.cutoff, 10) : 0;
	opts.type = opts.type || "values";

	if (opts.name) {
		opts.names = opts.name;
	}

	if (opts.names) {
		opts.names = opts.names.toLowerCase().split(",");

		// you can optionally ask for a specific gender with `Christopher-M` etc., or default to getting bother genders where present
		let names = [];
		opts.names.forEach(d => {
			if (/\-m/.test(d) || /\-f/.test(d)) {
				names.push(d);
			} else {
				names.push(d + "-m");
				names.push(d + "-f");
			}
		});
		opts.names = names;
	}

	let files = loadData(opts);

	let data = {};
	let years = files.map(d => d.year );

	log.info("Aggregating data");
	
	let bar = new ProgressBar(':bar :percent', { total: files.length, complete: "#", width: 100 });

	// organize data by name ids
	files.forEach(function(file) {
		//if names are specified, reduce to those
		if (opts.names) {
			file.names = file.names.filter(d => {
				return opts.names.indexOf(d.id) != -1;
			});
		}

		file.names.forEach(function(d) {
			// let id = d.name + "-" + d.gender;
			if (!data[d.id]) {
				data[d.id] = {
					id: d.id,
					name: d.name,
					gender: d.gender,
					values: {},
					percents: {}
				};	
			}
			data[d.id].percents[file.year] = d.percent;
			data[d.id].values[file.year] = d.value;
		});
		bar.tick();
	});

	data = Object.values(data);

	log.info("Found a total of " + data.length + " names between " + opts.start + " and " + opts.end);

	// now that we have all the data, we can reduce according to specified options
	if (opts.cutoff) {
		data = data.filter(function(name) { 
			return Object.values(name.values).length >= opts.cutoff; 
		});
		log.info("Reduced to " + data.length + " names that show up in at least " + opts.cutoff + " years.");
	}

	if (opts.min) {
		data = data.filter(function(name) { 
			if (opts.type == "percents") {
				return d3.max(Object.values(name.percents)) >= +opts.min; 
			}
			return d3.max(Object.values(name.values)) >= +opts.min; 
		});
		log.info("Reduced to " + data.length + " names that peak at at least " + opts.min + (opts.type == "percent" ? " percent." : " instances."));
	}

	return data;
}