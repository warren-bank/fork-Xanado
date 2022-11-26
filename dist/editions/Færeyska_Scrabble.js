// Færeyska
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Faroese
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 10 },
    { letter: "B", score: 6, count: 1 },
    { letter: "D", score: 4, count: 2 },
    { letter: "E", score: 1, count: 7 },
    { letter: "F", score: 4, count: 2 },
    { letter: "G", score: 2, count: 4 },
    { letter: "H", score: 4, count: 2 },
    { letter: "I", score: 1, count: 10 },
    { letter: "J", score: 6, count: 1 },
    { letter: "K", score: 2, count: 4 },
    { letter: "L", score: 2, count: 4 },
    { letter: "M", score: 3, count: 3 },
    { letter: "N", score: 1, count: 7 },
    { letter: "O", score: 4, count: 2 },
    { letter: "P", score: 8, count: 1 },
    { letter: "R", score: 1, count: 7 },
    { letter: "S", score: 1, count: 5 },
    { letter: "T", score: 1, count: 7 },
    { letter: "U", score: 1, count: 5 },
    { letter: "V", score: 2, count: 4 },
    { letter: "Y", score: 7, count: 1 },
    { letter: "Á", score: 5, count: 1 },
    { letter: "Æ", score: 8, count: 1 },
    { letter: "Í", score: 6, count: 1 },
    { letter: "Ð", score: 2, count: 4 },
    { letter: "Ó", score: 6, count: 1 },
    { letter: "Ø", score: 7, count: 1 },
    { letter: "Ú", score: 6, count: 1 },
    { letter: "Ý", score: 8, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
