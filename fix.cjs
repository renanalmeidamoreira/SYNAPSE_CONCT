const fs = require('fs');
let code = fs.readFileSync('src/components/MusicWidget.tsx', 'utf8');

const badStr = `</div>\n            {/* Expanded View */}\n            <div className={\`p-4 space-y-3 select-text cursor-default \${isMinimized ? 'hidden' : 'block'}\`}>`;

const parts = code.split(badStr);
console.log("Found parts:", parts.length);

if (parts.length > 1) {
  // We want to keep it only for the actual transition between minimized and expanded view.
  // The real one was preceded by:
  //                 </div>
  //               </div>

  let newCode = parts[0];
  for (let i = 1; i < parts.length; i++) {
    // Check if this was the correct one. 
    // The correct one should have `/* Expanded View */` right after it in the original code, but wait, I overwrote it.
    // The original code was:
    //                 </div>
    //               </div>
    //             ) : (
    //               /* Expanded View */
    //               <div className="p-4 space-y-3 select-text cursor-default">
    
    // Let's just look at the context.
    let prev = parts[i-1];
    if (prev.trim().endsWith('</div>\n              </div>')) {
       // This is the real one! We will leave badStr here.
       // Wait, my replacement already added </div>, so the original `) : (` was just replaced.
       // Let's restore EVERYTHING to `) : (` first.
    }
    newCode += `) : (` + parts[i];
  }
  fs.writeFileSync('src/components/MusicWidget.tsx', newCode);
  console.log("Reverted all replacements.");
}

