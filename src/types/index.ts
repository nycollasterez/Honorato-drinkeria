export type ProductCategory =
  | 'autorais'
  | 'classicos'
  | 'doses'
  | 'cervejas'
  | 'vinhos'
  | 'sem_alcool'
  | 'petiscos';

export interface RecipeIngredient {
  bottleId: string;
  bottleName: string;
  mlPerDrink: number; // e.g. 50ml of Gin, 30ml of Campari
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  ingredients?: string[];
  recipeIngredients?: RecipeIngredient[]; // Technical recipe specifying bottle ingredients and ml
  tastingNotes?: string;
  volume?: string; // e.g. "250ml", "Dose 50ml", "Garrafa 750ml"
  alcoholContent?: string; // e.g. "18% ABV", "Sem álcool"
  price: number;
  stock: number;
  minStockAlert: number;
  unit: 'un' | 'dose' | 'garrafa' | 'porcao';
  imageUrl: string;
  isAvailable: boolean;
}

export interface BottleItem {
  id: string;
  name: string;
  category: 'destilado' | 'licor' | 'vermute' | 'bitter' | 'vinho' | 'xarope' | 'cerveja' | 'insumo';
  bottleCapacityMl: number; // e.g. 750ml, 1000ml, 900ml
  openBottleCurrentMl: number; // Current remaining ml in the open bar bottle
  sealedBottlesCount: number; // Sealed full bottles in stock
  minBottlesAlert: number; // Minimum bottles before critical alert
  costPerBottle?: number; // Custo de compra da garrafa (R$)
  unitLabel: string; // 'ml'
}

export type ComandaStatus = 'aberta' | 'fechando' | 'paga' | 'cancelada';

export interface ComandaItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  addedAt: string;
}

export interface Comanda {
  id: string;
  number: number; // e.g., Comanda 1, Comanda 2...
  identifier: string; // e.g. "Mesa 04", "Balcão", "Lucas"
  customerName?: string;
  status: ComandaStatus;
  items: ComandaItem[];
  openedAt: string;
  closedAt?: string;
  notes?: string;
  includeServiceCharge: boolean; // 10%
  serviceChargePercent: number; // 10% default
  paymentMethod?: PaymentMethod;
  totalPaid?: number;
}

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'misto';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface Transaction {
  id: string;
  comandaId?: string;
  comandaNumber?: number;
  type: 'comanda_fechada' | 'venda_balcao' | 'suprimento' | 'sangria';
  description: string;
  amount: number;
  serviceChargeAmount: number;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[];
  amountReceived?: number;
  changeGiven?: number;
  timestamp: string;
  itemsSummary?: { name: string; quantity: number; price: number }[];
}

export interface CashRegisterState {
  isOpen: boolean;
  openedAt: string;
  initialCash: number;
  currentCashBalance: number;
  totalRevenue: number;
  byPaymentMethod: {
    pix: number;
    cartao_credito: number;
    cartao_debito: number;
    dinheiro: number;
    misto: number;
  };
  totalServiceCharge: number;
}

export interface DailyClosingReport {
  id: string;
  date: string; // YYYY-MM-DD
  openedAt: string;
  closedAt: string;
  closedBy: string;
  initialCash: number;
  finalCashBalance: number;
  totalRevenue: number;
  totalServiceCharge: number;
  comandasCount: number;
  transactionsCount: number;
  byPaymentMethod: {
    pix: number;
    cartao_credito: number;
    cartao_debito: number;
    dinheiro: number;
    misto: number;
  };
  topProductsSold: { name: string; quantity: number; totalRevenue: number }[];
  notes?: string;
}

export interface EstablishmentReceipt {
  id: string; // rec-{timestamp}
  transactionId: string;
  comandaId?: string;
  comandaNumber: number;
  identifier: string;
  customerName?: string;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date (createdAt + 30 days)
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[];
  amountReceived?: number;
  changeGiven?: number;
  authCode: string;
}

export type UserRole = 'cliente' | 'garcom' | 'caixa' | 'estoque' | 'admin';

export interface UserSession {
  role: UserRole;
  name: string;
  loginTime: string;
}

export type AppView = 'login' | 'cardapio' | 'comandas' | 'caixa' | 'estoque' | 'gerencia' | 'qrcode';
