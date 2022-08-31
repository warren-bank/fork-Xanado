// Esperanto
// @see https://www.liquisearch.com/scrabble_letter_distributions/esperanto
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "A", score: 1, count: 8 },
    { letter: "E", score: 1, count: 8 },
    { letter: "I", score: 1, count: 8 },
    { letter: "O", score: 1, count: 8 },
    { letter: "N", score: 1, count: 6 },
    { letter: "R", score: 1, count: 6 },
    { letter: "S", score: 1, count: 6 },
    { letter: "L", score: 1, count: 4 },
    { letter: "T", score: 1, count: 4 },
    { letter: "U", score: 1, count: 4 },
    { letter: "K", score: 2, count: 4 },
    { letter: "M", score: 2, count: 4 },
    { letter: "D", score: 2, count: 3 },
    { letter: "J", score: 2, count: 3 },
    { letter: "P", score: 2, count: 3 },
    { letter: "F", score: 3, count: 2 },
    { letter: "G", score: 3, count: 2 },
    { letter: "Ĝ", score: 3, count: 2 },
    { letter: "V", score: 3, count: 2 },
    { letter: "B", score: 4, count: 2 },
    { letter: "Ĉ", score: 4, count: 2 },
    { letter: "C", score: 4, count: 1 },
    { letter: "Ŝ", score: 4, count: 1 },
    { letter: "Z", score: 5, count: 1 },
    { letter: "H", score: 8, count: 1 },
    { letter: "Ŭ", score: 8, count: 1 },
    { letter: "Ĥ", score: 10, count: 1 },
    { letter: "Ĵ", score: 10, count: 1 }
  ];

  return scrabble;
});
