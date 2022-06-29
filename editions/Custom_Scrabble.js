// Scrabble with tile distributions determined using Valett using
// dictionaries/CSW2019.txt as the corpus

define("editions/Custom_Scrabble", ["editions/_Scrabble"], (Scrabble) => {

	const scrabble = Scrabble();
	
	scrabble.bag = [
		{ score: 0, count: 2 },
    { letter: 'A', score: 1, count: 7 },
    { letter: 'B', score: 2, count: 2 },
    { letter: 'C', score: 2, count: 4 },
    { letter: 'D', score: 2, count: 3 },
    { letter: 'E', score: 1, count: 11 },
    { letter: 'F', score: 2, count: 1 },
    { letter: 'G', score: 2, count: 3 },
    { letter: 'H', score: 2, count: 2 },
    { letter: 'I', score: 1, count: 8 },
    { letter: 'J', score: 8, count: 1 },
    { letter: 'K', score: 3, count: 1 },
    { letter: 'L', score: 1, count: 5 },
    { letter: 'M', score: 2, count: 3 },
    { letter: 'N', score: 1, count: 6 },
    { letter: 'O', score: 1, count: 6 },
    { letter: 'P', score: 2, count: 3 },
    { letter: 'Q', score: 12, count: 1 },
    { letter: 'R', score: 1, count: 7 },
    { letter: 'S', score: 1, count: 9 },
    { letter: 'T', score: 1, count: 6 },
    { letter: 'U', score: 2, count: 3 },
    { letter: 'V', score: 4, count: 1 },
    { letter: 'W', score: 3, count: 1 },
    { letter: 'X', score: 5, count: 1 },
    { letter: 'Y', score: 2, count: 2 },
    { letter: 'Z', score: 4, count: 1 }
	];
	
	return scrabble;
});
