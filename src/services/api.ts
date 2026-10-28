/**
 * HONORATO DRINKERIA - CLIENTE DE SINCRONIZAÇÃO COM API MYSQL (HOSTGATOR)
 * 
 * Funciona de forma híbrida e transparente:
 * 1. Em produção na HostGator: envia e recebe dados em tempo real do banco MySQL via PHP.
 * 2. Em ambiente local/offline: armazena no localStorage mantendo o bar 100% operacional.
 */

import {
  Product,
  BottleItem,
  Comanda,
  Transaction,
  CashRegisterState,
  DailyClosingReport,
  PaymentMethod,
  PaymentSplit,
  ComandaStatus,
} from '../types';

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return './api';
  const path = window.location.pathname;
  const cleanPath = path.replace(/\/(cardapio|menu|comandas|caixa|estoque|gerencia|qrcode|login)\/?$/i, '');
  const normalizedPath = cleanPath.endsWith('/') || cleanPath.includes('.')
    ? cleanPath
    : cleanPath + '/';
  const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
  const base = (dir + 'api').replace(/\/\/+/g, '/');
  return base.startsWith('/') ? base : '/' + base;
}

/**
 * Helper para requisições seguras com timeout
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const url = `${getApiBaseUrl()}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.success ? (json.data as T) : null;
  } catch (e) {
    // Falha silenciosa para fallback em localStorage
    return null;
  }
}

export const hostgatorApi = {
  /**
   * Sincroniza todos os módulos com o MySQL da HostGator
   */
  async syncAll(): Promise<{
    products: Product[];
    bottles: BottleItem[];
    comandas: Comanda[];
    transactions: Transaction[];
    cashRegister: CashRegisterState;
    closingReports: DailyClosingReport[];
    staffPins?: Record<string, string>;
  } | null> {
    return apiFetch('/sync.php');
  },

  /**
   * Atualizar PIN de segurança da equipe no MySQL
   */
  async updateStaffPin(role: string, pin: string): Promise<boolean> {
    const res = await apiFetch<{ updated: boolean }>('/sync.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_pin', role, pin }),
    });
    return !!res?.updated;
  },

  /**
   * Resetar banco de dados MySQL para produção limpa na inauguração
   */
  async resetProductionData(): Promise<boolean> {
    const res = await apiFetch<{ reset: boolean }>('/sync.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset_production' }),
    });
    return !!res?.reset;
  },

  /**
   * Envia os dados iniciais caso o banco MySQL da HostGator esteja vazio
   */
  async seedInitial(products: Product[], bottles: BottleItem[]): Promise<boolean> {
    const res = await apiFetch<{ seeded: boolean }>('/sync.php', {
      method: 'POST',
      body: JSON.stringify({ products, bottles }),
    });
    return !!res?.seeded;
  },

  /**
   * Salvar ou atualizar produto/drink
   */
  async saveProduct(product: Product): Promise<boolean> {
    const res = await apiFetch('/products.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'save', product }),
    });
    return !!res;
  },

  /**
   * Excluir produto/drink
   */
  async deleteProduct(id: string): Promise<boolean> {
    const res = await apiFetch('/products.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    return !!res;
  },

  /**
   * Alternar disponibilidade no cardápio
   */
  async toggleProductAvailability(id: string): Promise<boolean> {
    const res = await apiFetch('/products.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'toggle_availability', id }),
    });
    return !!res;
  },

  /**
   * Salvar ou atualizar garrafa no estoque
   */
  async saveBottle(bottle: BottleItem): Promise<boolean> {
    const res = await apiFetch('/bottles.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'save', bottle }),
    });
    return !!res;
  },

  /**
   * Excluir garrafa
   */
  async deleteBottle(id: string): Promise<boolean> {
    const res = await apiFetch('/bottles.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    return !!res;
  },

  /**
   * Adicionar garrafas lacradas (+1, +6)
   */
  async addSealedBottles(id: string, count: number): Promise<boolean> {
    const res = await apiFetch('/bottles.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_sealed', id, count }),
    });
    return !!res;
  },

  /**
   * Abrir garrafa da reserva
   */
  async openNewSealedBottle(id: string): Promise<boolean> {
    const res = await apiFetch('/bottles.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'open_bottle', id }),
    });
    return !!res;
  },

  async openSealedBottle(id: string): Promise<boolean> {
    return this.openNewSealedBottle(id);
  },

  /**
   * Abrir nova comanda
   */
  async openComanda(comandaOrIdent: Comanda | string, customerName?: string, notes?: string): Promise<Comanda | null> {
    let payload: any;
    if (typeof comandaOrIdent === 'object' && comandaOrIdent !== null) {
      payload = {
        action: 'open',
        id: comandaOrIdent.id,
        number: comandaOrIdent.number,
        identifier: comandaOrIdent.identifier,
        customerName: comandaOrIdent.customerName || '',
        notes: comandaOrIdent.notes || '',
        openedAt: comandaOrIdent.openedAt,
        includeServiceCharge: comandaOrIdent.includeServiceCharge ? 1 : 0,
        serviceChargePercent: comandaOrIdent.serviceChargePercent || 10,
      };
    } else {
      payload = {
        action: 'open',
        identifier: comandaOrIdent,
        customerName: customerName || '',
        notes: notes || '',
      };
    }
    return apiFetch<Comanda>('/comandas.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lançar item na comanda
   */
  async addItemToComanda(comandaId: string, itemOrProductId: any, quantity?: number, notes?: string): Promise<boolean> {
    let payload: any;
    if (typeof itemOrProductId === 'object' && itemOrProductId !== null) {
      payload = {
        action: 'add_item',
        comandaId,
        itemId: itemOrProductId.id,
        productId: itemOrProductId.productId,
        quantity: itemOrProductId.quantity || 1,
        notes: itemOrProductId.notes || '',
        addedAt: itemOrProductId.addedAt,
      };
    } else {
      payload = {
        action: 'add_item',
        comandaId,
        productId: itemOrProductId,
        quantity: quantity || 1,
        notes: notes || '',
      };
    }
    const res = await apiFetch('/comandas.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return !!res;
  },

  /**
   * Remover item da comanda
   */
  async removeItemFromComanda(comandaIdOrItemId: string, maybeItemId?: string): Promise<boolean> {
    const itemId = maybeItemId || comandaIdOrItemId;
    const comandaId = maybeItemId ? comandaIdOrItemId : undefined;
    const res = await apiFetch('/comandas.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove_item', itemId, comandaId }),
    });
    return !!res;
  },

  /**
   * Atualizar status da comanda
   */
  async updateComandaStatus(comandaId: string, status: ComandaStatus): Promise<boolean> {
    const res = await apiFetch('/comandas.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_status', comandaId, status }),
    });
    return !!res;
  },

  /**
   * Alternar taxa de serviço (10%)
   */
  async toggleServiceCharge(comandaId: string): Promise<boolean> {
    const res = await apiFetch('/comandas.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'toggle_service', comandaId }),
    });
    return !!res;
  },

  /**
   * Fechar comanda e pagar no caixa
   */
  async closeComandaAndPay(
    comandaId: string,
    paymentMethod: PaymentMethod,
    splits?: PaymentSplit[],
    amountReceived?: number
  ): Promise<boolean> {
    const res = await apiFetch('/comandas.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'close_and_pay', comandaId, paymentMethod, paymentSplits: splits, amountReceived }),
    });
    return !!res;
  },

  async closeComanda(
    comandaId: string,
    paymentMethod: PaymentMethod,
    splits?: PaymentSplit[],
    amountReceived?: number
  ): Promise<boolean> {
    return this.closeComandaAndPay(comandaId, paymentMethod, splits, amountReceived);
  },

  /**
   * Registrar venda rápida de balcão
   */
  async registerDirectSale(
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    amountReceived?: number
  ): Promise<boolean> {
    const res = await apiFetch('/caixa.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'venda_balcao', items, paymentMethod, amountReceived }),
    });
    return !!res;
  },

  async directSale(
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    amountReceived?: number,
    changeGiven?: number
  ): Promise<boolean> {
    return this.registerDirectSale(items, paymentMethod, amountReceived);
  },

  /**
   * Sangria ou Suprimento de caixa
   */
  async addCashMovement(type: 'suprimento' | 'sangria', amount: number, description: string): Promise<boolean> {
    const res = await apiFetch('/caixa.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'movimentacao', type, amount, description }),
    });
    return !!res;
  },

  /**
   * Fechamento diário de caixa (gera relatório A4)
   */
  async performDailyClosing(closedBy: string, notes?: string): Promise<boolean> {
    const res = await apiFetch('/caixa.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'fechamento', closedBy, notes }),
    });
    return !!res;
  },
};
