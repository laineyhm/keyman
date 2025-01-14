var assert = require('chai').assert;
let fs = require('fs');
let vm = require('vm');

let KeyboardProcessor = require('../../build/index.bundled.js');
let KMWRecorder = require('../../../recorder/build/nodeProctor');

// Required initialization setup.
global.com = KeyboardProcessor.com; // exports all keyboard-processor namespacing.
let KeyboardInterface = com.keyman.text.KeyboardInterface;
let Codes = com.keyman.text.Codes;

describe('Engine - Chirality', function() {
  let testJSONtext = fs.readFileSync('../../test/resources/json/engine_tests/chirality.json');
  // Common test suite setup.
  let testSuite = new KMWRecorder.KeyboardTest(JSON.parse(testJSONtext));

  var keyboard;
  let device = {
    formFactor: 'desktop',
    OS: 'windows',
    browser: 'native'
  }

  before(function() {
    // -- START: Standard Recorder-based unit test loading boilerplate --
    // Load the keyboard.  We'll need a KeyboardProcessor instance as an intermediary.
    let kp = new KeyboardProcessor();

    // These two lines will load a keyboard from its file; headless-mode `registerKeyboard` will
    // automatically set the keyboard as active.
    var script = new vm.Script(fs.readFileSync('../../test/' + testSuite.keyboard.filename));
    script.runInThisContext();

    keyboard = kp.activeKeyboard;
    assert.equal(keyboard.id, "Keyboard_" + testSuite.keyboard.id);
    // --  END:  Standard Recorder-based unit test loading boilerplate --

    // This part provides extra assurance that the keyboard properly loaded.
    assert.equal(keyboard.id, "Keyboard_test_chirality");
  });

  // Converts each test set into its own Mocha-level test.
  for(let set of testSuite.inputTestSets) {
    let proctor = new KMWRecorder.NodeProctor(keyboard, device, assert.equal);

    if(!proctor.compatibleWithSuite(testSuite)) {
      it.skip(set.toTestName() + " - Cannot run this test suite on Node.");
    } else if(set.constraint.target == 'hardware') {
      it(set.toTestName(), function() {
        // Refresh the proctor instance at runtime.
        let proctor = new KMWRecorder.NodeProctor(keyboard, device, assert.equal);
        set.test(proctor);
      });
    } else {
      it.skip(set.toTestName() + " - modifier state simulation for OSK not yet supported in headless KeyboardProcessor");
    }
  }

  describe("Chiral modifier mapping", function() {
    let VIRTUAL_KEY_CODE = Codes.modifierCodes["VIRTUAL_KEY"];
    let CTRL_CODE  = Codes.modifierCodes["CTRL"];
    let LCTRL_CODE = Codes.modifierCodes["LCTRL"];
    let RCTRL_CODE = Codes.modifierCodes["RCTRL"];
    let ALT_CODE   = Codes.modifierCodes["ALT"];
    let LALT_CODE  = Codes.modifierCodes["LALT"];
    let RALT_CODE  = Codes.modifierCodes["RALT"];
    let SHIFT_CODE = Codes.modifierCodes["SHIFT"];

    it("does not affect non-chiral KeyEvents - CTRL only", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | CTRL_CODE;
      let targetModifiers  = VIRTUAL_KEY_CODE | CTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | CTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | RCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);
    });

    it("does not affect non-chiral KeyEvents - ALT only", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | ALT_CODE;
      let targetModifiers  = VIRTUAL_KEY_CODE | ALT_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | ALT_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LALT_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | RALT_CODE);
      assert.equal(targetModifiers, mappedModifiers);
    });

    it("does not affect non-chiral KeyEvents - ALT + CTRL", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | ALT_CODE | CTRL_CODE;
      let targetModifiers  = VIRTUAL_KEY_CODE | ALT_CODE | CTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      let ctrlPlusAlt = ALT_CODE | CTRL_CODE;
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | ctrlPlusAlt);
      assert.equal(targetModifiers, mappedModifiers);

      let leftVariant = LALT_CODE | LCTRL_CODE;
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | leftVariant);
      assert.equal(targetModifiers, mappedModifiers);

      let rightVariant = RALT_CODE | RCTRL_CODE;
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | rightVariant);
      assert.equal(targetModifiers, mappedModifiers);

      let mixedVariant1 = LALT_CODE | CTRL_CODE;
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | mixedVariant1);
      assert.equal(targetModifiers, mappedModifiers);

      let mixedVariant2 = ALT_CODE | RCTRL_CODE;
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | mixedVariant2);
      assert.equal(targetModifiers, mappedModifiers);
    });

    it("maps chiral modifiers when the rule does not expect a matching modifier", function() {
      let ctrlTargetModifiers = VIRTUAL_KEY_CODE | CTRL_CODE;

      let initialCtrlModifiers1   = VIRTUAL_KEY_CODE | LCTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialCtrlModifiers1, VIRTUAL_KEY_CODE);
      assert.equal(ctrlTargetModifiers, mappedModifiers);

      let initialCtrlModifiers2   =  VIRTUAL_KEY_CODE | RCTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialCtrlModifiers2, VIRTUAL_KEY_CODE);
      assert.equal(ctrlTargetModifiers, mappedModifiers);

      let altTargetModifiers   = VIRTUAL_KEY_CODE | ALT_CODE;

      let initialAltModifiers1 = VIRTUAL_KEY_CODE | LALT_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialAltModifiers1, VIRTUAL_KEY_CODE);
      assert.equal(altTargetModifiers, mappedModifiers);

      let initialAltModifiers2 = VIRTUAL_KEY_CODE | RALT_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialAltModifiers2, VIRTUAL_KEY_CODE);
      assert.equal(altTargetModifiers, mappedModifiers);
    });

    it("maps chiral modifiers when the rule expects the non-chiral version", function() {
      let ctrlTargetModifiers   = VIRTUAL_KEY_CODE | CTRL_CODE;

      let initialCtrlModifiers1 = VIRTUAL_KEY_CODE | LCTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialCtrlModifiers1, VIRTUAL_KEY_CODE | CTRL_CODE);
      assert.equal(ctrlTargetModifiers, mappedModifiers);

      let initialCtrlModifiers2 = VIRTUAL_KEY_CODE | RCTRL_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialCtrlModifiers2, VIRTUAL_KEY_CODE | CTRL_CODE);
      assert.equal(ctrlTargetModifiers, mappedModifiers);

      let altTargetModifiers   = VIRTUAL_KEY_CODE | ALT_CODE;

      let initialAltModifiers1 = VIRTUAL_KEY_CODE | LALT_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialAltModifiers1, VIRTUAL_KEY_CODE | ALT_CODE);
      assert.equal(altTargetModifiers, mappedModifiers);

      let initialAltModifiers2 = VIRTUAL_KEY_CODE | RALT_CODE;

      // We should get the same results whether or not there actually is a corresponding modifier
      // expected by the rule we're examining.
      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialAltModifiers2, VIRTUAL_KEY_CODE | ALT_CODE);
      assert.equal(altTargetModifiers, mappedModifiers);
    });

    it("does not map nonchiral modifiers", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | ALT_CODE | CTRL_CODE;

      let targetModifiers  = VIRTUAL_KEY_CODE | ALT_CODE | CTRL_CODE;

      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | RALT_CODE | RCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);
    });

    it("does not map chirals when a chiral version is expected", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE;

      let targetModifiers  = VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE;

      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | RALT_CODE | RCTRL_CODE);
      assert.equal(targetModifiers, mappedModifiers);
    });

    it("handles mixed chiral/nonchiral rules - case 1", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE;

      let modifierTarget   = VIRTUAL_KEY_CODE | LALT_CODE |  CTRL_CODE;

      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LALT_CODE | CTRL_CODE);
      assert.equal(modifierTarget, mappedModifiers);
    });

    it("handles mixed chiral/nonchiral rules - case 2", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | LALT_CODE | LCTRL_CODE;

      let modifierTarget   = VIRTUAL_KEY_CODE |  ALT_CODE | LCTRL_CODE;

      let mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | ALT_CODE | RCTRL_CODE);
      assert.equal(modifierTarget, mappedModifiers);
    });

    it("handles mixed chiral/nonchiral rules - case 3", function() {
      let initialModifiers = VIRTUAL_KEY_CODE | ALT_CODE | LCTRL_CODE | SHIFT_CODE;

      let modifierTarget   = VIRTUAL_KEY_CODE | ALT_CODE | LCTRL_CODE | SHIFT_CODE;

      mappedModifiers = KeyboardInterface.matchModifiersToRuleChirality(initialModifiers, VIRTUAL_KEY_CODE | LALT_CODE | RCTRL_CODE);
      assert.equal(modifierTarget, mappedModifiers);
    });
  });
});