import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ServiceAuthProvider } from './context/ServiceAuthContext';

// Silencia o aviso inofensivo de reconexão de HMR/WebSocket do Vite e Firestore offline
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const reasonStr = typeof reason === 'string' ? reason : reason?.message || String(reason || '');
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('vite') ||
    reasonStr.includes('failed to connect to websocket') ||
    reasonStr.includes('Failed to get document because the client is offline') ||
    reasonStr.includes('Database (default) not found')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || String(event?.error || '');
  if (
    msg.includes('WebSocket') ||
    msg.includes('vite') ||
    msg.includes('failed to connect to websocket') ||
    msg.includes('Failed to get document because the client is offline') ||
    msg.includes('Database (default) not found')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || String(a || ''))).join(' ');
  if (
    msg.includes('[vite] failed to connect to websocket') ||
    msg.includes('WebSocket connection to') ||
    msg.includes('Failed to get document because the client is offline')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <ServiceAuthProvider>
          <App />
        </ServiceAuthProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
);

