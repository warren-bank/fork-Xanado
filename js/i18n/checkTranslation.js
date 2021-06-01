/* See README.md at the root of this distribution for copyright and
   license information */

/* eslint-env node */

/**
 * Command-line invocation of the Valett word corpus analyser
 * Based on code from https://github.com/jmlewis/valett
 */
const requirejs = require('requirejs');

requirejs.config({
	baseUrl: `${__dirname}/..`
});

function compare(na, a, nb, b, verbose) {
	for (let key of Object.keys(a)) {
		if (verbose)
			console.log(`Checking ${na} ${key} in ${nb}`);
		if (b[key]) {
			let match;
			const re = /(\$[0-9]+)/g;
			while ((match = re.exec(a[key])) !== null) {
				if (b[key].indexOf(match[0]) < 0)
					console.log(`${nb} ${key} is missing ${match[0]}`);
			}
		}
		else
			console.log(`${key} is in ${na} but not in ${nb}`);
	}
}

requirejs(['node-getopt', 'fs-extra'], (Getopt, Fs) => {

	const i18n = `${__dirname}/../../i18n`;

	const DESCRIPTION = [
		'USAGE',
		`node ${process.argv[1].replace(/.*\//, '')} <language>`,
		'Check that the translations file for <language> is consistent',
		' with en.json. For example:',
		`node ${process.argv[1].replace(/.*\//, '')} fr`
	];

	const opt = Getopt.create([
		[ 'v', 'verbose', 'Shout about it' ]
	])
		.bindHelp()
		.setHelp(`${DESCRIPTION}\nOPTIONS\n[[OPTIONS]]`)
		.parseSystem();

    if (opt.argv.length == 0) {
        opt.showHelp();
        throw 'No word language given';
    }

	const language = opt.argv.shift();
	const txf = `${i18n}/${language}.json`;
	const enf = `${i18n}/en.json`;
	let tx, en;
	console.log(`Reading ${txf}`);
	Fs.readFile(txf)
	.then(data => tx = JSON.parse(data.toString()))
	.then(() => console.log(`Reading ${enf}`))
	.then(() => Fs.readFile(enf))
	.then(data => en = JSON.parse(data.toString()))
	.then(() => compare('en', en, language, tx, opt.options.verbose))
	.then(() => compare(language, tx, 'en', en, opt.options.verbose))
	.catch(e => {
		console.log(e);
		console.log(DESCRIPTION.join('\n'));		
	});
});

