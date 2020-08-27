// Start by downloading the raw data for nation and states
// ./index.js download
// ./index.js download --states

const fs = require("fs");
const argv = require('minimist')(process.argv.slice(2));
const mkdirp = require("mkdirp");

const start = argv.start? parseInt(argv.start) : 1960;
const end = argv.end? parseInt(argv.end) : 2017;

let data = {};
let totals = {};
let states = {};

console.log("Gathering nationwide totals for", start, "to", end);

// get name totals for national
for (var y = start; y <= end; y += 1) {
	fs.readFileSync("../data/national/yob" + y + ".txt", "utf8").split(/[\n\r]+/g).forEach(line => {
		var info = line.split(/,/g);
		var handle = info[0] + "-" + info[1];
		totals[handle] = totals[handle] || {};
		totals[handle][y] = parseInt(info[2]);
	});
}

console.log("Got totals for", Object.keys(totals).length, "names. Reading states.");

fs.readdirSync("../data/states").forEach(file => {
	if (!/[A-Z]{2}\.TXT/.test(file)) {
		return;
	}

	states[file.split(".")[0]] = {};

	// state data
	fs.readFileSync("../data/states/" + file, "utf8").split(/[\n\r]+/g).forEach(line => {
		var info = line.split(/,/g);
		var handle = info[3] + "-" + info[1];
		var year = parseInt(info[2]);
		var value = parseInt(info[4]);
		var state = info[0];

		if (!year || year < start || year > end) {
			return;
		}

		states[state][year] = states[state][year] || { M: 0, F: 0 };
		states[state][year][info[1]] += value;

		//console.log(year, state, value);

		if (!data[handle]) {
			data[handle] = {};
			for (var y = start; y <= end; y += 1) {
				data[handle][y] = {};
			}
		}

		data[handle][year][state] = value;
	});
	console.log("Parsed", file);
});

fs.writeFileSync("../flat/state_totals.json", JSON.stringify(states, null, 2));

mkdirp("../flat/states", function() {
	var roster = [];

	Object.keys(data).forEach(handle => {
		if (argv.minimum) {
			var minimum = parseInt(argv.minimum);
			if (Object.keys(data[handle][end]).length < minimum) {
				console.log(handle, "show up in only", Object.keys(data[handle][end]).length, "states in", end, totals[handle][end]);
				return;
			}
		}

		for (var y = start; y <= end; y += 1) {
			Object.keys(data[handle][y]).forEach(state => {
				data[handle][y][state] = [data[handle][y][state], parseFloat((100 * data[handle][y][state] / states[state][y][handle.split("-")[1]]).toPrecision(3))];
			});
		}

		var datum = {
			name: handle.split("-")[0],
			gender: handle.split("-")[1],
			totals: totals[handle],
			states: data[handle]
		};

		fs.writeFileSync("../flat/states/" + handle + ".json", JSON.stringify(datum, null, 2));
		roster.push({ name: handle.split("-")[0] + " (" + handle.split("-")[1] + ")", volume: totals[handle]["2015"] });
		console.log(handle);
	});

	roster.sort(function(a, b) {
		return b.volume - a.volume;
	});

	fs.writeFileSync("../flat/state_roster.json", JSON.stringify(roster, null, 2));
	console.log("Wrote files for", roster.length, "names.");
});