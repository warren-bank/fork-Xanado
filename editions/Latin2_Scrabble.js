// Latin2
// @see https://www.liquisearch.com/scrabble_letter_distributions/latin2
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 9 },
    { letter: "B", score: 5, count: 2 },
    { letter: "C", score: 2, count: 4 },
    { letter: "D", score: 3, count: 3 },
    { letter: "E", score: 1, count: 11 },
    { letter: "F", score: 6, count: 1 },
    { letter: "G", score: 6, count: 1 },
    { letter: "H", score: 10, count: 1 },
    { letter: "I", score: 1, count: 11 },
    { letter: "L", score: 4, count: 2 },
    { letter: "M", score: 2, count: 5 },
    { letter: "N", score: 1, count: 6 },
    { letter: "O", score: 2, count: 5 },
    { letter: "P", score: 4, count: 2 },
    { letter: "Q", score: 10, count: 1 },
    { letter: "R", score: 1, count: 9 },
    { letter: "S", score: 1, count: 8 },
    { letter: "T", score: 1, count: 7 },
    { letter: "U", score: 1, count: 7 },
    { letter: "V", score: 5, count: 2 },
    { letter: "X", score: 6, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
