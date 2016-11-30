var AdmZip = require("adm-zip"),
	fs = require("fs"),
	log = require("npmlog"),
	request = require("request");

module.exports = function(opts, callback) {
	if (opts.dataset == "states") {
		downloadZipfile("https://www.ssa.gov/oact/babynames/state/namesbystate.zip", "namesbystate.zip", opts, callback);
	} else {
		downloadZipfile("http://www.ssa.gov/OACT/babynames/names.zip", "names.zip", opts, callback);
	}
}

function downloadZipfile(url, filename, opts, callback) {

	// download zip file of data
	if (fs.existsSync(filename)) {
		log.info("Already have " + filename + " downloaded. Unzipping to ./data");
		unzip();
		return;
	}

	log.info("Downloading " + filename + " from " + url);

	request(url)
		.pipe(fs.createWriteStream(filename))
		.on('close', function () {
			console.log('File downloaded!');
			unzip();
		});	

	function unzip() {
		var zip = new AdmZip(filename);
		if (opts.dataset == "states") {
			zip.extractAllTo("./extra/states");
		} else {
			zip.extractAllTo("./data");
		}

		if (!opts || !opts.cache) {
			fs.unlink(filename, function() {
				log.info("Finished unzipping. Deleted " + filename);
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
