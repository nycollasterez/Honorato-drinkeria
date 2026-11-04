import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevenção de tela branca com tela de recuperação imediata
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Pompeia Boot Error:', event.error || event.message);
    const rootEl = document.getElementById('root');
    if (rootEl && rootEl.innerHTML.includes('CARREGANDO SISTEMA...')) {
      rootEl.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #0c1122; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 24px;">
          <div style="border: 1px solid rgba(255,90,31,0.3); padding: 32px; max-width: 440px; width: 100%; background: #13192f; border-radius: 16px;">
            <h1 style="font-size: 20px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px 0; color: #fff; font-family: 'Cinzel', serif;">POMPÉIA</h1>
            <p style="font-size: 13px; color: #bbb; margin: 0 0 16px 0;">Não foi possível carregar a aplicação.</p>
            <p style="font-size: 11px; color: #888; margin-bottom: 20px;">${event.message || 'Erro de inicialização'}</p>
            <button onclick="localStorage.clear(); window.location.href='./';" style="width: 100%; padding: 12px; background: #ff5a1f; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border: none; cursor: pointer; border-radius: 8px;">
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
