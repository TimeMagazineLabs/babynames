var log = require("npmlog"),
	helper = require("./helper");

module.exports.peaks = function(data) {
	//peaks
	data.forEach(function(d) {
		d.peaks = {}
		var peak;
		helper.entries(d.values).forEach(function(year) {
			if (!peak || peak.value < year.value) {
				peak = {
					year: parseInt(year.key, 10),
					value: year.value
				};
			}
		});
		d.peaks.values = peak;
	});

	data.forEach(function(d) {
		var peak;
		helper.entries(d.percents).forEach(function(year) {
			if (!peak || peak.value < year.value) {
				peak = {
					year: parseInt(year.key, 10),
					value: year.value
				};
			}
		});
		d.peaks.percents = peak;
	});
}

module.exports.normalize = function(data) {
	// normalized data from percents
	data.forEach(function(d) {
		d.normalized = {};
		helper.entries(d.percents).forEach(function(year) {
			d.normalized[year.key] = year.value / d.peaks.percents.value
		});
	});
}

module.exports.decades = function(data, opts) {
	// list of decades by name popularity
	data.forEach(function(d){
		d.decades = {};
		var decades = [],
		    thisName = 0,
			totalNames = 0,
			firstYear = helper.entries(d.percents)[0].key,
			lastYear = helper.entries(d.percents)[helper.entries(d.percents).length - 1].key,
			currentDecade = firstYear - (firstYear % 10);
        helper.entries(d.values).forEach(function(year){
        	if(year.key > (currentDecade + 9)) {
        		decades.push({decade: currentDecade + "'s", popularity: thisName / totalNames});
                thisName = 0;
                totalNames = 0;
                currentDecade = year.key - (year.key % 10);
        	}
        	thisName += year.value;
        	totalNames += year.value / d.percents[year.key];
        	if(year.key === lastYear)
        		decades.push({decade: currentDecade + "'s", popularity: thisName / totalNames});
		});
        decades.sort(function(prev, current) {
        	return current.popularity - prev.popularity;
        });
        decades.forEach(function(decade) {
        	d.decades[decade.decade] = decade.popularity;
        });
	});
}
var pronunciation = module.exports.pronunciation = function(data) {
	var CMUDict = require('cmudict').CMUDict;
	var cmudict = new CMUDict();

	data.forEach(function(d) {
		var stressed = cmudict.get(d.name);
		d.stressed = stressed || null;
		d.pronunciation = stressed ? stressed.replace(/[0-9]/g, "") : null;
		if (!stressed) {
			log.verbose("CMU doesn't know how to pronounce " + d.name);
		}
	});
	log.info("(Found pronunciations for " + data.filter(function(d) { return d.stressed; }).length + " of those.)");		
}

// make an individual name dense
var densify = module.exports.densify = function(datum) {
	for (var year = opts.start; year <= opts.end; year += 1) {
		if (typeof datum[year] == "undefined") {
			datum[year] = 0;
			datum[year] = 0;
		}
	}
}

module.exports.dense = function(data, opts) { 
	// fill in zero for names not present in given year if desired
	data.forEach(function(d) {
		densify(d);
	});
}

module.exports.maxima = function(data, opts) {
	data.forEach(function(d) {
		d.maxima = maxima(d, opts);
	});
}

function maxima(name, opts) {
	// years to look in either direction before declaring it's a local maximum
	var window_size = 5,
		maxima = [];

	for (var year = opts.start; year <= opts.end; year += 1) {
		var isMaxima = true;
		for (var i = Math.max(opts.start, year - window_size); i <= Math.min(opts.end, year + window_size); i += 1) {
			if (typeof name.percents[i] == "undefined" || typeof name.percents[year] == "undefined") {
				isMaxima = false;
				break;				
			}
			if ((i < year && name.percents[i] > name.percents[year]) || (i > year && name.percents[i] > name.percents[year])) {
				isMaxima = false;
				break;
			}
		}
		if (isMaxima && name.percents[year] / name.peaks.percents.value > 0.25) {
			maxima.push({
				year: year,
				value: name.values[year],
				percent: name.percents[year],
				height: name.percents[year] / name.peaks.percents.value
			});
		}
	}
	return maxima;
}