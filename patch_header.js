const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace("import React from 'react';", "import React from 'react';\nimport { useAuth } from './AuthContext';\nimport { LogOut, Sun, Moon } from 'lucide-react';\nimport { useTheme } from './ThemeProvider';");

code = code.replace("export const Header: React.FC<HeaderProps> = ({", "export const Header: React.FC<HeaderProps> = ({\n");
code = code.replace("  pomodoroState,\n}) => {", "  pomodoroState,\n}) => {\n  const { logout } = useAuth();\n  const { theme, toggleTheme } = useTheme();");

let buttons = `          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center justify-center w-9 h-9 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>`;

code = code.replace("        </div>\n      </div>", buttons + "\n      </div>");

fs.writeFileSync('src/components/Header.tsx', code);
