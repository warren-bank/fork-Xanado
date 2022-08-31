// Greek
// @see https://www.liquisearch.com/scrabble_letter_distributions/greek
define(["editions/_Scrabble"], Scrabble => {

  const scrabble = Scrabble();

  scrabble.bag = [
    { score: 0, count: 2 },
    { letter: "Α", score: 1, count: 12 },
    { letter: "Ο", score: 1, count: 9 },
    { letter: "Ε", score: 1, count: 8 },
    { letter: "Ι", score: 1, count: 8 },
    { letter: "Τ", score: 1, count: 8 },
    { letter: "Η", score: 1, count: 7 },
    { letter: "Σ", score: 1, count: 7 },
    { letter: "Ν", score: 1, count: 6 },
    { letter: "Ρ", score: 2, count: 5 },
    { letter: "Κ", score: 2, count: 4 },
    { letter: "Π", score: 2, count: 4 },
    { letter: "Υ", score: 2, count: 4 },
    { letter: "Λ", score: 3, count: 3 },
    { letter: "Μ", score: 3, count: 3 },
    { letter: "Ω", score: 3, count: 3 },
    { letter: "Γ", score: 4, count: 2 },
    { letter: "Δ", score: 4, count: 2 },
    { letter: "Β", score: 8, count: 1 },
    { letter: "Φ", score: 8, count: 1 },
    { letter: "Χ", score: 8, count: 1 },
    { letter: "Ζ", score: 10, count: 1 },
    { letter: "Θ", score: 10, count: 1 },
    { letter: "Ξ", score: 10, count: 1 },
    { letter: "Ψ", score: 10, count: 1 }
  ];

  return scrabble;
});
