var assert = require('chai').assert;

let TransformUtils = require('../../../web/lm-worker/build/intermediate.js').TransformUtils;

describe('TransformUtils', function () {
  describe('isWhitespace', function () {
    it("should not match a string containing standard alphabetic characters", function () {
      let testTransforms = [{
        insert: "a ",
        deleteLeft: 0
      }, {
        insert: " a",
        deleteLeft: 0
      }, {
        insert: "ab",
        deleteLeft: 0
      }];

      testTransforms.forEach((transform) => assert.isFalse(TransformUtils.isWhitespace(transform), `failed with: '${transform.insert}'`));
    });

    it("should match a simple ' ' transform", function() {
      transform = {
        insert: " ",
        deleteLeft: 0
      };

      assert.isTrue(TransformUtils.isWhitespace(transform));
    });

    it("should match a simple ' ' transform with delete-left", function() {
      transform = {
        insert: " ",
        deleteLeft: 1
      };

      assert.isTrue(TransformUtils.isWhitespace(transform));
    });

    it("should match a transform consisting of multiple characters of only whitespace", function() {
      transform = {
        insert: " \n\r\u00a0\t\u2000 ",
        deleteLeft: 0
      };

      assert.isTrue(TransformUtils.isWhitespace(transform));
    });

    it("stress tests", function() {
      transform = {
        insert: " \n\r\u00a0\ta\u2000 ",  // the 'a' should cause failure.
        deleteLeft: 0
      };

      assert.isFalse(TransformUtils.isWhitespace(transform));
    });
  });
});
