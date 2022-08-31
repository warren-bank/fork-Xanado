// Bulgarian
// @see https://www.liquisearch.com/scrabble_letter_distributions/bulgarian
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "А", score: 1, count: 9 },
    { letter: "О", score: 1, count: 9 },
    { letter: "Е", score: 1, count: 8 },
    { letter: "И", score: 1, count: 8 },
    { letter: "Т", score: 1, count: 5 },
    { letter: "Н", score: 1, count: 4 },
    { letter: "П", score: 1, count: 4 },
    { letter: "Р", score: 1, count: 4 },
    { letter: "С", score: 1, count: 4 },
    { letter: "В", score: 2, count: 4 },
    { letter: "Д", score: 2, count: 4 },
    { letter: "М", score: 2, count: 4 },
    { letter: "Б", score: 2, count: 3 },
    { letter: "К", score: 2, count: 3 },
    { letter: "Л", score: 2, count: 3 },
    { letter: "Г", score: 3, count: 3 },
    { letter: "Ъ", score: 3, count: 2 },
    { letter: "Ж", score: 4, count: 2 },
    { letter: "З", score: 4, count: 2 },
    { letter: "У", score: 5, count: 3 },
    { letter: "Ч", score: 5, count: 2 },
    { letter: "Я", score: 5, count: 2 },
    { letter: "Й", score: 5, count: 1 },
    { letter: "Х", score: 5, count: 1 },
    { letter: "Ц", score: 8, count: 1 },
    { letter: "Ш", score: 8, count: 1 },
    { letter: "Ю", score: 8, count: 1 },
    { letter: "Ф", score: 10, count: 1 },
    { letter: "Щ", score: 10, count: 1 },
    { letter: "Ь", score: 10, count: 1 }
  ];

  return scrabble;
});
