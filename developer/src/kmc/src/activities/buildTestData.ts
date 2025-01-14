import * as fs from 'fs';
import * as path from 'path';
import * as kmc from '@keymanapp/kmc-keyboard';
import { CompilerCallbacks, LDMLKeyboardTestDataXMLSourceFile } from '@keymanapp/common-types';
import { NodeCompilerCallbacks } from '../util/NodeCompilerCallbacks.js';
import { BuildCommandOptions } from '../commands/build.js';

export function buildTestData(infile: string, options: BuildCommandOptions) {
  let compilerOptions: kmc.CompilerOptions = {
    debug: false,
    addCompilerVersion: false
  };

  let testData = loadTestData(infile, compilerOptions);
  if (!testData) {
    return;
  }

  const fileBaseName = options.outFile ?? infile;
  const outFileBase = path.basename(fileBaseName, path.extname(fileBaseName));
  const outFileDir = path.dirname(fileBaseName);
  const outFileJson = path.join(outFileDir, outFileBase + '.json');
  console.log(`Writing JSON test data to ${outFileJson}`);
  fs
  .writeFileSync(outFileJson, JSON.stringify(testData, null, '  '));
}
function loadTestData(inputFilename: string, options: kmc.CompilerOptions): LDMLKeyboardTestDataXMLSourceFile {
  const c: CompilerCallbacks = new NodeCompilerCallbacks();
  const k = new kmc.Compiler(c, options);
  let source = k.loadTestData(inputFilename);
  if (!source) {
    return null;
  }
  return source;
}
