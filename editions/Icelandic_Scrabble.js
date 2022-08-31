// Icelandic
// @see https://www.liquisearch.com/scrabble_letter_distributions/icelandic
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "A", score: 1, count: 10 },
    { letter: "I", score: 1, count: 8 },
    { letter: "N", score: 1, count: 8 },
    { letter: "R", score: 1, count: 7 },
    { letter: "E", score: 1, count: 6 },
    { letter: "S", score: 1, count: 6 },
    { letter: "U", score: 1, count: 6 },
    { letter: "T", score: 1, count: 5 },
    { letter: "Ð", score: 2, count: 5 },
    { letter: "G", score: 2, count: 4 },
    { letter: "K", score: 2, count: 3 },
    { letter: "L", score: 2, count: 3 },
    { letter: "M", score: 2, count: 3 },
    { letter: "F", score: 3, count: 3 },
    { letter: "O", score: 3, count: 3 },
    { letter: "H", score: 3, count: 2 },
    { letter: "V", score: 3, count: 2 },
    { letter: "D", score: 4, count: 2 },
    { letter: "Á", score: 4, count: 2 },
    { letter: "Í", score: 4, count: 2 },
    { letter: "Þ", score: 4, count: 1 },
    { letter: "J", score: 5, count: 1 },
    { letter: "Æ", score: 5, count: 1 },
    { letter: "B", score: 6, count: 1 },
    { letter: "É", score: 6, count: 1 },
    { letter: "Ó", score: 6, count: 1 },
    { letter: "Y", score: 7, count: 1 },
    { letter: "Ö", score: 7, count: 1 },
    { letter: "P", score: 8, count: 1 },
    { letter: "Ú", score: 8, count: 1 },
    { letter: "Ý", score: 9, count: 1 },
    { letter: "X", score: 10, count: 1 }
  ];

  return scrabble;
});
