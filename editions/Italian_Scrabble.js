// Italian
// @see https://www.liquisearch.com/scrabble_letter_distributions/italian
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "O", score: 1, count: 15 },
    { letter: "A", score: 1, count: 14 },
    { letter: "I", score: 1, count: 12 },
    { letter: "E", score: 1, count: 11 },
    { letter: "C", score: 2, count: 6 },
    { letter: "R", score: 2, count: 6 },
    { letter: "S", score: 2, count: 6 },
    { letter: "T", score: 2, count: 6 },
    { letter: "L", score: 3, count: 5 },
    { letter: "M", score: 3, count: 5 },
    { letter: "N", score: 3, count: 5 },
    { letter: "U", score: 3, count: 5 },
    { letter: "B", score: 5, count: 3 },
    { letter: "D", score: 5, count: 3 },
    { letter: "F", score: 5, count: 3 },
    { letter: "P", score: 5, count: 3 },
    { letter: "V", score: 5, count: 3 },
    { letter: "G", score: 8, count: 2 },
    { letter: "H", score: 8, count: 2 },
    { letter: "Z", score: 8, count: 2 },
    { letter: "Q", score: 10, count: 1 }
  ];

  return scrabble;
});
