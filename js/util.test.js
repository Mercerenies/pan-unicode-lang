import * as Util from './util.js';
import { describe, it } from 'mocha';
import { expect } from 'chai';
describe('util.ts', function () {
    describe('assertNever', function () {
        it('should raise an exception when called', function () {
            // Function should not be called (as enforced by the type
            // system), so if we force a call, it should throw.
            expect(() => Util.assertNever(null)).to.throw();
        });
    });
});
