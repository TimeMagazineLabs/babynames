var DATA_URL = "http://www.ssa.gov/OACT/babynames/names.zip",
	FILENAME = "./" + DATA_URL.split("/").slice(-1)[0]; 

var AdmZip = require("adm-zip"),
	fs = require("fs"),
	log = require("npmlog"),
	http = require("http");

module.exports = function(opts, callback) {
	downloadZipfile(DATA_URL, FILENAME, opts, callback);
}

function downloadZipfile(url, filename, opts, callback) {

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
				if (callback) {
					callback();
				}		
			});
		} else {
			log.info("Finished unzipping.");	
			if (callback) {
				callback();
			}		
		}
	}
}
