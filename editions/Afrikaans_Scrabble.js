// Afrikaans
// @see https://www.liquisearch.com/scrabble_letter_distributions/afrikaans
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 9 },
    { letter: "B", score: 8, count: 1 },
    { letter: "D", score: 1, count: 6 },
    { letter: "E", score: 1, count: 16 },
    { letter: "F", score: 8, count: 1 },
    { letter: "G", score: 2, count: 4 },
    { letter: "H", score: 2, count: 3 },
    { letter: "I", score: 1, count: 8 },
    { letter: "J", score: 10, count: 1 },
    { letter: "K", score: 3, count: 3 },
    { letter: "L", score: 2, count: 3 },
    { letter: "M", score: 4, count: 2 },
    { letter: "N", score: 1, count: 8 },
    { letter: "O", score: 1, count: 6 },
    { letter: "P", score: 5, count: 2 },
    { letter: "R", score: 1, count: 6 },
    { letter: "S", score: 1, count: 6 },
    { letter: "T", score: 1, count: 6 },
    { letter: "U", score: 4, count: 2 },
    { letter: "V", score: 5, count: 2 },
    { letter: "W", score: 3, count: 3 },
    { letter: "Y", score: 4, count: 2 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
