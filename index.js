#!/usr/bin/env node

const fs = require("fs");
const log = require("npmlog");
const collection = require("d3-collection");
const stringify = require("csv-stringify");
const mkdirp = require("mkdirp");
const ProgressBar = require('progress');

const download = require("./lib/download");
const aggregate = require("./lib/aggregate");
const analysis = require("./lib/analysis");
const writeFlatFiles = require("./lib/writeFlatFiles");

let store = function(opts) {
	if (!opts.format) {
		log.error("Please provide a --format param. Options are json, csv, csvs, jsonp, mongodb");
		return;
	}

	opts.format = opts.format.toLowerCase();

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

function mongo(data, opts) {
	let MongoClient = require('mongodb').MongoClient;

	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/babynames", function(err, db) {
		if(err) {		
			log.error(err);
			return;
		}

		let collection = db.collection("names");

		let bar = new ProgressBar(':bar :percent', { total: data.length + 1, complete: "#", width: 100 });
		bar.tick();

		Object.values(data).forEach(function(d) {
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
let phonemes = function(data, opts) {
	let N = opts.N || 0;

	let phonemes = {};

	data.forEach(function(d) {
		if (d.pronunciation) {
			let phoneme = d.pronunciation.split(" ").slice(N)[0];
			if (!phoneme) {
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

	phonemes = array.entries(phonemes).map(function(d) {
		return {
			phoneme: d.key,
			names: d.value.names.sort(function(a, b) { return b.peak - a.peak; }).map(function(d) { return d.name; }),
			percents: array.entries(d.value.percents).filter(function(d) { return d.value != 0; })
		}
	});


	fs.writeFileSync("./flat_files/phonemes.json", JSON.stringify(phonemes));
}

let commands = {
	download: download,
	aggregate: aggregate,
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
		commands[argv._[0]](argv);
	}
}
