const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const file = path.resolve('app/dashboard/manutencao/page.tsx');
const source = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sf.parseDiagnostics;
for (const d of diagnostics) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${file}(${line+1},${character+1}): ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
