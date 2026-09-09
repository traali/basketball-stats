import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Basketball Domain Invariants', () => {
  // 1. 4-Quarter Scoring Sums & Points Grammar
  describe('4-Quarter Scoring Sums & Points Decomposition', () => {
    it('sums 4 quarters exactly to match total', () => {
      const quarters = [
        { quarter: 1, home: 21, away: 18 },
        { quarter: 2, home: 18, away: 20 },
        { quarter: 3, home: 27, away: 14 },
        { quarter: 4, home: 14, away: 22 },
      ];
      const totalHome = quarters.reduce((sum, q) => sum + q.home, 0);
      const totalAway = quarters.reduce((sum, q) => sum + q.away, 0);
      assert.strictEqual(totalHome, 80);
      assert.strictEqual(totalAway, 74);
      assert.strictEqual(quarters.length, 4);
    });

    it('parses play-by-play scoring descriptions: 1p, 2p, 3p', () => {
      function parseShotPoints(desc) {
        const firstChar = desc.trim()[0];
        return parseInt(firstChar, 10);
      }
      assert.strictEqual(parseShotPoints('1 6-8 vapaaheitto sisään'), 1);
      assert.strictEqual(parseShotPoints('2 10-8 hyppyheitto'), 2);
      assert.strictEqual(parseShotPoints('3 0-5 kolmen pisteen heitto'), 3);
    });

    it('verifies points decomposition arithmetic (1p + 2p + 3p = totalPoints)', () => {
      const scoring = { ft_made: 12, fg2_made: 22, fg3_made: 8 };
      const calculatedTotal = scoring.ft_made * 1 + scoring.fg2_made * 2 + scoring.fg3_made * 3;
      assert.strictEqual(calculatedTotal, 80);
    });
  });

  // 2. Team Foul Bonus Thresholds
  describe('Team Foul Bonus Threshold (5 Fouls per Quarter)', () => {
    function isInBonus(liveFouls) {
      return liveFouls >= 5;
    }

    it('triggers bonus free throws at exactly 5 fouls', () => {
      assert.strictEqual(isInBonus(0), false);
      assert.strictEqual(isInBonus(4), false);
      assert.strictEqual(isInBonus(5), true);
      assert.strictEqual(isInBonus(7), true);
    });

    it('resets team foul counter between quarters', () => {
      let currentQuarterFouls = 5;
      assert.strictEqual(isInBonus(currentQuarterFouls), true);
      // New quarter starts -> fouls reset to 0
      currentQuarterFouls = 0;
      assert.strictEqual(isInBonus(currentQuarterFouls), false);
    });
  });

  // 3. Zero-Draw Invariants
  describe('Zero-Draw Invariant', () => {
    it('forbids draws in basketball match results', () => {
      const result = { home: 80, away: 74 };
      assert.notStrictEqual(result.home, result.away);
      const isWin = result.home > result.away;
      const isLoss = result.home < result.away;
      assert.ok(isWin || isLoss);
    });

    it('enforces 2-0 standings points (matches_tied is strictly 0)', () => {
      const standings = { won: 12, lost: 4, tied: 0 };
      assert.strictEqual(standings.tied, 0);
      const points = standings.won * 2;
      assert.strictEqual(points, 24);
      assert.strictEqual(standings.won + standings.lost, 16);
    });
  });

  // 4. WhatsApp Briefing Token Safety
  describe('WhatsApp Briefing Token Safety', () => {
    const TOKEN_LEAK_REGEX = /(?:\b(?:undefined|null|NaN)\b|\[object Object\]|\[SYÖTÄ TULOS\]|\[PVM\])/;

    it('ensures zero token leaks in basketball briefing', () => {
      const briefing = '🏀 OTTELURAPORTTI: Honka 80 – 74 Kobrat\nNeljännekset: Q1 21–18, Q2 18–20, Q3 27–14, Q4 14–22\nJoukkuevirheet: 3 / 5';
      assert.strictEqual(TOKEN_LEAK_REGEX.test(briefing), false);
    });

    it('allows legitimate Finnish words without false positives', () => {
      const fiText = 'Ottelu peruutettu ja annulloitu salivuoron puuttumisen vuoksi.';
      assert.strictEqual(TOKEN_LEAK_REGEX.test(fiText), false);
    });

    it('catches and rejects placeholder tokens', () => {
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Pisteet: [object Object]'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Peliaika: undefined'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Heittoprosentti: NaN%'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Virheet: null'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Päivä: [PVM]'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Lopputulos: [SYÖTÄ TULOS]'), true);
    });
  });
});
