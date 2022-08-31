// Basque
// @see https://www.liquisearch.com/scrabble_letter_distributions/basque
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "A", score: 1, count: 14 },
    { letter: "E", score: 1, count: 12 },
    { letter: "I", score: 1, count: 9 },
    { letter: "N", score: 1, count: 8 },
    { letter: "O", score: 1, count: 6 },
    { letter: "T", score: 1, count: 6 },
    { letter: "U", score: 1, count: 6 },
    { letter: "K", score: 2, count: 5 },
    { letter: "R", score: 2, count: 5 },
    { letter: "D", score: 3, count: 4 },
    { letter: "B", score: 4, count: 3 },
    { letter: "Z", score: 4, count: 3 },
    { letter: "G", score: 5, count: 2 },
    { letter: "H", score: 5, count: 2 },
    { letter: "L", score: 5, count: 2 },
    { letter: "S", score: 5, count: 2 },
    { letter: "J", score: 8, count: 1 },
    { letter: "M", score: 8, count: 1 },
    { letter: "P", score: 8, count: 1 },
    { letter: "RR", score: 8, count: 1 },
    { letter: "TS", score: 8, count: 1 },
    { letter: "TX", score: 8, count: 1 },
    { letter: "TZ", score: 8, count: 1 },
    { letter: "F", score: 10, count: 1 },
    { letter: "X", score: 10, count: 1 }
  ];

  return scrabble;
});
