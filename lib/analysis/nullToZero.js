// fill in missing years -- useful for uncommon names
module.exports = function(data, opts) {
	data.forEach(name => {
		for (let year = opts.start; year <= opts.end; year += 1) {
			if (typeof name.values[year] == "undefined") {
				name.values[year] = 0;
				name.percents[year] = 0;
			}
		}
	});
}