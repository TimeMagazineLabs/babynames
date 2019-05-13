const log = require("npmlog");
const collection = require("d3-collection");

// get the year with the highest percentage
module.exports = function(data) {
	data.forEach(function(name) {
		let peak;
		collection.entries(name.percents).forEach(function(year) {
			if (!peak || peak.percent < year.value) {
				peak = {
					year: year.key,
					percent: year.value
				};
			}
		});
		name.peak = peak;
		peak.count = name.values[peak.year];
	});
}