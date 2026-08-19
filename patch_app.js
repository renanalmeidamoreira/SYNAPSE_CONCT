const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("import { Header } from './components/Header';", "import { Header } from './components/Header';\nimport { useAuth } from './components/AuthContext';\nimport { LoginScreen } from './components/LoginScreen';\nimport { loadFromFirestore } from './utils/storage';");

code = code.replace("export default function App() {\n  const [courses, setCourses] = useState", "export default function App() {\n  const { user, loading } = useAuth();\n  const [courses, setCourses] = useState");

let effect = `  // Load from Firestore on auth change
  useEffect(() => {
    if (user) {
      loadFromFirestore(user.uid).then(() => {
        refreshCourses();
      });
    }
  }, [user, refreshCourses]);`;

code = code.replace("  // Refresh courses from storage", effect + "\n\n  // Refresh courses from storage");

code = code.replace("  return (\n    <div className=\"min-h-screen", `  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">Carregando...</div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen`);

fs.writeFileSync('src/App.tsx', code);
