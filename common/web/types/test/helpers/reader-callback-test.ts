import 'mocha';
import {assert} from 'chai';
import {loadLdmlKeyboardSchema, loadFile, makePathToFixture, loadLdmlKeyboardTestDataSchema} from '../helpers/index.js';
import LDMLKeyboardXMLSourceFileReader from '../../src/ldml-keyboard/ldml-keyboard-xml-reader.js';
import { CompilerCallbacks, CompilerEvent } from '../../src/util/compiler-interfaces.js';
import { LDMLKeyboardXMLSourceFile } from '../../src/ldml-keyboard/ldml-keyboard-xml.js';
import { LDMLKeyboardTestDataXMLSourceFile } from '../ldml-keyboard/ldml-keyboard-testdata-xml.js';

// This is related to developer/src/kmc-keyboard/test/helpers/index.ts but has a slightly different API surface
// as this runs at a lower level than the compiler.

/**
 * A CompilerCallbacks implementation for testing
 */
class TestCompilerCallbacks implements CompilerCallbacks {
  loadKpjJsonSchema(): Buffer {
    throw new Error('loadKpjJsonSchema not implemented.'); // not needed for this test
  }
  loadLdmlKeyboardTestSchema(): Buffer {
    return loadLdmlKeyboardTestDataSchema();
  }
  loadLdmlKeyboardSchema(): Buffer {
    return loadLdmlKeyboardSchema();
  }
  loadKvksJsonSchema(): Buffer {
    throw new Error('loadKvksJsonSchema not implemented.');
  }
  clear() {
    this.messages = [];
  }
  messages: CompilerEvent[] = [];
  loadFile(baseFilename: string, filename: string | URL): Buffer {
    try {
      return loadFile(baseFilename, filename);
    } catch(e) {
      if (e.code === 'ENOENT') {
        return null;
      } else {
        throw e;
      }
    }
  }
  reportMessage(event: CompilerEvent): void {
    // console.log(event.message);
    this.messages.push(event);
  }
}

export interface CompilationCase {
  /**
   * If true, loading (validation) should fail
   */
  loadfail?: boolean;
  /**
   * path to xml, such as 'sections/layr/invalid-case.xml'
   */
  subpath: string;
  /**
   * expected error messages. If falsy, expected to succeed. All must be present to pass.
   */
  errors?: CompilerEvent[];
  /**
   * expected warning messages. All must be present to pass.
   */
  warnings?: CompilerEvent[];
  /**
   * optional callback with the section
   */
  callback?: (data: Buffer, source: LDMLKeyboardXMLSourceFile, subpath: string, callbacks: TestCompilerCallbacks ) => void;
  /**
   * if present, expect compiler to throw (use .* to match all)
   */
  throws?: RegExp;
}


export interface TestDataCase {
  /**
   * If true, loading (validation) should fail
   */
  loadfail?: boolean;
  /**
   * path to xml, such as 'sections/layr/invalid-case.xml'
   */
  subpath: string;
  /**
   * expected error messages. If falsy, expected to succeed. All must be present to pass.
   */
  errors?: CompilerEvent[];
  /**
   * expected warning messages. All must be present to pass.
   */
  warnings?: CompilerEvent[];
  /**
   * optional callback with the section
   */
  callback?: (data: Buffer, source: LDMLKeyboardTestDataXMLSourceFile, subpath: string, callbacks: TestCompilerCallbacks ) => void;
  /**
   * if present, expect compiler to throw (use .* to match all)
   */
  throws?: RegExp;
}

/**
 * Run a bunch of cases
 * @param cases cases to run
 * @param compiler argument to loadSectionFixture()
 * @param callbacks argument to loadSectionFixture()
 */
export function testReaderCases(cases : CompilationCase[]) {
  // we need our own callbacks rather than using the global so messages don't get mixed
  const callbacks = new TestCompilerCallbacks();
  const reader = new LDMLKeyboardXMLSourceFileReader(callbacks);
  for (let testcase of cases) {
    const expectFailure = testcase.throws || !!(testcase.errors); // if true, we expect this to fail
    const testHeading = expectFailure ? `should fail to load: ${testcase.subpath}`:
                                        `should load: ${testcase.subpath}`;
    it(testHeading, function () {
      callbacks.clear();

      const data = loadFile(testcase.subpath, makePathToFixture(testcase.subpath));
      assert.ok(data, `reading ${testcase.subpath}`);
      const source = reader.load(data);
      if (!testcase.loadfail) {
        assert.ok(source, `loading ${testcase.subpath}`);
      } else {
        assert.notOk(source, `loading ${testcase.subpath} (expected failure)`);
      }
      // special case for an expected exception
      if (testcase.throws) {
        assert.throws(() => reader.validate(source, loadLdmlKeyboardSchema()), testcase.throws);
      } else {
        assert.doesNotThrow(() => reader.validate(source, loadLdmlKeyboardSchema()), `validating ${testcase.subpath}`);
        // if we expected errors or warnings, show them
        if (testcase.errors) {
          assert.includeDeepMembers(callbacks.messages, testcase.errors, 'expected errors to be included');
        }
        if (testcase.warnings) {
          assert.includeDeepMembers(callbacks.messages, testcase.warnings, 'expected warnings to be included');
        } else if (!expectFailure) {
          // no warnings, so expect zero messages
          assert.strictEqual(callbacks.messages.length, 0, 'expected zero messages');
        }

        // run the user-supplied callback if any
        if (testcase.callback) {
          testcase.callback(data, source, testcase.subpath, callbacks);
        }
      }
    });
  }
}


/**
 * Run a bunch of cases
 * @param cases cases to run
 * @param compiler argument to loadSectionFixture()
 * @param callbacks argument to loadSectionFixture()
 */
export function testTestdataReaderCases(cases : TestDataCase[]) {
  // we need our own callbacks rather than using the global so messages don't get mixed
  const callbacks = new TestCompilerCallbacks();
  const reader = new LDMLKeyboardXMLSourceFileReader(callbacks);
  for (let testcase of cases) {
    const expectFailure = testcase.throws || !!(testcase.errors); // if true, we expect this to fail
    const testHeading = expectFailure ? `should fail to load: ${testcase.subpath}`:
                                        `should load: ${testcase.subpath}`;
    it(testHeading, function () {
      callbacks.clear();

      const data = loadFile(testcase.subpath, makePathToFixture(testcase.subpath));
      assert.ok(data, `reading ${testcase.subpath}`);
      const source = reader.loadTestData(data);
      if (!testcase.loadfail) {
        assert.ok(source, `loading ${testcase.subpath}`);
      } else {
        assert.notOk(source, `loading ${testcase.subpath} (expected failure)`);
      }
      // special case for an expected exception
      // TODO-LDML: no validation for now.
      // if we expected errors or warnings, show them
      if (testcase.errors) {
        assert.includeDeepMembers(callbacks.messages, testcase.errors, 'expected errors to be included');
      }
      if (testcase.warnings) {
        assert.includeDeepMembers(callbacks.messages, testcase.warnings, 'expected warnings to be included');
      } else if (!expectFailure) {
        // no warnings, so expect zero messages
        assert.strictEqual(callbacks.messages.length, 0, 'expected zero messages but got ' +callbacks.messages.map(e => e.message).join(' ') );
      }

      // run the user-supplied callback if any
      if (testcase.callback) {
        testcase.callback(data, source, testcase.subpath, callbacks);
      }
    });
  }
}
