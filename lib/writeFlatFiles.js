const fs = require('fs');
const log = require("npmlog");
const nullToZero = require("./analysis/nullToZero");
const stringify = require('csv-stringify');
const mkdirp = require('mkdirp');
const ProgressBar = require('progress');

module.exports = function (data, opts) {
	mkdirp("flat_files/individuals").then(made => {
		log.info("Writing to flat files.");
		let bar = new ProgressBar(':bar :percent', { total: data.length, complete: "#", width: 100 });

		let ws;

		if (opts.format === "csv" || opts.format === "csvs") {
			if (!opts.format_type) {
				opts.format_type = "values";
			}

			let headers = ["id", "name", "gender"];

			if (opts.peak) {
				headers.push("peak_year");
			}

			if (opts.pronunciation) {
				headers.push("pronunciation");
			}

			if (opts.pronunciation) {
				// headers.push("phonemes");
				headers.push("phoneme_first");
				headers.push("phoneme_last");
				headers.push("primaryStressIndex");
				headers.push("secondaryStressIndex");
			}

			if (opts.maxima) {
				// headers.push("maxima");
			}

			if (opts.format_type == "all" || opts.format_type == "counts" || opts.format_type == "values") {
				for (let year = opts.start; year <= opts.end; year += 1) {
					let key = opts.format_type == "all" ? (year + "_count") : year
					headers.push(key);
				}
			}

			if (opts.format_type == "all" || opts.format_type == "percents" || opts.format_type == "percent") {
				for (let year = opts.start; year <= opts.end; year += 1) {
					let key = opts.format_type == "all" ? (year + "_percent") : year
					headers.push(key);
				}
			}

			nullToZero(data, opts);

			if (opts.format === "csv") {
				ws = fs.createWriteStream(`./flat_files/names_${ opts.start }_${ opts.end }.csv`);
				ws.write(headers.join(",") + "\n");
			}

			data.forEach(function(name) {
				let row = [];

				// densify
				headers.forEach(function(header) {
					if (header == "peak_year") {
						row[header] = name.peak.year;
					} else if (header == "phoneme_first") {
						// name.phonemes.forEach((phoneme, p) => {
						// 	row["phoneme_" + p] = phoneme.phoneme;
						// });

						row.phoneme_first = name.phoneme_first? name.phoneme_first.phoneme : null;
					} else if (header == "phoneme_last") {
						row.phoneme_last = name.phoneme_last ? name.phoneme_last.phoneme : null;
					} else if (header == "primaryStressIndex" || header == "secondaryStressIndex") {
						row[header] = name[header] ? name[header][0] : -1;
					} else if (header == "maxima") {
						name.maxima.forEach((maximum, m) => {
							row["maxima_" + m] = maximum.year;
						});
					} else {
						row[header] = name[header];
					}			
				});

				if (opts.format_type == "all" || opts.format_type == "counts" || opts.format_type == "values") {
					for (let year = opts.start; year <= opts.end; year += 1) {
						let key = opts.format_type == "all" ? (year + "_count") : year
						row[key] = name.values[year];
					}
				}

				if (opts.format_type == "all" || opts.format_type == "percents" || opts.format_type == "percent") {
					for (let year = opts.start; year <= opts.end; year += 1) {
						let key = opts.format_type == "all" ? (year + "_percent") : year
						row[key] = name.percents[year];
					}
				}

				if (opts.format === "csv") {
					ws.write(headers.map(d => row[d]).join(",") + "\n");
				} else {
					let csv = headers.join(",") + "\n";
					csv += headers.map(d => row[d]).join(",");
					fs.writeFileSync("./flat_files/individuals/" + name.id + ".csv", csv);
				}
				bar.tick();
			});

			if (ws) {
				ws.end();
			}
		}

		if (opts.format == "jsonp") {
			opts.callback = opts.callback || "name_callback";
		}

		if (/json/i.test(opts.format)) {
			if (opts.format == "json_all") {
				fs.writeFileSync(`./flat_files/names_${ opts.start }_${ opts.end }.id + .json`, JSON.stringify(data, null, 2));
				return;
			}

			data.forEach(function(name) {
				if (opts.format == "jsonp") {
					fs.writeFileSync("./flat_files/individuals/" + name.id + ".json", opts.callback + "('" + JSON.stringify(name) + "');");
				} else {
					fs.writeFileSync("./flat_files/individuals/" + name.id + ".json", JSON.stringify(name, null, 2));				
				}
				bar.tick();
			});
		}
	});
}