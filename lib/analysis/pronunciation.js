const log = require("npmlog");

// http://www.speech.cs.cmu.edu/cgi-bin/cmudict
module.exports = function(data, opts) {
	const CMUDict = require('cmudict').CMUDict;
	const cmudict = new CMUDict();

	data.forEach(function(name) {
		let pronunciationStressed = cmudict.get(name.name);

		if (!pronunciationStressed) {
			log.verbose("CMU doesn't know how to pronounce " + name.name);
			return;
		}

		// set pronunciation without the numerals that indicate stress
		name.pronunciation = pronunciationStressed ? pronunciationStressed.replace(/[0-9]/g, "") : null; // e.g. Christopher -> K R IH S T AH F ER

		if (opts.phonemes && pronunciationStressed) {
			let primaryStressIndex = [];
			let secondaryStressIndex = [];

			let phonemes = pronunciationStressed.split(/\s+/g);
			phonemes = phonemes.map((phoneme, index) => {
				let d = {
					phoneme: phoneme.replace(/[0-9]/g, ""),
					stress: null
				};

				let stress = phoneme.match(/\d/);
				if (stress) {
					stress = stress[0];
					if (stress == "1") {
						// There are cases with multiple primary and secondary stresses
						// see Collete: http://www.speech.cs.cmu.edu/cgi-bin/cmudict?in=Colette&stress=-s
						// or Tatiana: http://www.speech.cs.cmu.edu/cgi-bin/cmudict?in=Tatiana&stress=-s
						primaryStressIndex.push(index);
						d.stress = "primary";
					} else if (stress == "2") {
						secondaryStressIndex.push(index);
						d.stress = "secondary";
					} else if (stress == "0") { // unclear if there's a different between 0 and nothing in CMU
						d.stress = "no_stress";
					}
				}
				return d;
				// name['phoneme_' + index] = phoneme.replace(/[0-9]/g, "");
			});
			name.phonemes = phonemes;
			name.phoneme_first = phonemes[0];
			name.phoneme_last = phonemes.slice(-1)[0];
			name.primaryStressIndex = primaryStressIndex;
			name.secondaryStressIndex = secondaryStressIndex;
		}
	});
	log.info("(Found pronunciations for " + data.filter(function(d) { return d.pronunciation; }).length + " of those.)");		
}