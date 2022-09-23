// Cymraeg
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Welsh
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 10 },
    { letter: "B", score: 3, count: 2 },
    { letter: "C", score: 4, count: 2 },
    { letter: "CH", score: 5, count: 1 },
    { letter: "D", score: 1, count: 6 },
    { letter: "DD", score: 1, count: 4 },
    { letter: "E", score: 1, count: 8 },
    { letter: "F", score: 2, count: 3 },
    { letter: "FF", score: 4, count: 2 },
    { letter: "G", score: 2, count: 3 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 7 },
    { letter: "J", score: 8, count: 1 },
    { letter: "L", score: 2, count: 3 },
    { letter: "LL", score: 5, count: 1 },
    { letter: "M", score: 3, count: 2 },
    { letter: "N", score: 1, count: 8 },
    { letter: "NG", score: 10, count: 1 },
    { letter: "O", score: 1, count: 6 },
    { letter: "P", score: 5, count: 1 },
    { letter: "R", score: 1, count: 7 },
    { letter: "RH", score: 10, count: 1 },
    { letter: "S", score: 3, count: 3 },
    { letter: "T", score: 3, count: 2 },
    { letter: "TH", score: 4, count: 2 },
    { letter: "U", score: 2, count: 3 },
    { letter: "W", score: 1, count: 5 },
    { letter: "Y", score: 1, count: 7 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
