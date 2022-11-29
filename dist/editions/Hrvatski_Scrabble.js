// Hrvatski
// @see https://en.wikipedia.org/wiki/Scrabble_letter_distributions#Croatian
define(() => {

  return {
    // Layout of lower-right quadrant, including middle row/col
    layout: [
      "M___d__T",
      "_d___d__",
      "__t___t_",
      "___D____",
      "d___D__d",
      "_d___D__",
      "__t___D_",
      "T___d__T",
    ],
    swapCount: 7,      // tiles on rack
    rackCount: 7,      // tiles swappable in a move
    bonuses: { 7: 50 }, bag: [
      { letter: "A", score: 1, count: 11 },
      { letter: "B", score: 3, count: 1 },
      { letter: "C", score: 4, count: 1 },
      { letter: "D", score: 3, count: 3 },
      { letter: "DŽ", score: 10, count: 1 },
      { letter: "E", score: 1, count: 9 },
      { letter: "F", score: 8, count: 1 },
      { letter: "G", score: 3, count: 2 },
      { letter: "H", score: 4, count: 1 },
      { letter: "I", score: 1, count: 10 },
      { letter: "J", score: 1, count: 4 },
      { letter: "K", score: 2, count: 3 },
      { letter: "L", score: 3, count: 2 },
      { letter: "LJ", score: 4, count: 1 },
      { letter: "M", score: 2, count: 3 },
      { letter: "N", score: 1, count: 6 },
      { letter: "NJ", score: 4, count: 1 },
      { letter: "O", score: 1, count: 9 },
      { letter: "P", score: 2, count: 3 },
      { letter: "R", score: 1, count: 5 },
      { letter: "S", score: 1, count: 5 },
      { letter: "T", score: 1, count: 5 },
      { letter: "U", score: 1, count: 4 },
      { letter: "V", score: 2, count: 3 },
      { letter: "Z", score: 3, count: 2 },
      { letter: "Ć", score: 5, count: 1 },
      { letter: "Č", score: 3, count: 1 },
      { letter: "Đ", score: 10, count: 1 },
      { letter: "Š", score: 4, count: 1 },
      { letter: "Ž", score: 4, count: 1 },
      { score: 0, count: 2 }
    ]};

});
