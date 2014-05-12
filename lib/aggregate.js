var d3 = require("d3"),
	fs = require("fs"),
	log = require("npmlog");
	
var ProgressBar = require('progress');

var getYear = module.exports.getYear = function(year) {
	try {
		return d3.csv.parseRows(fs.readFileSync("./data/yob" + year + ".txt", "utf8"));
	} catch (e) {
		if (new Date().getFullYear() - year > 2) {
			log.warn("Couldn't find data for " + year);
		}
		return null;
	}
};

var loadData = module.exports.loadData = function(opts) {
	// range of years to consider
	opts.start = typeof opts.start !== "undefined" ? parseInt(opts.start, 10) : 1880;
	opts.end   = typeof opts.end !== "undefined" ? parseInt(opts.end, 10) : (new Date().getFullYear() - 1);

	var data = [];

	for (var year = opts.start; year <= opts.end; year += 1) {
		var names = getYear(year);
		if (!names) {
			continue;
		}
		names = names.map(function(n) {
			return {
				name: n[0],
				gender: n[1],
				value: parseInt(n[2], 10)
			};
		});

		var totals = {
			both: d3.sum(names, function(n) { return n.value; }),
			M: d3.sum(names, function(n) { return n.gender == "M" ? n.value : 0; }),
			F: d3.sum(names, function(n) { return n.gender == "F" ? n.value : 0; })
		}

		names.forEach(function(n) {
			n.percent = n.value / totals[n.gender];
		});

		data.push({
			year: year,
			totals: totals,
			names: names
		});

	}
	return data;
}

// organize data by name
var byName = module.exports = function(opts) {
	opts.cutoff = typeof opts.cutoff !== "undefined" ? parseFloat(opts.cutoff, 10) : 0;
	opts.min = parseFloat(opts.min) || 0;

	if (opts.names) {
		opts.names = opts.names.toLowerCase().split(",");
	}

	var files = loadData(opts),
		data = {},
		years = files.map(function(d) { return d.year; });

	log.info("Aggregating data");
	
	var bar = new ProgressBar(':bar :percent', { total: files.length, complete: "#", width: 100 });

	files.forEach(function(file) {
		//if names are specified, reduce to those
		if (opts.names) {
			file.names = file.names.filter(function(d) {
				return opts.names.indexOf(d.name.toLowerCase()) != -1;
			});
		}

		file.names.forEach(function(d) {
			var id = d.name + "-" + d.gender;
			if (!data[id]) {
				data[id] = {
					_id: id,
					name: d.name,
					gender: d.gender,
					values: {},
					percents: {},
					normalized: {}
				};	
			}
			data[id].percents[file.year] = d.percent;
			data[id].values[file.year] = d.value;
		});
		bar.tick();
	});

	var data = d3.values(data);

	log.info("Found a total of " + data.length + " names between " + opts.start + " and " + opts.end);

	// now that we have all the data, we can reduce according to specified options
	if (opts.cutoff) {
		data = data.filter(function(d) { 
			return d3.values(d.values).length >= opts.cutoff; 
		});
		log.info("Reduced to " + data.length + " names that show up in at least " + opts.cutoff + " years.");
	}

	if (opts.min) {
		data = data.filter(function(d) { 
			if (opts.type == "percents") {
				return d3.max(d3.values(d.percents)) >= opts.min; 
			}
			return d3.max(d3.values(d.values)) >= opts.min; 
		});
		log.info("Reduced to " + data.length + " names that peak at at least " + opts.min + (opts.type == "percent" ? " percent." : " instances."));
	}

	return data; 
}