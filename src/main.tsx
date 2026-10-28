import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevenção de tela branca com tela de recuperação imediata
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Honorato Boot Error:', event.error || event.message);
    const rootEl = document.getElementById('root');
    if (rootEl && rootEl.innerHTML.includes('CARREGANDO SISTEMA...')) {
      rootEl.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 24px;">
          <div style="border: 1px solid #333; padding: 32px; max-width: 440px; width: 100%; background: #0a0a0a; border-radius: 4px;">
            <h1 style="font-size: 20px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px 0; color: #fff;">HONORATO</h1>
            <p style="font-size: 13px; color: #bbb; margin: 0 0 16px 0;">Não foi possível carregar a aplicação.</p>
            <p style="font-size: 11px; color: #888; margin-bottom: 20px;">${event.message || 'Erro de inicialização'}</p>
            <button onclick="localStorage.clear(); window.location.href='./';" style="width: 100%; padding: 12px; background: #fff; color: #000; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border: none; cursor: pointer;">
              Limpar Cache e Recarregar
            </button>
          </div>
        </div>
      `;
    }
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
