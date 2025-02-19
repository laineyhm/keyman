//
// Version 1.0 of Keyman Developer Project .kpj file
//

import * as path from 'path';
import * as fs from 'fs';

export class KeymanDeveloperProject {
  options: KeymanDeveloperProjectOptions;
  files: KeymanDeveloperProjectFile[];
  constructor(version: KeymanDeveloperProjectVersion) {
    this.options = new KeymanDeveloperProjectOptions(version);
    this.files = [];
  }
  /**
   * Adds .kmn, .xml, .kps to project based on options.sourcePath
   * @param projectPath Full path to project.kpj (even if the file doesn't exist)
   */
  populateFiles(projectPath: string) {
    if(this.options.version != '2.0') {
      throw new Error('populateFiles can only be called on a v2.0 project');
    }

    let sourcePath = this.resolveProjectPath(projectPath, this.options.sourcePath);
    let files = fs.readdirSync(sourcePath);
    for(let filename of files) {
      let fullPath = path.join(sourcePath, filename);
      if(filename.match(/\.xml$/i)) {
        if(!fs.readFileSync(fullPath, 'utf-8').match(/ldmlKeyboard\.dtd/)) {
          // Skip this .xml because we assume it isn't really a keyboard .xml
          continue;
        }
      }
      if(filename.match(/\.(kmn|kps|xml|model\.ts)$/i)) {
        let file = new KeymanDeveloperProjectFile20(fullPath);
        this.files.push(file);
      }
    }
  }

  resolveProjectPath(projectPath: string, p: string): string {
    // Replace placeholders in the target path
    return p.replace('$PROJECTPATH', path.dirname(projectPath));
  }

  resolveInputFilePath(projectPath: string, file: KeymanDeveloperProjectFile): string {
    let p = path.dirname(projectPath);
    return path.normalize(path.resolve(p, file.filePath));
  }

  resolveOutputFilePath(projectPath: string, file: KeymanDeveloperProjectFile, sourceExt: string, targetExt: string): string {
    // Roughly corresponds to Delphi TProject.GetTargetFileName
    let p = this.options.version == '1.0' ?
      this.options.buildPath || '$SOURCEPATH' :
      this.options.buildPath;

    // Replace placeholders in the target path
    if(this.options.version == '1.0') {
      // TODO: do we need to support $VERSION?
      // $SOURCEPATH only supported in 1.0 projects
      p = p.replace('$SOURCEPATH', path.dirname(this.resolveInputFilePath(projectPath, file)));
    }

    p = this.resolveProjectPath(projectPath, p);

    let f = file.filename.replace(new RegExp(`\\${sourceExt}$`, 'i'), targetExt);
    return path.normalize(path.join(p, f));
  }

};

export enum KeymanDeveloperProjectType {
  Keyboard,
  LexicalModel
};

export type KeymanDeveloperProjectVersion =
  "1.0" |   // Keyman Developer <17.0: All files referenced in .kpj
  "2.0";    // Keyman Developer 17.0+: Files in sub-folders implicitly included

export class KeymanDeveloperProjectOptions {
  buildPath: string;
  sourcePath: string;
  compilerWarningsAsErrors: boolean = false;
  warnDeprecatedCode: boolean = true;
  checkFilenameConventions: boolean = true;
  projectType: KeymanDeveloperProjectType = KeymanDeveloperProjectType.Keyboard;
  readonly version: KeymanDeveloperProjectVersion;
  constructor(version: KeymanDeveloperProjectVersion) {
    this.version = version;
    switch(version) {
      case "1.0":
        this.buildPath = '';
        this.sourcePath = '';
        break;
      case "2.0":
        this.buildPath = '$PROJECTPATH/build';
        this.sourcePath = '$PROJECTPATH/source';
        break;
      default:
        throw new Error('Invalid version');
    }
  }
};

export type KeymanDeveloperProjectFile = KeymanDeveloperProjectFile10 | KeymanDeveloperProjectFile20;

export class KeymanDeveloperProjectFile10 {
  readonly id: string;           // 1.0 only
  readonly filename: string;
  readonly filePath: string;
  readonly fileVersion: string;  // 1.0 only
  readonly fileType: string;     // file extension of filename, but .model.ts is technically not the ext because of 2 periods
  details: KeymanDeveloperProjectFileDetail_Kmn & KeymanDeveloperProjectFileDetail_Kps; // 1.0 only
  childFiles: KeymanDeveloperProjectFile[]; // 1.0 only
  constructor(id: string, filename: string, filePath: string, fileVersion:string, fileType: string) {
    this.details = {};
    this.childFiles = [];
    this.id = id;
    this.filename = filename;
    this.filePath = filePath;
    this.fileVersion = fileVersion;
    this.fileType = fileType;
  }
};

export type KeymanDeveloperProjectFileType20 = '.model.ts' | '.kmn' | '.xml' | '.kps';

export class KeymanDeveloperProjectFile20 {
  readonly filename: string;
  readonly filePath: string;
  readonly fileType: string; // file extension of filename, but .model.ts is technically not the ext because of 2 periods
  constructor(filePath: string) {
    this.filename = path.basename(filePath);
    this.filePath = filePath;
    if(this.filename.match(/\.model\.ts$/)) {
      // .model.ts is a bit of a hassle...
      this.fileType = '.model.ts';
    } else {
      this.fileType = path.extname(this.filename);
    }
  }
};

export class KeymanDeveloperProjectFileDetail_Kps {
  name?: string;
  copyright?: string;
  version?: string;
};

export class KeymanDeveloperProjectFileDetail_Kmn {
  name?: string;
  copyright?: string;
  message?: string;
};
