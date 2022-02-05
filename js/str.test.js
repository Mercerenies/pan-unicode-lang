import Str from './str.js';
import { describe, it } from 'mocha';
import { expect } from 'chai';
describe('str.ts', function () {
    describe('Str.fromString', function () {
        it('should produce a valid string', function () {
            expect(Str.fromString("abc")).to.deep.equal(new Str(["a", "b", "c"]));
        });
        it('should produce a valid string given characters outside of the BMP', function () {
            expect(Str.fromString("a🔥🔥🔥a")).to.deep.equal(new Str(["a", "🔥", "🔥", "🔥", "a"]));
        });
    });
    describe('Str.toString', function () {
        it('should round-trip with Str.fromString', function () {
            expect(Str.fromString("abc").toString()).to.equal("abc");
        });
        it('should round-trip with Str.fromString given characters outside of the BMP', function () {
            expect(Str.fromString("a🔥🔥🔥a").toString()).to.equal("a🔥🔥🔥a");
        });
    });
    describe('Str.charAt', function () {
        it('should get the Unicode character at the position', function () {
            expect(Str.fromString("abc").charAt(0)).to.equal("a");
            expect(Str.fromString("abc").charAt(1)).to.equal("b");
            expect(Str.fromString("abc").charAt(2)).to.equal("c");
        });
        it('should get the Unicode character at the position, even if that character lies outside the BMP', function () {
            expect(Str.fromString("a🔥c").charAt(0)).to.equal("a");
            expect(Str.fromString("a🔥c").charAt(1)).to.equal("🔥");
            expect(Str.fromString("a🔥c").charAt(2)).to.equal("c");
        });
        it('should return undefined if the index is out of bounds', function () {
            expect(Str.fromString("a🔥").charAt(-1)).to.be.undefined;
            expect(Str.fromString("a🔥").charAt(0)).to.equal("a");
            expect(Str.fromString("a🔥").charAt(1)).to.equal("🔥");
            expect(Str.fromString("a🔥").charAt(2)).to.be.undefined;
        });
    });
    describe('Str.codePointAt', function () {
        it('should get the Unicode code point at the position', function () {
            expect(Str.fromString("abc").codePointAt(0)).to.equal(97);
            expect(Str.fromString("abc").codePointAt(1)).to.equal(98);
            expect(Str.fromString("abc").codePointAt(2)).to.equal(99);
        });
        it('should get the Unicode code point at the position, even if that character lies outside the BMP', function () {
            expect(Str.fromString("a🔥c").codePointAt(0)).to.equal(97);
            expect(Str.fromString("a🔥c").codePointAt(1)).to.equal(128293);
            expect(Str.fromString("a🔥c").codePointAt(2)).to.equal(99);
        });
        it('should return 0 if the index is out of bounds', function () {
            expect(Str.fromString("a🔥").codePointAt(-1)).to.equal(0);
            expect(Str.fromString("a🔥").codePointAt(0)).to.equal(97);
            expect(Str.fromString("a🔥").codePointAt(1)).to.equal(128293);
            expect(Str.fromString("a🔥").codePointAt(2)).to.equal(0);
        });
    });
    describe('Str.codePoints', function () {
        it('should get the code points of the string', function () {
            expect(Str.fromString("abc").codePoints()).to.deep.equal([97, 98, 99]);
            expect(Str.fromString("a🔥🔥c").codePoints()).to.deep.equal([97, 128293, 128293, 99]);
        });
        it('should be empty if given the empty string', function () {
            expect(Str.fromString("").codePoints()).to.deep.equal([]);
        });
    });
    describe('Str.concat', function () {
        it('should concatenate the two strings', function () {
            expect(Str.fromString("abc").concat(Str.fromString("def"))).to.deep.equal(Str.fromString("abcdef"));
        });
    });
    describe('Str.fromCodePoint', function () {
        it('should return the string representing that code point', function () {
            expect(Str.fromCodePoint(97)).to.deep.equal(Str.fromString("a"));
            expect(Str.fromCodePoint(128521)).to.deep.equal(Str.fromString("😉"));
        });
    });
    describe('Str.length', function () {
        it('should get the length of the string', function () {
            expect(Str.fromString("abc").length).to.equal(3);
            expect(Str.fromString("a🔥🔥c").length).to.equal(4);
        });
        it('should be 0 if given the empty string', function () {
            expect(Str.fromString("").length).to.equal(0);
        });
    });
    describe('Str.isEmpty', function () {
        it('should return false if given a non-empty string', function () {
            expect(Str.fromString("abc").isEmpty()).to.be.false;
            expect(Str.fromString("a🔥🔥c").isEmpty()).to.be.false;
            expect(Str.fromString("🔥").isEmpty()).to.be.false;
        });
        it('should be true if given the empty string', function () {
            expect(Str.fromString("").isEmpty()).to.be.true;
        });
    });
    describe('Str.reverse', function () {
        it('should reverse the string', function () {
            expect(Str.fromString("a🔥😰c").reversed().toString()).to.equal("c😰🔥a");
        });
    });
});
