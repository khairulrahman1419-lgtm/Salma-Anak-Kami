import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registrasi Service Worker otomatis untuk fitur PWA & akses offline
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
