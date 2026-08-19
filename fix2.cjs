const fs = require('fs');
let code = fs.readFileSync('src/components/MusicWidget.tsx', 'utf8');

code = code.replace(
  '<div className={`p-3 flex items-center justify-between gap-2 bg-slate-950/40 ${isMinimized ? \'block\' : \'hidden\'}`}>\n                    <Maximize2 className="w-3.5 h-3.5" />\n                  ) : (',
  '{isMinimized ? (\n                    <Maximize2 className="w-3.5 h-3.5" />\n                  ) : ('
);

code = code.replace(
  '{/* Minimized View */}\n            <div className={`p-3 flex items-center justify-between gap-2 bg-slate-950/40 ${isMinimized ? \'block\' : \'hidden\'}`}>\n',
  '{/* Minimized View */}\n            {isMinimized ? (\n              <div className="p-3 flex items-center justify-between gap-2 bg-slate-950/40">\n'
);

fs.writeFileSync('src/components/MusicWidget.tsx', code);
console.log("Fixed");
