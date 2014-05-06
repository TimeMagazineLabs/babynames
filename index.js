#!/usr/bin/env node

var fs = require("fs"),
	log = require("npmlog"),
	AdmZip = require("adm-zip"),
	d3 = require('d3'),
	mkdirp = require('mkdirp'),
	http = require('http');

var ProgressBar = require('progress');

var DATA_URL = "http://www.ssa.gov/OACT/babynames/names.zip",
	FILENAME = "./" + DATA_URL.split("/").slice(-1)[0]; 

var argv = require('optimist').argv;

log.level = argv["log"] || argv.log_level || "info";

var commands = {
	download: download,
	store: store
}

commands[argv._[0]](argv);

function download(opts) {
	downloadZipfile(DATA_URL, FILENAME, opts)
}

function downloadZipfile(url, filename, opts) {
	// download zip file of data
	if (fs.existsSync(filename)) {
		log.info("Already have " + filename + " downloaded. Unzipping to ./data");
		unzip();
		return;
	}

	log.info("Downloading " + filename + " from " + url);

	var f = fs.createWriteStream(filename);

	f.on('finish', function() {
        // unzip
		log.info("Finished downloading. Unzipping to ./data");
		unzip();
    });

	var request = http.get(url, function(response) {
		response.pipe(f);
	});

	function unzip() {
		var zip = new AdmZip(filename);
		zip.extractAllTo("./data");


		if (!opts || !opts.cache) {
			fs.unlink(filename, function() {
				log.info("Finished unzipping. Deleted");
			});
		} else {
			log.info("Finished unzipping.");			
		}
	}
}

function make(opts) {
	var data = {},
		opts = opts || {},
		years = [],
		year,
		names,
		bar;

	opts.cutoff = typeof opts.cutoff !== "undefined" ? parseInt(opts.cutoff, 10) : 0;
	opts["start"] = typeof opts["start"] !== "undefined" ? parseInt(opts["start"], 10) : 1880;
	opts["end"] = typeof opts["end"] !== "undefined" ? parseInt(opts["end"], 10) : (new Date().getFullYear());
	opts.min = opts.min || 0;

	var files = fs.readdirSync("./data").filter(function(d) { 
		if (!/\.txt/.test(d)) { // only consider text files in archive
			return false;
		}

		var year = parseInt(d.split(".")[0].replace("yob", ""));

		if (year < opts["start"] || year > opts["end"]) {
			return false;
		}
		return true;			
	});

	log.info("Aggregating data");
	
	bar = new ProgressBar(':bar :percent', { total: files.length, complete: "#", width: 100 });

	files.forEach(function(fn) {
		names = d3.csv.parseRows(fs.readFileSync("./data/" + fn, "utf8"));
		year = fn.split(".")[0].replace("yob", "");
		years.push("" + year);

		names.forEach(function(d) {
			var id = d[0] + "-" + d[1];
			data[id] = data[id] || {
				_id: id,
				name: d[0],
				gender: d[1],
				volume: {}
			};
			data[id].volume[year] = parseInt(d[2], 10);
		});
		bar.tick();
	});

	years = years.sort(function(a, b) {
		return a < b ? -1 : 1;
	});

	data = d3.values(data);

	log.info("Found a total of " + data.length + " names between " + years[0] + " and " + years[years.length-1]);

	if (opts.cutoff) {
		data = data.filter(function(d) { 
			return d3.values(d.volume).length >= opts.cutoff && d3.max(d3.values(d.volume)) >= opts.min; 
		});
		log.info("Reduced to " + data.length + " names that show up in at least " + opts.cutoff + " years and peak at at least " + opts.min + " instances.");
	}

	// fill in zero for names not present in given year if desired
	if (opts.dense) {
		data.forEach(function(d) {
			years.forEach(function(year) {
				if (typeof d.volume[year] == "undefined") {
					d.volume[year] = 0;
				}
			});
		});
	}

	return data;
}

function store(opts) {
	if (!opts.format) {
		log.error("Please provide a --format param. Options are json, csv, csvs, jsonp, mongodb")
		return;
	}

	opts.format = opts.format.toLowerCase();
	if (opts.format == "mongo" || opts.format == "mongodb") {
		mongo(opts);
	} else {
		flatfiles(opts);
	}
}

function flatfiles(opts) {
	if (opts.format === "csv" || opts.format === "csvs") {
		opts.dense = true;
	}

	var data = make(opts);

	mkdirp("flat", function() {
		log.info("Writing to flat files.");

		var bar = new ProgressBar(':bar :percent', { total: data.length, complete: "#", width: 100 });

		var roster = [];

		if (opts.format === "csv") {
			var csv = [];
			data.forEach(function(d) {
				var datum = d.volume;
				datum.name = d.name;
				datum.gender = d.gender;
				csv.push(datum);
				bar.tick();
				roster.push(d._id);
			});
			fs.writeFileSync("./flat/" + "names.csv", d3.csv.format(csv));
			return;
		} else {
			if (opts.format == "jsonp") {
				opts.callback = opts.callback || "ticallback";
			}

			mkdirp("flat/individuals", function() {
				data.forEach(function(d) {
					if (opts.format == "jsonp") {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", opts.callback + "('" + JSON.stringify(d) + "');");
					} else if (opts.format == "csvs") {
						fs.writeFileSync("./flat/individuals/" + d._id + ".csv", d3.csv.format(d.volume));				
					} else {
						fs.writeFileSync("./flat/individuals/" + d._id + ".json", JSON.stringify(d, null, 2));				
					}
					bar.tick();
					roster.push(d._id);
				});
			});
		}

		fs.writeFileSync("./flat/roster.json", JSON.stringify(roster));
	});
}

function mongo(opts) {
	var MongoClient = require('mongodb').MongoClient;

	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/babynames", function(err, db) {
		if(err) {		
			log.error(err);
			return;
		}

		var collection = db.collection("names"),
			data = {};

		var data = make(opts);

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









/*

function getYear(year) {
	return d3.csv.parseRows(fs.readFileSync("./data/yob" + year + ".txt", "utf8"));
}

function getDict() {
	var words = {};
	fs.readFileSync("./dicts/2of12.txt", "utf8").split(/\s+/g).forEach(function(word) {
		words[word.toLowerCase()] = 1;
	});
	return words;
}

function reverse(str) {
	var rev = "";
	for (var c = str.length - 1; c >= 0; c -= 1) {
		rev += str[c].toLowerCase();
	}
	return rev;
}

//downloadFile(DATA_URL, FILENAME);
//unzip();

/*
var words = getDict();

var names = getYear(2012);

names = names.sort(function(a, b) {
	return b[0].toLowerCase() > a[0].toLowerCase() ? -1 : 1;
})

names.forEach(function(name) {
	if (!words[name[0].toLowerCase()]) {
		words[name[0].toLowerCase()] = 2;
	}
});

names.forEach(function(name) {
	var match = words[reverse(name[0].toLowerCase().replace(/ /g, ""))];
	if (match == 1) {
		console.log(name[0], "(" + name[1] + ")", name[2], reverse(name[0]));
	}
});
*/
