// Melayu
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Malay
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 19 },
    { letter: "B", score: 3, count: 3 },
    { letter: "C", score: 8, count: 1 },
    { letter: "D", score: 3, count: 3 },
    { letter: "E", score: 1, count: 7 },
    { letter: "F", score: 10, count: 1 },
    { letter: "G", score: 3, count: 4 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 7 },
    { letter: "J", score: 5, count: 1 },
    { letter: "K", score: 1, count: 6 },
    { letter: "L", score: 2, count: 4 },
    { letter: "M", score: 1, count: 5 },
    { letter: "N", score: 1, count: 8 },
    { letter: "O", score: 4, count: 2 },
    { letter: "P", score: 4, count: 2 },
    { letter: "R", score: 1, count: 5 },
    { letter: "S", score: 2, count: 4 },
    { letter: "T", score: 1, count: 5 },
    { letter: "U", score: 1, count: 6 },
    { letter: "W", score: 8, count: 1 },
    { letter: "Y", score: 5, count: 1 },
    { letter: "Z", score: 10, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
