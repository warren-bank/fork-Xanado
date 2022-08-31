// Hebrew
// @see https://www.liquisearch.com/scrabble_letter_distributions/hebrew
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "‎ו‎", score: 1, count: 12 },
    { letter: "‎י‎", score: 1, count: 10 },
    { letter: "‎ת‎", score: 1, count: 9 },
    { letter: "‎ה‎", score: 1, count: 8 },
    { letter: "‎ר‎", score: 1, count: 8 },
    { letter: "‎א‎", score: 2, count: 6 },
    { letter: "‎ל‎", score: 2, count: 6 },
    { letter: "‎מ‎", score: 2, count: 6 },
    { letter: "‎ש‎", score: 2, count: 6 },
    { letter: "‎ד‎", score: 3, count: 4 },
    { letter: "‎נ‎", score: 3, count: 4 },
    { letter: "‎ב‎", score: 4, count: 4 },
    { letter: "‎ח‎", score: 4, count: 3 },
    { letter: "‎פ‎", score: 4, count: 3 },
    { letter: "‎ק‎", score: 4, count: 3 },
    { letter: "‎ג‎", score: 5, count: 2 },
    { letter: "‎כ‎", score: 5, count: 2 },
    { letter: "‎ע‎", score: 5, count: 2 },
    { letter: "‎ז‎", score: 8, count: 1 },
    { letter: "‎ט‎", score: 8, count: 1 },
    { letter: "‎ס‎", score: 8, count: 1 },
    { letter: "‎צ‎", score: 8, count: 1 }
  ];

  return scrabble;
});
