// Português
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Portuguese
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 14 },
    { letter: "B", score: 3, count: 3 },
    { letter: "C", score: 2, count: 4 },
    { letter: "D", score: 2, count: 5 },
    { letter: "E", score: 1, count: 11 },
    { letter: "F", score: 4, count: 2 },
    { letter: "G", score: 4, count: 2 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 10 },
    { letter: "J", score: 5, count: 2 },
    { letter: "L", score: 2, count: 5 },
    { letter: "M", score: 1, count: 6 },
    { letter: "N", score: 3, count: 4 },
    { letter: "O", score: 1, count: 10 },
    { letter: "P", score: 2, count: 4 },
    { letter: "Q", score: 6, count: 1 },
    { letter: "R", score: 1, count: 6 },
    { letter: "S", score: 1, count: 8 },
    { letter: "T", score: 1, count: 5 },
    { letter: "U", score: 1, count: 7 },
    { letter: "V", score: 4, count: 2 },
    { letter: "X", score: 8, count: 1 },
    { letter: "Z", score: 8, count: 1 },
    { letter: "Ç", score: 3, count: 2 },
    { score: 0, count: 3 }
  ];

  return scrabble;
});
