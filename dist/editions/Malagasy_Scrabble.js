// Malagasy
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Malagasy
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 20 },
    { letter: "B", score: 4, count: 2 },
    { letter: "D", score: 3, count: 2 },
    { letter: "E", score: 1, count: 4 },
    { letter: "F", score: 2, count: 2 },
    { letter: "G", score: 10, count: 1 },
    { letter: "H", score: 6, count: 1 },
    { letter: "I", score: 1, count: 11 },
    { letter: "J", score: 6, count: 1 },
    { letter: "K", score: 1, count: 5 },
    { letter: "L", score: 3, count: 2 },
    { letter: "M", score: 2, count: 2 },
    { letter: "N", score: 1, count: 13 },
    { letter: "O", score: 1, count: 14 },
    { letter: "P", score: 4, count: 2 },
    { letter: "R", score: 6, count: 1 },
    { letter: "S", score: 1, count: 4 },
    { letter: "T", score: 1, count: 6 },
    { letter: "V", score: 2, count: 2 },
    { letter: "Y", score: 1, count: 4 },
    { letter: "Z", score: 6, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
