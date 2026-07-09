import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth.tsx';

// Suppress benign Firestore BloomFilterError warnings/errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const isBloomFilterError = args.some(arg => 
    typeof arg === "string" && 
    (arg.includes("BloomFilter error") || arg.includes("BloomFilterError") || arg.includes("Invalid hash count"))
  );
  if (!isBloomFilterError) {
    originalConsoleError(...args);
  }
};

console.warn = (...args: any[]) => {
  const isBloomFilterError = args.some(arg => 
    typeof arg === "string" && 
    (arg.includes("BloomFilter error") || arg.includes("BloomFilterError") || arg.includes("Invalid hash count"))
  );
  if (!isBloomFilterError) {
    originalConsoleWarn(...args);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
