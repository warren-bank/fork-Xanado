// Slovenščina
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Slovenian
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 10 },
    { letter: "B", score: 4, count: 2 },
    { letter: "C", score: 8, count: 1 },
    { letter: "D", score: 2, count: 4 },
    { letter: "E", score: 1, count: 11 },
    { letter: "F", score: 10, count: 1 },
    { letter: "G", score: 4, count: 2 },
    { letter: "H", score: 5, count: 1 },
    { letter: "I", score: 1, count: 9 },
    { letter: "J", score: 1, count: 4 },
    { letter: "K", score: 3, count: 3 },
    { letter: "L", score: 1, count: 4 },
    { letter: "M", score: 3, count: 2 },
    { letter: "N", score: 1, count: 7 },
    { letter: "O", score: 1, count: 8 },
    { letter: "P", score: 3, count: 2 },
    { letter: "R", score: 1, count: 6 },
    { letter: "S", score: 1, count: 6 },
    { letter: "T", score: 1, count: 4 },
    { letter: "U", score: 3, count: 2 },
    { letter: "V", score: 2, count: 4 },
    { letter: "Z", score: 4, count: 2 },
    { letter: "Č", score: 5, count: 1 },
    { letter: "Š", score: 6, count: 1 },
    { letter: "Ž", score: 10, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
