// Eesti
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Estonian
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 10 },
    { letter: "B", score: 4, count: 1 },
    { letter: "D", score: 2, count: 4 },
    { letter: "E", score: 1, count: 9 },
    { letter: "F", score: 8, count: 1 },
    { letter: "G", score: 3, count: 2 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 9 },
    { letter: "J", score: 4, count: 2 },
    { letter: "K", score: 1, count: 5 },
    { letter: "L", score: 1, count: 5 },
    { letter: "M", score: 2, count: 4 },
    { letter: "N", score: 2, count: 4 },
    { letter: "O", score: 1, count: 5 },
    { letter: "P", score: 4, count: 2 },
    { letter: "R", score: 2, count: 2 },
    { letter: "S", score: 1, count: 8 },
    { letter: "T", score: 1, count: 7 },
    { letter: "U", score: 1, count: 5 },
    { letter: "V", score: 3, count: 2 },
    { letter: "Z", score: 10, count: 1 },
    { letter: "Ä", score: 5, count: 2 },
    { letter: "Õ", score: 4, count: 2 },
    { letter: "Ö", score: 6, count: 2 },
    { letter: "Ü", score: 5, count: 2 },
    { letter: "Š", score: 10, count: 1 },
    { letter: "Ž", score: 10, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
