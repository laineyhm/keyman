import chalk = require('chalk');
import express = require('express');
import { data, DebugFont, simplifyId } from "../../../data";

export default function apiKeyboardRegister (req: express.Request, res: express.Response, next: express.NextFunction) {
  const id = simplifyId(req.body['id']);
  const font: DebugFont = data.fonts[id];
  if(!font) {
    console.error(chalk.red('unexpected missing font'));
    return;
  }
  // The registered 'id' will be a font face name, but the id is simplified
  font.facename = req.body['id'];
  next();
}
