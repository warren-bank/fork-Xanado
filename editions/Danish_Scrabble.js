// Danish
// @see https://www.liquisearch.com/scrabble_letter_distributions/danish
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "E", score: 1, count: 9 },
    { letter: "A", score: 1, count: 7 },
    { letter: "N", score: 1, count: 6 },
    { letter: "R", score: 1, count: 6 },
    { letter: "D", score: 2, count: 5 },
    { letter: "L", score: 2, count: 5 },
    { letter: "O", score: 2, count: 5 },
    { letter: "S", score: 2, count: 5 },
    { letter: "T", score: 2, count: 5 },
    { letter: "B", score: 3, count: 4 },
    { letter: "K", score: 3, count: 4 },
    { letter: "I", score: 3, count: 4 },
    { letter: "F", score: 3, count: 3 },
    { letter: "G", score: 3, count: 3 },
    { letter: "M", score: 3, count: 3 },
    { letter: "U", score: 3, count: 3 },
    { letter: "V", score: 3, count: 3 },
    { letter: "H", score: 4, count: 2 },
    { letter: "J", score: 4, count: 2 },
    { letter: "P", score: 4, count: 2 },
    { letter: "Y", score: 4, count: 2 },
    { letter: "Æ", score: 4, count: 2 },
    { letter: "Ø", score: 4, count: 2 },
    { letter: "Å", score: 4, count: 2 },
    { letter: "C", score: 8, count: 2 },
    { letter: "X", score: 8, count: 1 },
    { letter: "Z", score: 8, count: 1 }
  ];

  return scrabble;
});
