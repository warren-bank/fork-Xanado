/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

/**
 * Simple function to generate a 8-byte random hex key
 * @return {string}
 */
define('game/GenKey', () => {
	const chs = '0123456789abcdef'.split('');
	return () => {
		const s = [];
		for (let i = 0; i < 16; i++)
			s.push(chs[Math.floor(Math.random() * 16)]);
		return s.join('');
	};
});
