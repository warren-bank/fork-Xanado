// עִברִי
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Hebrew
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { letter: "‎א‎", score: 2, count: 6 },
    { letter: "‎ב‎", score: 4, count: 4 },
    { letter: "‎ג‎", score: 5, count: 2 },
    { letter: "‎ד‎", score: 3, count: 4 },
    { letter: "‎ה‎", score: 1, count: 8 },
    { letter: "‎ו‎", score: 1, count: 12 },
    { letter: "‎ז‎", score: 8, count: 1 },
    { letter: "‎ח‎", score: 4, count: 3 },
    { letter: "‎ט‎", score: 8, count: 1 },
    { letter: "‎י‎", score: 1, count: 10 },
    { letter: "‎כ‎", score: 5, count: 2 },
    { letter: "‎ל‎", score: 2, count: 6 },
    { letter: "‎מ‎", score: 2, count: 6 },
    { letter: "‎נ‎", score: 3, count: 4 },
    { letter: "‎ס‎", score: 8, count: 1 },
    { letter: "‎ע‎", score: 5, count: 2 },
    { letter: "‎פ‎", score: 4, count: 3 },
    { letter: "‎צ‎", score: 8, count: 1 },
    { letter: "‎ק‎", score: 4, count: 3 },
    { letter: "‎ר‎", score: 1, count: 8 },
    { letter: "‎ש‎", score: 2, count: 6 },
    { letter: "‎ת‎", score: 1, count: 9 },
    { score: 0, count: 2 }
  ];

  return scrabble;
});
