// Arabic
// @see https://www.liquisearch.com/scrabble_letter_distributions/arabic
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "ﺍ", score: 1, count: 8 },
    { letter: "ﻝ", score: 1, count: 4 },
    { letter: "ﺝ", score: 1, count: 4 },
    { letter: "ﺡ", score: 1, count: 3 },
    { letter: "ﺥ", score: 1, count: 3 },
    { letter: "ﻡ", score: 1, count: 3 },
    { letter: "ﻥ", score: 1, count: 3 },
    { letter: "ﻩ", score: 1, count: 3 },
    { letter: "ﻭ", score: 1, count: 3 },
    { letter: "ﻯ", score: 1, count: 3 },
    { letter: "ﺏ", score: 2, count: 4 },
    { letter: "ﺭ", score: 2, count: 3 },
    { letter: "ﺕ", score: 2, count: 4 },
    { letter: "ﺩ", score: 2, count: 3 },
    { letter: "ﺱ", score: 2, count: 3 },
    { letter: "ﺙ", score: 2, count: 3 },
    { letter: "ﻑ‎", score: 3, count: 3 },
    { letter: "ﻕ‎", score: 3, count: 3 },
    { letter: "ﺫ‎", score: 3, count: 3 },
    { letter: "ﺵ‎", score: 3, count: 3 },
    { letter: "ﺯ‎", score: 3, count: 3 },
    { letter: "ﺹ", score: 4, count: 3 },
    { letter: "ﺽ", score: 4, count: 3 },
    { letter: "ﻉ", score: 4, count: 3 },
    { letter: "ﻙ", score: 4, count: 3 },
    { letter: "ﻁ", score: 4, count: 2 },
    { letter: "ﻅ", score: 5, count: 2 },
    { letter: "ﺉ‎", score: 6, count: 2 },
    { letter: "ﻍ", score: 8, count: 2 },
    { letter: "ﺀ", score: 8, count: 2 },
    { letter: "ﺃ", score: 10, count: 2 },
    { letter: "ﺅ", score: 10, count: 2 }
  ];

  return scrabble;
});
