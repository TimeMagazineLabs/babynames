#!/usr/bin/env node

const fs = require("fs");
const log = require("npmlog");
const stringify = require("csv-stringify");
const mkdirp = require("mkdirp");
const ProgressBar = require('progress');

const download = module.exports.download = require("./lib/download");
const aggregate = require("./lib/aggregate");
const analysis = require("./lib/analysis");
const writeFlatFiles = require("./lib/writeFlatFiles");

let store = function(opts) {
	if (!opts.format) {
		log.error("Please provide a --format param. Options are json, csv, csvs, jsonp, mongodb");
		return;
	}

	opts.format = opts.format.toLowerCase();

	if (opts.maxima || opts.normalize || opts.peak) {
		opts.peaks = true;
	}

	// aggregate the data
	let data = aggregate(opts);

	// add any analyses we'd like
	Object.keys(analysis).forEach(function(key) {
		if (opts[key]) {
			console.log("Running analysis", key);
			analysis[key](data, opts);			
		}
	});

	// fs.writeFileSync("test.json", JSON.stringify(data, null, 2));
	// return;

	if (opts.format == "mongo" || opts.format == "mongodb") {
		mongo(data, opts);
		return;
	} else {
		writeFlatFiles(data, opts);
	}
}

function flatfiles(data, opts) {
	mkdirp("flat/individuals").then(made => {
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
	const MongoClient = require('mongodb').MongoClient;
	const dbName = opts.db_name || 'babynames';
	const mongo_URI = opts.mongo_uri || 'mongodb://localhost:27017';
	const client = new MongoClient(mongo_URI, { useNewUrlParser: true });

	console.log("Connecting to Mongo...");

	// Connect to the db
	client.connect(function(err) {
		if(err) {
			log.error(err);
			return;
		}

		let bar = new ProgressBar(':bar :percent', { total: data.length + 1, complete: "#", width: 100 });
		bar.tick();

		const db = client.db(dbName);
		const collection = db.collection("names");

		console.log(`Successfully connected to Mongo and created "${ dbName }" database with a collection called "names."`);
		console.log("Now adding data");

		Object.values(data).forEach(function(d) {
			d._id = d.id;
		});

		collection.insertMany(Object.values(data), function(err, result) {
			if (err) {
				log.error(err);
			}
			console.log(`Added ${ result.result.n } names.` );
			client.close();
		});
	});
}

// aggregate by Nth phoneme (negative N counts from back)
let phonemes = function(data, opts) {
	let N = opts.N || 0;

	let phonemes = {};

	data.forEach(function(d) {
		if (d.pronunciation) {
			let phoneme = d.pronunciation.split(" ").slice(N)[0];
			if (!phoneme) {
				console.log("Couldn't location a pronunciation for", d.name);
				return 0;
			}
			if (!phonemes[phoneme]) {
				phonemes[phoneme] = {
					percents: {},
					names: []
				}
				for (let y = opts.start; y <= opts.end; y += 1) {
					phonemes[phoneme].percents[y] = 0;
				}
			}
			phonemes[phoneme].names.push({
				name: d.name,
				peak: d.peaks.percents.value
			});

			for (let y = opts.start; y <= opts.end; y += 1) {
				phonemes[phoneme].percents[y] += d.percents[y] || 0;
			}
		}
	});

	phonemes = Object.entries(phonemes).map(function(d) {
		return {
			phoneme: d.key,
			names: d.value.names.sort(function(a, b) { return b.peak - a.peak; }).map(function(d) { return d.name; }),
			percents: Object.entries(d.value.percents).filter(function(d) { return d.value != 0; })
		}
	});


	fs.writeFileSync("./flat_files/phonemes.json", JSON.stringify(phonemes));
}

const commands = {
	download: download,
	store: store
};

// if called directly
if (require.main === module) {
	let argv = require('minimist')(process.argv.slice(2));
	log.level = argv.log || argv.log_level || "info";
	if (!commands[argv._[0]]) {
		log.error("Command not found. Options are: ", Object.keys(commands));
	}
	if (argv._[0] == "download") {
		if (argv.states) {
			commands[argv._[0]]({ dataset: "states" });
		} else {
			commands[argv._[0]]({});
		}
	} else {
		if (!commands.hasOwnProperty(argv._[0])) {
			console.log("Please pass a function (`download` or `store`) as the first argument.")
			return;
		}
		commands[argv._[0]](argv);
	}
} else {
	module.exports = commands;
}
