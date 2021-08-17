const log = require("npmlog");
const d3 = require("d3");
const peaks = require("./peaks");

module.exports = function(data) {
	// normalized data for a given name over time, with 1 equaling the peak value
	if (!data[0].peak) {
		console.log("Getting peaks in order to normalize");
		peaks(data);
	}

	data.forEach(function(name) {
		name.normalized = {};

		for (const [year, value] of Object.entries(name.percents)) {
			name.normalized[year] = value / name.peak.percent;
		}
	});
}