// Latin1
// @see https://www.liquisearch.com/scrabble_letter_distributions/latin1
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "E", score: 1, count: 12 },
    { letter: "A", score: 1, count: 9 },
    { letter: "I", score: 1, count: 9 },
    { letter: "V", score: 1, count: 9 },
    { letter: "S", score: 1, count: 8 },
    { letter: "T", score: 1, count: 8 },
    { letter: "R", score: 1, count: 7 },
    { letter: "O", score: 1, count: 5 },
    { letter: "C", score: 2, count: 4 },
    { letter: "M", score: 2, count: 4 },
    { letter: "N", score: 2, count: 4 },
    { letter: "D", score: 2, count: 3 },
    { letter: "L", score: 2, count: 3 },
    { letter: "Q", score: 3, count: 3 },
    { letter: "B", score: 4, count: 2 },
    { letter: "G", score: 4, count: 2 },
    { letter: "P", score: 4, count: 2 },
    { letter: "X", score: 4, count: 2 },
    { letter: "F", score: 8, count: 1 },
    { letter: "H", score: 8, count: 1 }
  ];

  return scrabble;
});
