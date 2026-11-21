import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 1. Desregistrar Service Workers antigos e limpar CacheStorage para forçar arquivos novos
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const r of registrations) {
        r.unregister();
      }
    }).catch(() => {});
  }

  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const k of keys) {
        caches.delete(k);
      }
    }).catch(() => {});
  }
}

// 2. Higienização profunda de comandas antigas salvas em localStorage
if (typeof window !== 'undefined') {
  try {
    const keys = ['honorato_comandas', 'honorato_comandas_prod_v1', 'honorato_comandas_cache'];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          let dirty = false;
          const cleaned = list.map((c: any) => {
            let ident = c.identifier;
            let cust = c.customerName;
            if (ident && (/^mesa(\s*\d+)?$/i.test(ident) || !ident.trim())) {
              ident = `Comanda ${c.number}`;
              dirty = true;
            }
            if (cust && /^mesa(\s*\d+)?$/i.test(cust)) {
              cust = undefined;
              dirty = true;
            }
            return { ...c, identifier: ident, customerName: cust };
          });
          if (dirty) {
            localStorage.setItem(key, JSON.stringify(cleaned));
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

// 3. Prevenção de tela branca com tela de recuperação imediata
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
