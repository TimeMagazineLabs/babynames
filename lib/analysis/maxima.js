const log = require("npmlog");
const peaks = require("./peaks");

module.exports = function(data, opts) {
	// years to look in either direction before declaring it's a local maximum
	if (!data[0].peak) {
		console.log("Getting peaks in order to find maxima");
		peaks(data);
	}
	const WINDOW_SIZE = +opts.window || 5; // years on either side that a peak must be the highest value
	const PEAK_MIN = +opts.peak_min || 0.25; // lowest value for a peak

	data.forEach(function(name) {
		let maxima = [];
		for (let year = opts.start; year <= opts.end; year += 1) {
			let isMaxima = true;
			if (typeof name.percents[year] == "undefined") {
				isMaxima = false;
				continue;
			}
			for (let i = Math.max(opts.start, year - WINDOW_SIZE); i <= Math.min(opts.end, year + WINDOW_SIZE); i += 1) {
				if (i == year) {
					continue;
				}

				if (typeof name.percents[i] == "undefined" || name.percents[i] > name.percents[year]) {
					isMaxima = false;
					break;
				}
			}

			if (isMaxima && name.percents[year] / name.peak.percent >= PEAK_MIN) {
				maxima.push({
					year: year,
					value: name.values[year],
					percent: name.percents[year],
					height: name.percents[year] / name.peak.percent
				});
			}
		}
		name.maxima = maxima;
	});
}