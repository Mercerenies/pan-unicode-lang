
import Str from './str.js';
import { toNumber, toSub, toSuper } from './super_sub.js';
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('super_sub.ts', function() {

  describe('toNumber', function() {

    it('should turn a superscript into a number', function() {
      expect(toNumber('¹')).to.equal(1);
      expect(toNumber('⁴')).to.equal(4);
    });

    it('should turn a subscript into a number', function() {
      expect(toNumber('₆')).to.equal(6);
      expect(toNumber('₇')).to.equal(7);
    });

    it('should turn a Str superscript into a number', function() {
      expect(toNumber(Str.fromString('¹'))).to.equal(1);
      expect(toNumber(Str.fromString('₇'))).to.equal(7);
    });

    it('should only care about the first character of the string', function() {
      expect(toNumber('¹⁴')).to.equal(1);
    });

    it('should return undefined on unknown input', function() {
      expect(toNumber('9')).to.be.undefined;
      expect(toNumber('abc')).to.be.undefined;
      expect(toNumber('a⁴')).to.be.undefined;
    });

    it('should return undefined on the empty string', function() {
      expect(toNumber('')).to.be.undefined;
      expect(toNumber(Str.fromString(''))).to.be.undefined;
    });

  });

  describe('toSub', function() {

    it('should return the subscripted string, given a number', function() {
      expect(toSub(3)).to.equal('₃');
    });

    it('should return undefined on invalid input', function() {
      expect(toSub(-1)).to.be.undefined;
      expect(toSub(99)).to.be.undefined;
      expect(toSub(1.5)).to.be.undefined;
    });

  });

  describe('toSuper', function() {

    it('should return the superscripted string, given a number', function() {
      expect(toSuper(3)).to.equal('³');
    });

    it('should return undefined on invalid input', function() {
      expect(toSuper(-1)).to.be.undefined;
      expect(toSuper(99)).to.be.undefined;
      expect(toSuper(1.5)).to.be.undefined;
    });

  });

});
