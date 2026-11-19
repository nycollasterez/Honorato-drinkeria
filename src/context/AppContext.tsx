import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  BottleItem,
  RecipeIngredient,
  Comanda,
  ComandaItem,
  Transaction,
  CashRegisterState,
  DailyClosingReport,
  AppView,
  PaymentMethod,
  PaymentSplit,
  ComandaStatus,
  UserRole,
  UserSession,
  EstablishmentReceipt,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_BOTTLES,
  INITIAL_COMANDAS,
  INITIAL_CLOSING_REPORTS,
} from '../data/initialData';
import { hostgatorApi } from '../services/api';

interface AppContextType {
  products: Product[];
  bottles: BottleItem[];
  comandas: Comanda[];
  transactions: Transaction[];
  cashRegister: CashRegisterState;
  closingReports: DailyClosingReport[];
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  currentUser: UserSession | null;
  loginAs: (role: UserRole, customName?: string) => void;
  logout: () => void;
  selectedComandaId: string | null;
  setSelectedComandaId: (id: string | null) => void;
  isClientOnlyMode: boolean;
  setIsClientOnlyMode: (val: boolean) => void;

  // Comanda actions
  openComanda: (numberOrIdentifier: number | string, identifier?: string, customerName?: string, notes?: string) => Comanda;
  cancelComanda: (comandaId: string, reason: string, cancelledBy?: string) => void;
  addItemToComanda: (comandaId: string, productId: string, quantity: number, notes?: string) => void;
  removeItemFromComanda: (comandaId: string, itemId: string) => void;
  updateComandaStatus: (comandaId: string, status: ComandaStatus) => void;
  toggleServiceCharge: (comandaId: string) => void;
  closeComandaAndPay: (
    comandaId: string,
    paymentMethod: PaymentMethod,
    paymentSplits?: PaymentSplit[],
    amountReceived?: number
  ) => void;

  // Settings & Configuration
  clearComandasOnCashClose: boolean;
  setClearComandasOnCashClose: (val: boolean) => void;
  menuCoverImage?: string;
  menuCoverFocalPoint: 'center' | 'top' | 'bottom';
  setMenuCoverImage: (url: string, focalPoint?: 'center' | 'top' | 'bottom') => void;

  // POS / Direct Sales & Cashier
  registerDirectSale: (
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    amountReceived?: number
  ) => void;
  addCashMovement: (type: 'suprimento' | 'sangria', amount: number, description: string) => void;
  openCashRegister: (initialAmount: number) => void;
  closeCashRegister: () => void;
  performDailyClosing: (closedBy: string, notes?: string) => DailyClosingReport;

  // Finished Products Inventory
  updateProductStock: (productId: string, delta: number) => void;
  setProductStock: (productId: string, newStock: number) => void;
  saveProduct: (product: Product) => void;
  toggleProductAvailability: (productId: string) => void;
  deleteProduct: (productId: string) => void;

  // Raw Bottles & Spirits Inventory
  openNewSealedBottle: (bottleId: string) => void;
  addSealedBottles: (bottleId: string, count: number) => void;
  updateOpenBottleMl: (bottleId: string, newMl: number) => void;
  saveBottle: (bottle: BottleItem) => void;
  deleteBottle: (bottleId: string) => void;

  // Security & Staff PINs
  staffPins: Record<string, string>;
  defaultPins: Record<string, string>;
  loginWithPin: (enteredPin: string) => { success: boolean; role?: UserRole; message?: string };
  updateStaffPin: (role: UserRole, newPin: string) => void;
  verifyStaffPin: (role: UserRole, enteredPin: string) => boolean;

  // Receipts (30-day archive)
  establishmentReceipts: EstablishmentReceipt[];

