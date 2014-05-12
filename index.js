#!/usr/bin/env node

var fs = require("fs"),
	log = require("npmlog"),
	d3 = require('d3'),
	mkdirp = require('mkdirp');

var ProgressBar = require('progress');

var download = require("./lib/download"),
	aggregate = require("./lib/aggregate"),
	tools = require("./lib/tools");

function store(opts) {
	if (!opts.format) {
		log.error("Please provide a --format param. Options are json, csv, csvs, jsonp, mongodb")
		return;
	}

	opts.format = opts.format.toLowerCase();

	if (opts.maxima || opts.normalize) {
		opts.peaks = true;
	}

	var data = aggregate(opts);

	// tools
	["peaks", "dense", "normalize", "maxima", "pronunciation"].forEach(function(tool) {
		if (opts[tool]) {
			tools[tool](data, opts);			
		}
	});

	if (opts.format == "mongo" || opts.format == "mongodb") {
		mongo(data, opts);
	} else {
		flatfiles(data, opts);
	}
}

function flatfiles(data, opts) {
	mkdirp("flat/individuals", function() {
			log.info("Writing to flat files.");
			var bar = new ProgressBar(':bar :percent', { total: data.length, complete: "#", width: 100 });

			var roster = [];

			if (opts.format === "csv" || opts.format === "csvs") {
				if (!opts.type) {
					opts.type = "values";
				}

				var csv = [],
					headers = ["name", "gender"];

				if (opts.pronunciation) {
					headers.push("pronunciation");
					headers.push("stressed");
				}				

				for (var year = opts.start; year <= opts.end; year += 1) {
					headers.push(year);
				}

				if (opts.format === "csv") {
					var ws = fs.createWriteStream("./flat/names.csv");
					ws.write(d3.csv.formatRows([headers]) + "\n");
				}

				data.forEach(function(d) {
					var datum = {},
						row = [];

					// densify
					headers.forEach(function(header) {
						if (typeof header == "number") {
							if (typeof d[opts.type][header] == "undefined") {
								d[opts.type][header] = 0;
							}
							datum[header] = d[opts.type][header];
							row.push(d[opts.type][header]);
						} else {
							datum[header] = d[header]
							row.push(d[header]);
						}
					});

					if (opts.format === "csv") {
						ws.write(d3.csv.formatRows([row]) + "\n");
					} else {
						fs.writeFileSync("./flat/individuals/" + d._id + ".csv", d3.csv.format([datum]));				
					}
					bar.tick();
				});
				//ws.close();

			} else {
				if (opts.format == "jsonp") {
					opts.callback = opts.callback || "ticallback";
				}

				data.forEach(function(d) {

					if (opts.format == "jsonp") {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", opts.callback + "('" + JSON.stringify(d) + "');");
					} else if (opts.format == "csvs") {
						fs.writeFileSync("./flat/individuals/" + d._id + ".csv", d3.csv.format(d.values));				
					} else {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", JSON.stringify(d, null, 2));				
					}
					roster.push(d._id);
					bar.tick();
				});
				fs.writeFileSync("./flat/roster.json", JSON.stringify(roster));
			}
	});
}

function mongo(data, opts) {
	var MongoClient = require('mongodb').MongoClient;

	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/babynames", function(err, db) {
		if(err) {		
			log.error(err);
			return;
		}

		var collection = db.collection("names");

		var bar = new ProgressBar(':bar :percent', { total: data.length + 1, complete: "#", width: 100 });
		bar.tick();

		d3.values(data).forEach(function(d) {
			collection.save(d, function(err, doc) {
				if (err) {
					log.error(err);
					return;
				}

				bar.tick();
				if (bar.complete) {
					db.close();
				}
			});
		});
	});
}

var commands = {
	download: download,
	store: store
}

// if called directly
if (require.main === module) {
	var argv = require('optimist').argv;
	log.level = argv["log"] || argv.log_level || "info";
	commands[argv._[0]](argv);
}