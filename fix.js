const fs = require('fs');
let code = fs.readFileSync('src/components/MusicWidget.tsx', 'utf8');

const badStr = `</div>
            {/* Expanded View */}
            <div className={\`p-4 space-y-3 select-text cursor-default \${isMinimized ? 'hidden' : 'block'}\`}>`;

const parts = code.split(badStr);
console.log("Found parts:", parts.length);