  // Reset
  resetToDefaults: () => void;
  resetToCleanProduction: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'honorato_products_prod_v1',
  BOTTLES: 'honorato_bottles_prod_v1',
  COMANDAS: 'honorato_comandas_prod_v1',
  TRANSACTIONS: 'honorato_transactions_prod_v1',
  CASH_REGISTER: 'honorato_cash_prod_v1',
  CLOSING_REPORTS: 'honorato_closing_reports_prod_v1',
  SESSION: 'honorato_session_prod_v1',
  STAFF_PINS: 'honorato_staff_pins_prod_v1',
  RECEIPTS: 'honorato_receipts_prod_v1',
  SETTINGS_CLEAR_COMANDAS: 'pompeia_cfg_clear_comandas_v1',
  MENU_COVER: 'pompeia_menu_cover_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if current URL is the public client cardápio (/cardapio, /menu, ?view=cardapio, ?mesa=...)
  const isUrlCardapio = typeof window !== 'undefined' && (() => {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);

    return (
      path.includes('/cardapio') ||
      path.endsWith('/cardapio') ||
      path.includes('/menu') ||
      path.endsWith('/menu') ||
      params.get('view') === 'cardapio' ||
      params.get('qr') === 'true' ||
      params.has('mesa') ||
      search.includes('cardapio') ||
      hash.includes('cardapio')
    );
  })();

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    if (isUrlCardapio) {
      return { role: 'cliente', name: 'Cliente', loginTime: new Date().toISOString() };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (saved) {
        const parsed: UserSession = JSON.parse(saved);
        if (parsed.role !== 'cliente') return parsed;
      }
    } catch (e) {
      console.error('Failed reading session from localStorage', e);
    }
    return null;
  });

  const [isClientOnlyMode, setIsClientOnlyMode] = useState<boolean>(() => {
    return isUrlCardapio;
  });

  const [activeView, setActiveView] = useState<AppView>(() => {
    if (isUrlCardapio) {
      return 'cardapio';
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (saved) {
        const parsed: UserSession = JSON.parse(saved);
        if (parsed.role === 'garcom') return 'comandas';
        if (parsed.role === 'caixa') return 'caixa';
        if (parsed.role === 'estoque') return 'estoque';
        if (parsed.role === 'admin') return 'gerencia';
      }
    } catch (e) {
      // ignore
    }
    return 'login';
  });

  // Listen to browser navigation popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const isCardapio =
        path.includes('/cardapio') ||
        path.endsWith('/cardapio') ||
        path.includes('/menu') ||
        path.endsWith('/menu') ||
        params.get('view') === 'cardapio' ||
        params.get('qr') === 'true' ||
        params.has('mesa') ||
        search.includes('cardapio') ||
        hash.includes('cardapio');

      if (isCardapio) {
        setCurrentUser({ role: 'cliente', name: 'Cliente', loginTime: new Date().toISOString() });
        setActiveView('cardapio');
        setIsClientOnlyMode(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading products', e);
    }
    return INITIAL_PRODUCTS;
  });

  // Bottles / Bar Spirits state
  const [bottles, setBottles] = useState<BottleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOTTLES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading bottles', e);
    }
    return INITIAL_BOTTLES;
  });

  // Comandas state
  const [comandas, setComandas] = useState<Comanda[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMANDAS);
      if (saved) {
        const parsed: Comanda[] = JSON.parse(saved);
        // Requirement 2: "Remova a cobrança automática de 10% das novas comandas e das comandas ainda abertas"
        return parsed.map((c) => {
          const sanitizedIdent = c.identifier && c.identifier.startsWith('Mesa ') ? `Comanda ${c.number}` : c.identifier;
          if (c.status === 'aberta' || c.status === 'fechando') {
            return {
              ...c,
              identifier: sanitizedIdent,
              includeServiceCharge: false,
              serviceChargePercent: 0,
            };
          }
          return { ...c, identifier: sanitizedIdent };
        });
      }
    } catch (e) {
      console.error('Failed reading comandas', e);
    }
    return INITIAL_COMANDAS;
  });

  // Transactions state (inicia vazio para o bar em produção)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading transactions', e);
    }
    return [];
  });

  // Cash register state (inicia fechado e zerado para abertura real do dia)
  const [cashRegister, setCashRegister] = useState<CashRegisterState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASH_REGISTER);
      if (saved) {
        const parsed: CashRegisterState = JSON.parse(saved);
        if (!parsed.sessionId) {
          parsed.sessionId = 'sess-' + (parsed.openedAt ? new Date(parsed.openedAt).getTime() : Date.now());
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed reading cash register', e);
    }
    return {
      isOpen: false,
      sessionId: 'sess-' + Date.now(),
      openedAt: '',
      initialCash: 0,
      currentCashBalance: 0,
      totalRevenue: 0,
      byPaymentMethod: {
        pix: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        dinheiro: 0,
        misto: 0,
      },
      totalServiceCharge: 0,
    };
  });

  // Setting: Limpar visualização das comandas ao fechar o caixa (Requirement 3)
  const [clearComandasOnCashClose, setClearComandasOnCashCloseState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS_CLEAR_COMANDAS);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return true; // Padrão ativado para organização profissional por turno
  });

  const setClearComandasOnCashClose = (val: boolean) => {
    setClearComandasOnCashCloseState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS_CLEAR_COMANDAS, JSON.stringify(val));
    } catch (e) {
      // ignore
    }
  };

  // Cardápio Cover Image & Focal Point (Requirement 9)
  const [menuCoverImage, setMenuCoverImageState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MENU_COVER) || '';
    } catch (e) {
      return '';
    }
  });

  const [menuCoverFocalPoint, setMenuCoverFocalPointState] = useState<'center' | 'top' | 'bottom'>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.MENU_COVER + '_focal') as any) || 'center';
    } catch (e) {
      return 'center';
    }
  });

  const setMenuCoverImage = (url: string, focalPoint: 'center' | 'top' | 'bottom' = 'center') => {
    setMenuCoverImageState(url);
    setMenuCoverFocalPointState(focalPoint);
    try {
      localStorage.setItem(STORAGE_KEYS.MENU_COVER, url);
      localStorage.setItem(STORAGE_KEYS.MENU_COVER + '_focal', focalPoint);
    } catch (e) {
      // ignore
    }
  };

  // Staff PINs state
  const DEFAULT_PINS: Record<string, string> = {
    admin: '0101',
    garcom: '1234',
    caixa: '2026',
    estoque: '5555',
  };

  const [staffPins, setStaffPins] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF_PINS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.admin || parsed.admin === '0000') {
          parsed.admin = '0101';
        }
        return { ...DEFAULT_PINS, ...parsed };
      }
    } catch (e) {
      console.error('Failed reading staff pins', e);
    }
    return DEFAULT_PINS;
  });

  // Closing reports state for monthly and daily A4 reports
  const [closingReports, setClosingReports] = useState<DailyClosingReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOSING_REPORTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading closing reports', e);
    }
    return INITIAL_CLOSING_REPORTS;
  });

  // Establishment receipts (30-day validity archive)
  const [establishmentReceipts, setEstablishmentReceipts] = useState<EstablishmentReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (saved) {
        const parsed: EstablishmentReceipt[] = JSON.parse(saved);
        const now = Date.now();
        // Purge receipts older than 30 days
        return parsed.filter((r) => new Date(r.expiresAt).getTime() > now);
      }
    } catch (e) {
      console.error('Failed reading establishment receipts', e);
    }
    return [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOTTLES, JSON.stringify(bottles));
  }, [bottles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
  }, [comandas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(establishmentReceipts));
  }, [establishmentReceipts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(cashRegister));
  }, [cashRegister]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify(closingReports));
  }, [closingReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAFF_PINS, JSON.stringify(staffPins));
  }, [staffPins]);

  // Sincronização em Tempo Real (Garçom <-> Caixa <-> Cozinha/Bar)
  useEffect(() => {
    let isMounted = true;
    let isSyncingComandas = false;
    let isFullSyncing = false;

    // Canal de sincronização instantânea entre abas no mesmo aparelho
    const realtimeChannel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel('honorato_realtime_sync')
        : null;

    // Helper de unificação e merge inteligente de comandas
    const mergeComandasData = (serverComandas: Comanda[]) => {
      setComandas((prevComandas) => {
        const serverIds = new Set(serverComandas.map((c) => c.id));
        // Preserva comandas locais recentes (criadas há menos de 5 min) que ainda estejam em trânsito
        const pendingLocal = prevComandas.filter((lc) => {
          if (serverIds.has(lc.id)) return false;
          const ageMs = Date.now() - new Date(lc.openedAt).getTime();
          return ageMs < 300000;
        });

        // Se a comanda existir no servidor e localmente, mantém os itens mais recentes
        const mergedServer = serverComandas.map((serverCmd) => {
          const localCmd = prevComandas.find((c) => c.id === serverCmd.id);
          if (!localCmd) return serverCmd;
          if (localCmd.items.length > serverCmd.items.length) {
            return { ...serverCmd, items: localCmd.items };
          }
          return serverCmd;
        });

        return [...pendingLocal, ...mergedServer];
      });
    };

    let consecutiveFastErrors = 0;
    // 1. Polling Rápido de Comandas (A cada 6s para compatibilidade perfeita com hospedagem compartilhada)
    const syncComandasFast = async () => {
      if (isSyncingComandas || !isMounted) return;
      if (consecutiveFastErrors >= 3 && Math.random() > 0.3) return; // Backoff inteligente
      isSyncingComandas = true;
      try {
        const remoteComandas = await hostgatorApi.getComandas();
        if (isMounted && remoteComandas && Array.isArray(remoteComandas)) {
          consecutiveFastErrors = 0;
          mergeComandasData(remoteComandas);
        } else {
          consecutiveFastErrors++;
        }
      } catch (e) {
        consecutiveFastErrors++;
      } finally {
        isSyncingComandas = false;
      }
    };

    // 2. Sincronização Completa (Produtos, Garrafas, Caixa e PINs)
    const syncWithHostgator = async () => {
      if (isFullSyncing || !isMounted) return;
      isFullSyncing = true;
      try {
        const data = await hostgatorApi.syncAll();
        if (!isMounted || !data) return;

        // Se o banco MySQL na HostGator estiver recém-criado, envia a semente inicial
        if (data.products.length === 0 && data.bottles.length === 0) {
          await hostgatorApi.seedInitial(products, bottles);
          return;
        }

        // Atualiza os estados locais com os dados do MySQL
        if (data.products && data.products.length > 0) setProducts(data.products);
        if (data.bottles && data.bottles.length > 0) setBottles(data.bottles);
        if (data.comandas) mergeComandasData(data.comandas);

        if (data.transactions && data.transactions.length > 0) {
          setTransactions((prevTx) => {
            const serverTxIds = new Set(data.transactions.map((t) => t.id));
            const localOnly = prevTx.filter((t) => !serverTxIds.has(t.id));
            return [...localOnly, ...data.transactions];
          });
        }
        if (data.cashRegister && (data.cashRegister.isOpen || data.cashRegister.totalRevenue > 0)) {
          setCashRegister(data.cashRegister);
        }
        if (data.closingReports && data.closingReports.length > 0) setClosingReports(data.closingReports);
        if (data.staffPins) setStaffPins((prev) => ({ ...prev, ...data.staffPins }));
      } finally {
        isFullSyncing = false;
      }
    };

    // Executa a primeira carga completa de imediato
    syncWithHostgator();
    syncComandasFast();

    // Sincroniza comandas a cada 6 segundos (leve para o servidor e sem travar a aba)
    const fastInterval = setInterval(syncComandasFast, 6000);

    // Sincronização geral de estoque e caixa a cada 25 segundos
    const fullInterval = setInterval(syncWithHostgator, 25000);

    // Quando o usuário volta à aba ou desbloqueia o celular, sincroniza imediatamente
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncComandasFast();
        syncWithHostgator();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    // Escuta notificações de outras abas no mesmo navegador
    if (realtimeChannel) {
      realtimeChannel.onmessage = () => {
        syncComandasFast();
      };
    }

    return () => {
      isMounted = false;
      clearInterval(fastInterval);
      clearInterval(fullInterval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (realtimeChannel) {
        realtimeChannel.close();
      }
    };
  }, []);

  // PROPORTIONAL BOTTLE DEDUCTION HELPER
  const deductDrinkIngredientsFromBottles = (
    recipeIngredients?: RecipeIngredient[],
    quantity: number = 1
  ) => {
    if (!recipeIngredients || recipeIngredients.length === 0 || quantity <= 0) return;

    setBottles((prevBottles) => {
      return prevBottles.map((bottle) => {
        const recipeItem = recipeIngredients.find((ing) => ing.bottleId === bottle.id);
        if (!recipeItem) return bottle;

        const neededMl = recipeItem.mlPerDrink * quantity;
        let currentMl = bottle.openBottleCurrentMl;
        let sealed = bottle.sealedBottlesCount;

        if (currentMl >= neededMl) {
          currentMl -= neededMl;
        } else {
          let deficit = neededMl - currentMl;
          currentMl = 0;

          while (deficit > 0 && sealed > 0) {
            sealed -= 1;
            if (bottle.bottleCapacityMl >= deficit) {
              currentMl = bottle.bottleCapacityMl - deficit;
              deficit = 0;
            } else {
              deficit -= bottle.bottleCapacityMl;
            }
          }
        }

        return {
          ...bottle,
          openBottleCurrentMl: Math.max(0, currentMl),
          sealedBottlesCount: sealed,
        };
      });
    });
  };

  // RESTORE PROPORTIONAL BOTTLE INGREDIENTS ON VOID
  const restoreDrinkIngredientsToBottles = (
    recipeIngredients?: RecipeIngredient[],
    quantity: number = 1
  ) => {
    if (!recipeIngredients || recipeIngredients.length === 0 || quantity <= 0) return;

    setBottles((prevBottles) => {
      return prevBottles.map((bottle) => {
        const recipeItem = recipeIngredients.find((ing) => ing.bottleId === bottle.id);
        if (!recipeItem) return bottle;

        const restoreMl = recipeItem.mlPerDrink * quantity;
        let currentMl = bottle.openBottleCurrentMl + restoreMl;
        let sealed = bottle.sealedBottlesCount;

        while (currentMl > bottle.bottleCapacityMl) {
          currentMl -= bottle.bottleCapacityMl;
          sealed += 1;
        }

        return {
          ...bottle,
          openBottleCurrentMl: currentMl,
          sealedBottlesCount: sealed,
        };
      });
    });
  };

  const notifyRealtimeChange = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('honorato_realtime_sync');
        ch.postMessage({ type: 'sync_now' });
        ch.close();
      }
    } catch (e) {
      // ignore
    }
  };

  // Comanda actions
  const openComanda = (
    numberOrIdentifier: number | string,
    maybeIdentifier?: string,
    customerName?: string,
    notes?: string
  ): Comanda => {
    let chosenNum: number;
    let chosenIdent: string;

    if (typeof numberOrIdentifier === 'number') {
      chosenNum = Math.min(100, Math.max(1, numberOrIdentifier));
      chosenIdent = maybeIdentifier?.trim() || `Comanda ${chosenNum}`;
    } else {
      const parsed = parseInt(String(numberOrIdentifier).replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        chosenNum = parsed;
      } else {
        // Encontra o menor número de 1 a 100 disponível
        const activeNums = new Set(
          comandas
            .filter((c) => c.status === 'aberta' || c.status === 'fechando')
            .map((c) => c.number)
        );
        chosenNum = 1;
        while (chosenNum <= 100 && activeNums.has(chosenNum)) {
          chosenNum++;
        }
      }
      chosenIdent = String(numberOrIdentifier).trim() || `Comanda ${chosenNum}`;
    }

    // Validação estrita: impedir duas comandas ativas com o mesmo número
    const isAlreadyActive = comandas.some(
      (c) => c.number === chosenNum && (c.status === 'aberta' || c.status === 'fechando')
    );
    if (isAlreadyActive) {
      throw new Error(`A Comanda ${chosenNum} já está aberta e ativa no momento.`);
    }

    const currentSessId = cashRegister.sessionId || `sess-${Date.now()}`;

    const newComanda: Comanda = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      number: chosenNum,
      identifier: chosenIdent,
      customerName: customerName?.trim() || undefined,
      status: 'aberta',
      cashRegisterSessionId: currentSessId,
      items: [],
      openedAt: new Date().toISOString(),
      notes: notes?.trim() || undefined,
      includeServiceCharge: false, // 10% retirado conforme requisito 2
      serviceChargePercent: 0,
    };

    setComandas((prev) => [newComanda, ...prev]);
    setSelectedComandaId(newComanda.id);
    notifyRealtimeChange();

    // Sync com HostGator MySQL
    hostgatorApi.openComanda(newComanda).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });

    return newComanda;
  };

  const cancelComanda = (comandaId: string, reason: string, cancelledBy?: string) => {
    const target = comandas.find((c) => c.id === comandaId);
    if (!target) return;
    if (target.status === 'cancelada') return;

    if (!reason || !reason.trim()) {
      throw new Error('O motivo do cancelamento é obrigatório.');
    }

    if (target.status === 'paga') {
      alert('Aviso: Esta comanda possui pagamento registrado. O cancelamento não faz estorno automático do caixa. Verifique no fluxo de caixa se é necessário registrar sangria/estorno.');
    }

    const nowIso = new Date().toISOString();
    const who = cancelledBy || currentUser?.name || 'Administrador';

    // Regra do requisito 4:
    // "A comanda deve receber o status “Cancelada”, sem ser excluída.
    // Uma comanda cancelada não pode continuar recebendo itens ou entrar no faturamento como venda concluída.
    // Respeite a movimentação de estoque existente. Não devolva automaticamente ao estoque insumos de drinks já preparados. Evite movimentações duplicadas."

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;
        return {
          ...c,
          status: 'cancelada',
          cancellationReason: reason.trim(),
          cancelledBy: who,
          cancelledAt: nowIso,
        };
      })
    );

    notifyRealtimeChange();

    hostgatorApi.cancelComanda(comandaId, reason.trim(), who).catch((err) => {
      console.warn('HostGator cancel comanda fallback:', err);
    });
  };

  const addItemToComanda = (
    comandaId: string,
    productId: string,
    quantity: number,
    notes?: string
  ) => {
    if (quantity <= 0) return;
    const targetComanda = comandas.find((c) => c.id === comandaId);
    if (!targetComanda || targetComanda.status === 'cancelada' || targetComanda.status === 'paga') {
      return;
    }

    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ComandaItem = {
      id: newItemId,
      productId: targetProduct.id,
      productName: targetProduct.name,
      unitPrice: targetProduct.price,
      costPrice: targetProduct.costPrice !== undefined ? targetProduct.costPrice : undefined,
      quantity,
      notes: notes?.trim() || undefined,
      addedAt: new Date().toISOString(),
    };

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;

        const existingIdx = c.items.findIndex(
          (i) => i.productId === productId && (i.notes || '') === (notes?.trim() || '')
        );

        let newItems: ComandaItem[];
        if (existingIdx >= 0) {
          newItems = c.items.map((item, idx) =>
            idx === existingIdx
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...c.items, newItem];
        }

        return {
          ...c,
          items: newItems,
          status: c.status === 'fechando' ? 'aberta' : c.status,
        };
      })
    );

    // Decrement finished product stock count
    updateProductStock(productId, -quantity);

    // Proportional bottle deduction
    if (targetProduct.recipeIngredients && targetProduct.recipeIngredients.length > 0) {
      deductDrinkIngredientsFromBottles(targetProduct.recipeIngredients, quantity);
    }

    notifyRealtimeChange();

    // Sync com HostGator MySQL
    hostgatorApi.addItemToComanda(comandaId, newItem).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const removeItemFromComanda = (comandaId: string, itemId: string) => {
    const targetComanda = comandas.find((c) => c.id === comandaId);
    if (!targetComanda) return;
    const targetItem = targetComanda.items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const prod = products.find((p) => p.id === targetItem.productId);

    // Restore stock
    updateProductStock(targetItem.productId, targetItem.quantity);

    // Restore bottle ingredients
    if (prod && prod.recipeIngredients && prod.recipeIngredients.length > 0) {
      restoreDrinkIngredientsToBottles(prod.recipeIngredients, targetItem.quantity);
    }

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;
        return {
          ...c,
          items: c.items.filter((i) => i.id !== itemId),
        };
      })
    );

    notifyRealtimeChange();

    // Sync com HostGator MySQL
    hostgatorApi.removeItemFromComanda(comandaId, itemId).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const updateComandaStatus = (comandaId: string, status: ComandaStatus) => {
    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;
        return { ...c, status };
      })
    );

    notifyRealtimeChange();

    hostgatorApi.updateComandaStatus(comandaId, status).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const toggleServiceCharge = (comandaId: string) => {
    let nextState = true;
    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;
        nextState = !c.includeServiceCharge;
        return { ...c, includeServiceCharge: nextState };
      })
    );

    notifyRealtimeChange();

    hostgatorApi.toggleServiceCharge(comandaId, nextState).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const closeComandaAndPay = (
    comandaId: string,
    paymentMethod: PaymentMethod,
    paymentSplits?: PaymentSplit[],
    amountReceived?: number
  ) => {
    const comanda = comandas.find((c) => c.id === comandaId);
    if (!comanda || comanda.status === 'paga') return;

    const subtotal = comanda.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const serviceCharge = comanda.includeServiceCharge
      ? (subtotal * comanda.serviceChargePercent) / 100
      : 0;
    const totalAmount = subtotal + serviceCharge;

    const changeGiven =
      paymentMethod === 'dinheiro' && amountReceived && amountReceived > totalAmount
        ? amountReceived - totalAmount
        : 0;

    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const authCode = `POM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      comandaId: comanda.id,
      comandaNumber: comanda.number,
      type: 'comanda_fechada',
      description: `Comanda ${comanda.number} (${comanda.identifier})`,
      amount: totalAmount,
      serviceChargeAmount: serviceCharge,
      paymentMethod,
      paymentSplits,
      amountReceived,
      changeGiven,
      timestamp: nowIso,
      itemsSummary: comanda.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        price: i.unitPrice,
      })),
    };

    // Gera e arquiva a Via do Estabelecimento com validade de 30 dias
    const newReceipt: EstablishmentReceipt = {
      id: `rec-${Date.now()}`,
      transactionId: newTx.id,
      comandaId: comanda.id,
      comandaNumber: comanda.number,
      identifier: comanda.identifier,
      customerName: comanda.customerName,
      createdAt: nowIso,
      expiresAt: expiresIso,
      items: comanda.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        price: i.unitPrice,
      })),
      subtotal,
      serviceCharge,
      totalAmount,
      paymentMethod,
      paymentSplits,
      amountReceived,
      changeGiven,
      authCode,
    };

    setEstablishmentReceipts((prev) => [newReceipt, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c;
        return {
          ...c,
          status: 'paga',
          closedAt: nowIso,
          paymentMethod,
          totalPaid: totalAmount,
        };
      })
    );

    setCashRegister((prev) => {
      const byPayment = { ...prev.byPaymentMethod };
      if (paymentSplits && paymentSplits.length > 0) {
        paymentSplits.forEach((sp) => {
          byPayment[sp.method] = (byPayment[sp.method] || 0) + sp.amount;
        });
      } else {
        byPayment[paymentMethod] = (byPayment[paymentMethod] || 0) + totalAmount;
      }

      const additionalCash =
        paymentMethod === 'dinheiro'
          ? totalAmount
          : paymentSplits?.find((s) => s.method === 'dinheiro')?.amount || 0;

      return {
        ...prev,
        currentCashBalance: prev.currentCashBalance + additionalCash,
        totalRevenue: prev.totalRevenue + totalAmount,
        totalServiceCharge: prev.totalServiceCharge + serviceCharge,
        byPaymentMethod: byPayment,
      };
    });

    notifyRealtimeChange();

    // Sync com HostGator MySQL
    hostgatorApi.closeComandaAndPay(comandaId, paymentMethod, paymentSplits, amountReceived).then(() => {
      notifyRealtimeChange();
    }).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const registerDirectSale = (
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    amountReceived?: number
  ) => {
    if (items.length === 0) return;

    let totalAmount = 0;
    const summary: { name: string; quantity: number; price: number }[] = [];

    items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        totalAmount += prod.price * it.quantity;
        summary.push({ name: prod.name, quantity: it.quantity, price: prod.price });
        updateProductStock(prod.id, -it.quantity);

        // Deduct bottle ingredients
        if (prod.recipeIngredients && prod.recipeIngredients.length > 0) {
          deductDrinkIngredientsFromBottles(prod.recipeIngredients, it.quantity);
        }
      }
    });

    const changeGiven =
      paymentMethod === 'dinheiro' && amountReceived && amountReceived > totalAmount
        ? amountReceived - totalAmount
        : 0;

    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const authCode = `POM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newTx: Transaction = {
      id: `tx-direct-${Date.now()}`,
      type: 'venda_balcao',
      description: 'Venda Rápida de Balcão',
      amount: totalAmount,
      serviceChargeAmount: 0,
      paymentMethod,
      amountReceived,
      changeGiven,
      timestamp: nowIso,
      itemsSummary: summary,
    };

    const newReceipt: EstablishmentReceipt = {
      id: `rec-direct-${Date.now()}`,
      transactionId: newTx.id,
      comandaNumber: 0,
      identifier: 'Venda Rápida de Balcão',
      createdAt: nowIso,
      expiresAt: expiresIso,
      items: summary,
      subtotal: totalAmount,
      serviceCharge: 0,
      totalAmount,
      paymentMethod,
      amountReceived,
      changeGiven,
      authCode,
    };

    setEstablishmentReceipts((prev) => [newReceipt, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);

    setCashRegister((prev) => ({
      ...prev,
      currentCashBalance:
        paymentMethod === 'dinheiro' ? prev.currentCashBalance + totalAmount : prev.currentCashBalance,
      totalRevenue: prev.totalRevenue + totalAmount,
      byPaymentMethod: {
        ...prev.byPaymentMethod,
        [paymentMethod]: (prev.byPaymentMethod[paymentMethod] || 0) + totalAmount,
      },
    }));

    // Sync com HostGator MySQL
    hostgatorApi.registerDirectSale(items, paymentMethod, amountReceived).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const addCashMovement = (type: 'suprimento' | 'sangria', amount: number, description: string) => {
    if (amount <= 0) return;

    const newTx: Transaction = {
      id: `tx-mov-${Date.now()}`,
      type,
      description: `${type === 'suprimento' ? 'Suprimento (Entrada de Dinheiro)' : 'Sangria (Retirada de Dinheiro)'}: ${description.trim()}`,
      amount,
      serviceChargeAmount: 0,
      paymentMethod: 'dinheiro',
      timestamp: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    setCashRegister((prev) => ({
      ...prev,
      currentCashBalance:
        type === 'suprimento'
          ? prev.currentCashBalance + amount
          : Math.max(0, prev.currentCashBalance - amount),
    }));

    // Sync com HostGator MySQL
    hostgatorApi.addCashMovement(type, amount, description).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const openCashRegister = (initialAmount: number) => {
    const newSessionId = `sess-${Date.now()}`;
    setCashRegister({
      isOpen: true,
      sessionId: newSessionId,
      openedAt: new Date().toISOString(),
      initialCash: initialAmount,
      currentCashBalance: initialAmount,
      totalRevenue: 0,
      byPaymentMethod: {
        pix: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        dinheiro: 0,
        misto: 0,
      },
      totalServiceCharge: 0,
    });
  };

  const closeCashRegister = () => {
    // Requirement 3: "Se existirem comandas abertas, apresente a pendência e exija sua resolução antes de concluir o fechamento. Não esconda comandas com saldo pendente."
    const openCmds = comandas.filter((c) => c.status === 'aberta' || c.status === 'fechando');
    if (openCmds.length > 0) {
      throw new Error(
        `Existem ${openCmds.length} comanda(s) ainda abertas ou com conta pedida! Finalize os pagamentos ou cancele as comandas antes de fechar o caixa.`
      );
    }

    setCashRegister((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  // Perform daily closing and save official report
  const performDailyClosing = (closedBy: string, notes?: string): DailyClosingReport => {
    // Requirement 3: exigir resolução antes de concluir fechamento
    const openCmds = comandas.filter((c) => c.status === 'aberta' || c.status === 'fechando');
    if (openCmds.length > 0) {
      throw new Error(
        `Existem ${openCmds.length} comanda(s) com saldo pendente. Encerre ou cancele as comandas antes de realizar o fechamento do caixa.`
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Compute top products sold today from transactions
    const productCounts: Record<string, { quantity: number; totalRevenue: number }> = {};
    transactions.forEach((tx) => {
      tx.itemsSummary?.forEach((item) => {
        if (!productCounts[item.name]) {
          productCounts[item.name] = { quantity: 0, totalRevenue: 0 };
        }
        productCounts[item.name].quantity += item.quantity;
        productCounts[item.name].totalRevenue += item.quantity * item.price;
      });
    });

    const topProductsSold = Object.entries(productCounts)
      .map(([name, data]) => ({ name, quantity: data.quantity, totalRevenue: data.totalRevenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const report: DailyClosingReport = {
      id: `rep-day-${Date.now()}`,
      date: todayStr,
      sessionId: cashRegister.sessionId,
      openedAt: cashRegister.openedAt,
      closedAt: new Date().toISOString(),
      closedBy: closedBy || 'Gerência Pompéia',
      initialCash: cashRegister.initialCash,
      finalCashBalance: cashRegister.currentCashBalance,
      totalRevenue: cashRegister.totalRevenue,
      totalServiceCharge: cashRegister.totalServiceCharge,
      comandasCount: comandas.filter((c) => c.status === 'paga').length,
      transactionsCount: transactions.length,
      byPaymentMethod: { ...cashRegister.byPaymentMethod },
      topProductsSold,
      notes: notes?.trim() || undefined,
    };

    setClosingReports((prev) => [report, ...prev]);
    closeCashRegister();

    // Sync com HostGator MySQL
    hostgatorApi.performClosing(report).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });

    return report;
  };

  // Finished products
  const updateProductStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newStock = Math.max(0, p.stock + delta);
        return {
          ...p,
          stock: newStock,
          isAvailable: newStock > 0 ? p.isAvailable : false,
        };
      })
    );
  };

  const setProductStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const s = Math.max(0, newStock);
        return {
          ...p,
          stock: s,
          isAvailable: s > 0 ? p.isAvailable : false,
        };
      })
    );
  };

  const saveProduct = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => (p.id === product.id ? product : p));
      }
      return [product, ...prev];
    });

    hostgatorApi.saveProduct(product).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const toggleProductAvailability = (productId: string) => {
    let updated: Product | undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          updated = { ...p, isAvailable: !p.isAvailable };
          return updated;
        }
        return p;
      })
    );

    if (updated) {
      hostgatorApi.saveProduct(updated).catch((err) => {
        console.warn('HostGator offline/fallback:', err);
      });
    }
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    hostgatorApi.deleteProduct(productId).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  // Bottle actions
  const openNewSealedBottle = (bottleId: string) => {
    setBottles((prev) =>
      prev.map((b) => {
        if (b.id !== bottleId) return b;
        if (b.sealedBottlesCount <= 0) return b;
        return {
          ...b,
          sealedBottlesCount: b.sealedBottlesCount - 1,
          openBottleCurrentMl: b.bottleCapacityMl,
        };
      })
    );

    hostgatorApi.openSealedBottle(bottleId).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const addSealedBottles = (bottleId: string, count: number) => {
    setBottles((prev) =>
      prev.map((b) => {
        if (b.id !== bottleId) return b;
        return {
          ...b,
          sealedBottlesCount: Math.max(0, b.sealedBottlesCount + count),
        };
      })
    );

    hostgatorApi.addSealedBottles(bottleId, count).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const updateOpenBottleMl = (bottleId: string, newMl: number) => {
    setBottles((prev) =>
      prev.map((b) => {
        if (b.id !== bottleId) return b;
        return {
          ...b,
          openBottleCurrentMl: Math.min(b.bottleCapacityMl, Math.max(0, newMl)),
        };
      })
    );
  };

  const saveBottle = (bottle: BottleItem) => {
    setBottles((prev) => {
      const exists = prev.some((b) => b.id === bottle.id);
      if (exists) {
        return prev.map((b) => (b.id === bottle.id ? bottle : b));
      }
      return [bottle, ...prev];
    });

    hostgatorApi.saveBottle(bottle).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const deleteBottle = (bottleId: string) => {
    setBottles((prev) => prev.filter((b) => b.id !== bottleId));

    hostgatorApi.deleteBottle(bottleId).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const loginAs = (role: UserRole, customName?: string) => {
    const roleNames: Record<UserRole, string> = {
      cliente: 'Cliente',
      garcom: 'Garçom / Atendimento',
      caixa: 'Operador de Caixa',
      estoque: 'Controle de Estoque',
      admin: 'Gerente / Admin',
    };
    const session: UserSession = {
      role,
      name: customName || roleNames[role],
      loginTime: new Date().toISOString(),
    };
    setCurrentUser(session);
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }

    if (role === 'cliente') {
      setActiveView('cardapio');
      setIsClientOnlyMode(true);
    } else if (role === 'garcom') {
      setActiveView('comandas');
      setIsClientOnlyMode(false);
    } else if (role === 'caixa') {
      setActiveView('caixa');
      setIsClientOnlyMode(false);
    } else if (role === 'estoque') {
      setActiveView('estoque');
      setIsClientOnlyMode(false);
    } else {
      setActiveView('gerencia');
      setIsClientOnlyMode(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      console.error(e);
    }
    setActiveView('login');
    setIsClientOnlyMode(false);
  };

  const updateStaffPin = (role: UserRole, newPin: string) => {
    const clean = newPin.trim();
    if (!clean) return;
    setStaffPins((prev) => {
      const updated = { ...prev, [role]: clean };
      return updated;
    });
    hostgatorApi.updateStaffPin(role, clean).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const verifyStaffPin = (role: UserRole, enteredPin: string): boolean => {
    const cleanEntered = enteredPin.trim();
    if (!cleanEntered) return false;
    const expected = staffPins[role] || DEFAULT_PINS[role] || (role === 'admin' ? '0101' : '0000');
    return cleanEntered === expected;
  };

  const loginWithPin = (enteredPin: string): { success: boolean; role?: UserRole; message?: string } => {
    const clean = enteredPin.trim();
    if (!clean) return { success: false, message: 'Digite o PIN de 4 dígitos.' };

    const roles: UserRole[] = ['admin', 'garcom', 'caixa', 'estoque'];
    for (const role of roles) {
      const expected = staffPins[role] || DEFAULT_PINS[role];
      if (clean === expected) {
        loginAs(role);
        return { success: true, role };
      }
    }
    return { success: false, message: 'PIN não reconhecido. Verifique com a gerência.' };
  };

  const resetToCleanProduction = () => {
    setComandas([]);
    setTransactions([]);
    setClosingReports([]);
    setCashRegister({
      isOpen: false,
      openedAt: '',
      initialCash: 0,
      currentCashBalance: 0,
      totalRevenue: 0,
      byPaymentMethod: {
        pix: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        dinheiro: 0,
        misto: 0,
      },
      totalServiceCharge: 0,
    });
    setBottles(INITIAL_BOTTLES);
    setProducts(INITIAL_PRODUCTS);

    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BOTTLES, JSON.stringify(INITIAL_BOTTLES));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));

    hostgatorApi.resetProductionData().catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });
  };

  const resetToDefaults = () => {
    resetToCleanProduction();
  };

  return (
    <AppContext.Provider
      value={{
        products,
        bottles,
        comandas,
        transactions,
        cashRegister,
        closingReports,
        activeView,
        setActiveView,
        currentUser,
        loginAs,
        logout,
        selectedComandaId,
        setSelectedComandaId,
        isClientOnlyMode,
        setIsClientOnlyMode,
        openComanda,
        cancelComanda,
        addItemToComanda,
        removeItemFromComanda,
        updateComandaStatus,
        toggleServiceCharge,
        closeComandaAndPay,
        clearComandasOnCashClose,
        setClearComandasOnCashClose,
        menuCoverImage,
        menuCoverFocalPoint,
        setMenuCoverImage,
        registerDirectSale,
        addCashMovement,
        openCashRegister,
        closeCashRegister,
        performDailyClosing,
        updateProductStock,
        setProductStock,
        saveProduct,
        toggleProductAvailability,
        deleteProduct,
        openNewSealedBottle,
        addSealedBottles,
        updateOpenBottleMl,
        saveBottle,
        deleteBottle,
        staffPins,
        defaultPins: DEFAULT_PINS,
        loginWithPin,
        updateStaffPin,
        verifyStaffPin,
        establishmentReceipts,
        resetToDefaults,
        resetToCleanProduction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
