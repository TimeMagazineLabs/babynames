const log = require("npmlog");
const d3 = require("d3");

// get the year with the highest percentage
module.exports = function(data) {
	data.forEach(function(name) {
		let peak;

		for (const [year, value] of Object.entries(name.percents)) {
			if (!peak || peak.percent < value) {
				peak = {
					year: year,
					percent: value
				};
			}
		}
		name.peak = peak;
		peak.count = name.values[peak.year];
	});
}