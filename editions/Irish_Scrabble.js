// Irish
// @see https://www.liquisearch.com/scrabble_letter_distributions/irish
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "A", score: 1, count: 13 },
    { letter: "B", score: 10, count: 1 },
    { letter: "C", score: 2, count: 4 },
    { letter: "D", score: 2, count: 4 },
    { letter: "E", score: 1, count: 6 },
    { letter: "F", score: 4, count: 2 },
    { letter: "G", score: 2, count: 3 },
    { letter: "H", score: 1, count: 10 },
    { letter: "I", score: 1, count: 10 },
    { letter: "L", score: 2, count: 4 },
    { letter: "M", score: 4, count: 2 },
    { letter: "N", score: 1, count: 7 },
    { letter: "O", score: 2, count: 4 },
    { letter: "P", score: 10, count: 1 },
    { letter: "R", score: 1, count: 7 },
    { letter: "S", score: 1, count: 6 },
    { letter: "T", score: 2, count: 4 },
    { letter: "U", score: 2, count: 3 },
    { letter: "Á", score: 4, count: 2 },
    { letter: "É", score: 8, count: 1 },
    { letter: "Í", score: 4, count: 2 },
    { letter: "Ó", score: 8, count: 1 },
    { letter: "Ú", score: 8, count: 1 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
