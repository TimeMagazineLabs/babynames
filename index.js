#!/usr/bin/env node

var fs = require("fs"),
	log = require("npmlog"),
	helper = require("./lib/helper"),
	stringify = require("csv-stringify"),
	mkdirp = require("mkdirp");

var ProgressBar = require('progress');

var download = module.exports.download = require("./lib/download"),
	aggregate = require("./lib/aggregate"),
	tools = require("./lib/tools");

var store = module.exports.store = function(opts) {
	if (opts.type == "phonemes") {
		opts.pronunciation = true;
		opts.peaks = true;
		opts.format = "json";
	}

	if (!opts.format) {
		log.error("Please provide a --format param. Options are json, csv, csvs, jsonp, mongodb");
		return;
	}

	opts.format = opts.format.toLowerCase();

	if (opts.maxima || opts.normalize) {
		opts.peaks = true;
	}

	var data = aggregate(opts);

	// tools
	["peaks", "dense", "normalize", "maxima", "pronunciation", "decades"].forEach(function(tool) {
		if (opts[tool]) {
			tools[tool](data, opts);			
		}
	});

	if (opts.type == "phonemes") {
		phonemes(data, opts);
		return;
	}

	if (opts.format == "mongo" || opts.format == "mongodb") {
		mongo(data, opts);
		return;
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

				var headers = ["name", "gender"];

				if (opts.pronunciation) {
					headers.push("pronunciation");
					headers.push("stressed");
				}				

				for (var year = opts.start; year <= opts.end; year += 1) {
					headers.push(year);
				}

				if (opts.format === "csv") {
					var ws = fs.createWriteStream("./flat/names.csv");
					ws.write(headers.join(",") + "\n");
				}

				data.forEach(function(d) {
					var row = [];

					// densify
					headers.forEach(function(header) {
						if (typeof header == "number") {
							if (typeof d[opts.type][header] == "undefined") {
								d[opts.type][header] = 0;
							}
							row.push(d[opts.type][header]);
						} else {
							row.push(d[header]);
						}
					});

					if (opts.format === "csv") {
						ws.write(row.join(",") + "\n");
					} else {
						stringify([headers, row], function(err, output) {
							fs.writeFileSync("./flat/individuals/" + d._id + ".csv", output);
						});
					}
					bar.tick();
				});
			} else {
				if (opts.format == "jsonp") {
					opts.callback = opts.callback || "ticallback";
				}

				data.forEach(function(d) {

					if (opts.format == "jsonp") {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", opts.callback + "('" + JSON.stringify(d) + "');");
					} else {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", JSON.stringify(d, null, 2));				
					}
					roster.push(d._id);
					bar.tick();
				});
				fs.writeFileSync("./flat/roster.json", JSON.stringify(roster));

				// make a roster with only gender specifications for names that show up for both genders
				var roster_short = [];
				roster.forEach(function(d) {
					var name = d.split("-")[0],
						gender = d.split("-")[1];

					console.log(name, gender);

					if (gender == "F") {
						if (roster.indexOf(name + "-M") != -1) {
							roster_short.push(name + " (F)");
						} else {
							roster_short.push(name);
						}
					} else {
						if (roster.indexOf(name + "-F") != -1) {
							roster_short.push(name + " (M)");
						} else {
							roster_short.push(name);
						}
					}
				});
				fs.writeFileSync("./flat/roster_short.json", JSON.stringify(roster_short));


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

		helper.values(data).forEach(function(d) {
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

// aggregate by Nth phoneme (negative N counts from back)
var phonemes = function(data, opts) {
	var N = opts.N || 0;

	var phonemes = {};

	data.forEach(function(d) {
		if (d.pronunciation) {
			var phoneme = d.pronunciation.split(" ").slice(N)[0];
			if (!phoneme) {
				return 0;
			}
			if (!phonemes[phoneme]) {
				phonemes[phoneme] = {
					percents: {},
					names: []
				}
				for (var y = opts.start; y <= opts.end; y += 1) {
					phonemes[phoneme].percents[y] = 0;
				}
			}
			phonemes[phoneme].names.push({
				name: d.name,
				peak: d.peaks.percents.value
			});

			for (var y = opts.start; y <= opts.end; y += 1) {
				phonemes[phoneme].percents[y] += d.percents[y] || 0;
			}
		}
	});

	phonemes = helper.entries(phonemes).map(function(d) {
		return {
			phoneme: d.key,
			names: d.value.names.sort(function(a, b) { return b.peak - a.peak; }).map(function(d) { return d.name; }),
			percents: helper.entries(d.value.percents).filter(function(d) { return d.value != 0; })
		}
	});


	fs.writeFileSync("./flat/phonemes.json", JSON.stringify(phonemes));
}

var commands = {
	download: download,
	store: store
};

// if called directly
if (require.main === module) {
	var argv = require('minimist')(process.argv.slice(2));
	log.level = argv.log || argv.log_level || "info";
	if (!commands[argv._[0]]) {
		log.error("Command not found. Options are: ", helper.keys(commands));
	}
	commands[argv._[0]](argv);
}
