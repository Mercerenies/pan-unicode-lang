
import * as Util from './util.js';
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('util.ts', function() {

  describe('assertNever', function() {
    it('should raise an exception when called', function() {

      // Function should not be called (as enforced by the type
      // system), so if we force a call, it should throw.
      expect(() => Util.assertNever(null as unknown as never)).to.throw();

    });
  });

  describe('zip', function() {

    it('should zip the two lists together', function() {
      expect(Util.zip([1, 2, 3], [4, 5, 6])).to.deep.equal([[1, 4], [2, 5], [3, 6]]);
    });

    it('truncate the second list to the length of the first', function() {
      expect(Util.zip([1], [4, 5, 6])).to.deep.equal([[1, 4]]);
    });

    it('truncate pad the second list to the length of the first', function() {
      expect(Util.zip([1, 2, 3], [4])).to.deep.equal([[1, 4], [2, undefined], [3, undefined]]);
    });

  });

  describe('arrayEq', function() {

    it('should compare true for equal arrays', function() {
      expect(Util.arrayEq([1, 2, 3], [1, 2, 3], (a, b) => a == b)).to.be.true;
    });

    it('should compare false for unequal arrays', function() {
      expect(Util.arrayEq([1, 2, 3], [1, 2, 4], (a, b) => a == b)).to.be.false;
    });

    it('should compare false for arrays of differing lengths', function() {
      expect(Util.arrayEq([1, 2, 3], [1, 2], (_a, _b) => true)).to.be.false;
    });

    it('should respect the equality predicate', function() {
      expect(Util.arrayEq([1, 2, 3], [1, 2, 33], (a, b) => (a % 10) == (b % 10))).to.be.true;
    });

  });

  describe('spliceStr', function() {

    it('should replace the substring in the string', function() {
      expect(Util.spliceStr('abcdef', 'BCD', 1, 4)).to.equal("aBCDef");
    });

    it('should allow the replacement to increase string length', function() {
      expect(Util.spliceStr('abcdef', 'BCCCCD', 1, 4)).to.equal("aBCCCCDef");
    });

    it('should allow the replacement to decrease string length', function() {
      expect(Util.spliceStr('abccdef', 'BCD', 1, 5)).to.equal("aBCDef");
    });

    it('should allow the replacement to be empty', function() {
      expect(Util.spliceStr('abcdef', '', 1, 4)).to.equal("aef");
    });

    it('should allow the replacement to insert into a string', function() {
      expect(Util.spliceStr('abcdef', '123', 3, 3)).to.equal("abc123def");
    });

    it('should allow the replacement to replace the whole string', function() {
      expect(Util.spliceStr('', 'ABC', 0, 0)).to.equal("ABC");
    });

  });

  describe('gcd', function() {

    it('should calculate the greatest common divisor', function() {
      expect(Util.gcd(6, 4)).to.equal(2);
    });

    it('should accept zero as the first input', function() {
      expect(Util.gcd(0, 10)).to.equal(10);
    });

    it('should accept zero as the second input', function() {
      expect(Util.gcd(10, 0)).to.equal(10);
    });

    it('should accept zero as both inputs', function() {
      expect(Util.gcd(0, 0)).to.equal(0);
    });

  });

  describe('lcm', function() {

    it('should calculate the least common multiple', function() {
      expect(Util.lcm(6, 4)).to.equal(12);
    });

    it('should accept zero as the first input', function() {
      expect(Util.lcm(0, 10)).to.equal(0);
    });

    it('should accept zero as the second input', function() {
      expect(Util.lcm(10, 0)).to.equal(0);
    });

    it('should accept zero as both inputs', function() {
      expect(Util.lcm(0, 0)).to.equal(0);
    });

  });

  describe('range', function() {

    it('should produce a range of numbers', function() {
      expect(Util.range(1, 10)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should produce a singleton when given subsequent numbers', function() {
      expect(Util.range(11, 12)).to.deep.equal([11]);
    });

    it('should produce the empty list on equal inputs', function() {
      expect(Util.range(11, 11)).to.deep.equal([]);
    });

    it('should produce the empty list on reversed inputs', function() {
      expect(Util.range(10, 1)).to.deep.equal([]);
    });

  });

  describe('sortM', function() {

    it('should sort the list using string ordering', async function() {
      const list = [1, 10, 20, 2];
      await Util.sortM(list);
      expect(list).to.deep.equal([1, 10, 2, 20]);
    });

    it('should sort the list using the given ordering function', async function() {
      const list = [1, 10, 20, 2];
      await Util.sortM(list, (a, b) => Promise.resolve(a - b));
      expect(list).to.deep.equal([1, 2, 10, 20]);
    });

    it('should be a stable sort', async function() {
      const list = [10, 11, 13, 12, 14, 16, 15, 19, 18, 17, 20];
      const originalList = list.slice();
      await Util.sortM(list, (_a, _b) => Promise.resolve(0)); // Consider all values equal
      expect(list).to.deep.equal(originalList);
    });

    it('should be a stable sort on specifically duplicate values', async function() {
      const list = [21, 10, 13, 11, 17, 27, 20];
      await Util.sortM(list, async (a, b) => (a % 10) - (b % 10)); // Consider only the ones digit in comparison
      expect(list).to.deep.equal([10, 20, 21, 11, 13, 17, 27]);
    });

  });

  describe('reduceM', function() {

    it('should reduce a list using the given binary predicate', async function() {
      const list = [1, 2, 3, 4];
      expect(await Util.reduceM(list, async (a, b) => a + b, 0)).to.equal(10);
    });

    it('should allow omission of the "reduction" argument', async function() {
      const list = [1, 2, 3, 4];
      expect(await Util.reduceM(list, async (a, b) => a + b)).to.equal(10);
    });

    it('should return the reduction argument if given an empty list', async function() {
      const list: number[] = [];
      expect(await Util.reduceM(list, async (_a, _b) => { throw "This should not occur"; }, 999)).to.equal(999);
    });

    it('should raise an exception if given an empty list and no reduction argument', function() {
      const list: number[] = [];
      const promise = Util.reduceM(list, async (a, b) => a + b);
      promise.then(() => { expect.fail(); }, (e) => { expect(e).to.be.a('TypeError'); });
    });

    it('should respect the optional argument', async function() {
      const list = [2, 3, 4];
      expect(await Util.reduceM(list, async (a, b) => a + b, 1)).to.equal(10);
    });

    it('should allow the callback to take the index', async function() {
      const list = [9, 9, 9, 9];
      expect(await Util.reduceM(list, async (a, _b, idx) => a + idx, 0)).to.equal(6);
    });

    it('should allow the callback to take the array', async function() {
      const list = [10, 20, 30];
      expect(await Util.reduceM(list, async (a, _b, idx, arr) => a + arr[idx], 0)).to.equal(60);
    });

  });

});
