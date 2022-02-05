import * as Error from './error.js';
import * as TypeCheck from './type_check.js';
import * as AST from './ast.js';
import { describe, it } from 'mocha';
import { expect } from 'chai';
describe('type_check.ts', function () {
    describe('isNumber', function () {
        it('should accept NumberLit values', function () {
            const value = new AST.NumberLit(10);
            expect(TypeCheck.isNumber(value)).to.equal(value);
        });
        it('should reject non-NumberLit values', function () {
            const value = new AST.StringLit("A");
            expect(() => TypeCheck.isNumber(value)).to.throw(Error.TypeError);
        });
    });
    describe('isString', function () {
        it('should accept StringLit values', function () {
            const value = new AST.StringLit("A");
            expect(TypeCheck.isString(value)).to.equal(value);
        });
        it('should reject non-StringLit values', function () {
            const value = new AST.NumberLit(9);
            expect(() => TypeCheck.isString(value)).to.throw(Error.TypeError);
        });
    });
    describe('isList', function () {
        it('should accept ArrayLit values', function () {
            const value = new AST.ArrayLit([]);
            expect(TypeCheck.isList(value)).to.equal(value);
        });
        it('should reject non-ArrayLit values', function () {
            const value = new AST.StringLit("A");
            expect(() => TypeCheck.isList(value)).to.throw(Error.TypeError);
        });
    });
    describe('isStringOrList', function () {
        it('should accept ArrayLit values', function () {
            const value = new AST.ArrayLit([]);
            expect(TypeCheck.isStringOrList(value)).to.equal(value);
        });
        it('should accept StringLit values', function () {
            const value = new AST.StringLit("");
            expect(TypeCheck.isStringOrList(value)).to.equal(value);
        });
        it('should reject values of types other than StringLit or ArrayLit', function () {
            const value = new AST.NumberLit(9374);
            expect(() => TypeCheck.isStringOrList(value)).to.throw(Error.TypeError);
        });
    });
});
