// Finnish
// @see https://www.liquisearch.com/scrabble_letter_distributions/finnish
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 10 },
    { letter: "B", score: 8, count: 1 },
    { letter: "C", score: 10, count: 1 },
    { letter: "D", score: 7, count: 1 },
    { letter: "E", score: 1, count: 8 },
    { letter: "F", score: 8, count: 1 },
    { letter: "G", score: 8, count: 1 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 10 },
    { letter: "J", score: 4, count: 2 },
    { letter: "K", score: 2, count: 5 },
    { letter: "L", score: 2, count: 5 },
    { letter: "M", score: 3, count: 3 },
    { letter: "N", score: 1, count: 9 },
    { letter: "O", score: 2, count: 5 },
    { letter: "P", score: 4, count: 2 },
    { letter: "R", score: 4, count: 2 },
    { letter: "S", score: 1, count: 7 },
    { letter: "T", score: 1, count: 9 },
    { letter: "U", score: 3, count: 4 },
    { letter: "V", score: 4, count: 2 },
    { letter: "Y", score: 4, count: 2 },
    { letter: "Ä", score: 2, count: 5 },
    { letter: "Ö", score: 7, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
