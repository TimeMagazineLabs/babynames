var DATA_URL = "http://www.ssa.gov/OACT/babynames/names.zip",
	FILENAME = "./" + DATA_URL.split("/").slice(-1)[0]; 

var AdmZip = require("adm-zip"),
	fs = require("fs"),
	log = require("npmlog"),
	http = require("http");

module.exports = function(opts) {
	downloadZipfile(DATA_URL, FILENAME, opts);
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
