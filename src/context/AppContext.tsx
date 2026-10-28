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
  openComanda: (identifier: string, customerName?: string, notes?: string) => Comanda;
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
      if (saved) return JSON.parse(saved);
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
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading cash register', e);
    }
    return {
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
    };
  });

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

  // Sincronização automática com o MySQL da HostGator
  useEffect(() => {
    let isMounted = true;

    const syncWithHostgator = async () => {
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
      if (data.comandas) {
        setComandas((prevComandas) => {
          const serverIds = new Set(data.comandas.map((c) => c.id));
          // Preserva comandas abertas recentemente no dispositivo que ainda estejam em sincronização
          const pendingLocal = prevComandas.filter((lc) => {
            if (serverIds.has(lc.id)) return false;
            const ageMs = Date.now() - new Date(lc.openedAt).getTime();
            return ageMs < 300000; // 5 minutos de tolerância
          });

          // Se a comanda existir nos dois, preserva os itens mais recentes
          const mergedServer = data.comandas.map((serverCmd) => {
            const localCmd = prevComandas.find((c) => c.id === serverCmd.id);
            if (!localCmd) return serverCmd;
            if (localCmd.items.length > serverCmd.items.length) {
              return { ...serverCmd, items: localCmd.items };
            }
            return serverCmd;
          });

          return [...pendingLocal, ...mergedServer];
        });
      }
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
    };

    syncWithHostgator();

    // Sincroniza a cada 20 segundos para manter múltiplos celulares/computadores alinhados
    const interval = setInterval(syncWithHostgator, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
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

  // Comanda actions
  const openComanda = (identifier: string, customerName?: string, notes?: string): Comanda => {
    const maxNum = comandas.reduce((acc, c) => (c.number > acc ? c.number : acc), 0);
    const newComanda: Comanda = {
      id: `cmd-${Date.now()}`,
      number: maxNum + 1,
      identifier: identifier.trim() || `Comanda #${maxNum + 1}`,
      customerName: customerName?.trim() || undefined,
      status: 'aberta',
      items: [],
      openedAt: new Date().toISOString(),
      notes: notes?.trim() || undefined,
      includeServiceCharge: true,
      serviceChargePercent: 10,
    };

    setComandas((prev) => [newComanda, ...prev]);
    setSelectedComandaId(newComanda.id);

    // Sync com HostGator MySQL
    hostgatorApi.openComanda(newComanda).catch((err) => {
      console.warn('HostGator offline/fallback:', err);
    });

    return newComanda;
  };

  const addItemToComanda = (
    comandaId: string,
    productId: string,
    quantity: number,
    notes?: string
  ) => {
    if (quantity <= 0) return;
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ComandaItem = {
      id: newItemId,
      productId: targetProduct.id,
      productName: targetProduct.name,
      unitPrice: targetProduct.price,
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

    // Sync com HostGator MySQL
    hostgatorApi.addItemToComanda(comandaId, newItem).catch((err) => {
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

    // Sync com HostGator MySQL
    hostgatorApi.removeItemFromComanda(comandaId, itemId).catch((err) => {
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

    hostgatorApi.updateComandaStatus(comandaId, status).catch((err) => {
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

    hostgatorApi.toggleServiceCharge(comandaId, nextState).catch((err) => {
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
    const authCode = `HON-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      comandaId: comanda.id,
      comandaNumber: comanda.number,
      type: 'comanda_fechada',
      description: `Comanda #${comanda.number.toString().padStart(2, '0')} (${comanda.identifier})`,
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

    // Sync com HostGator MySQL
    hostgatorApi.closeComandaAndPay(comandaId, paymentMethod, paymentSplits, amountReceived).catch((err) => {
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
    const authCode = `HON-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

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
    setCashRegister({
      isOpen: true,
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
    setCashRegister((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  // Perform daily closing and save official report
  const performDailyClosing = (closedBy: string, notes?: string): DailyClosingReport => {
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
      openedAt: cashRegister.openedAt,
      closedAt: new Date().toISOString(),
      closedBy: closedBy || 'Gerência Honorato',
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
        addItemToComanda,
        removeItemFromComanda,
        updateComandaStatus,
        toggleServiceCharge,
        closeComandaAndPay,
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
