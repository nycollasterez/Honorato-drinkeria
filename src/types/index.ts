export type ProductCategory =
  | 'autorais'
  | 'contemporaneos'
  | 'classicos'
  | 'sem_alcool'
  | 'experiencias'
  | 'doses'
  | 'cervejas'
  | 'vinhos'
  | 'petiscos'
  | string;

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
  costPrice?: number; // Preço de custo do coquetel/item em R$ (visível apenas para gestão)
  imageFocalPoint?: 'center' | 'top' | 'bottom'; // Ponto de foco/enquadramento para copos
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
  costPrice?: number; // Snapshot do preço de custo no momento do pedido
  quantity: number;
  notes?: string;
  addedAt: string;
}

export interface Comanda {
  id: string;
  number: number; // Número da comanda de 1 a 100
  identifier: string; // e.g. "Mesa 04", "Balcão", "Lucas"
  customerName?: string;
  status: ComandaStatus;
  cashRegisterSessionId?: string; // Identificador da sessão de caixa (atravessa meia-noite)
  cancellationReason?: string; // Motivo obrigatório em caso de cancelamento
  cancelledBy?: string; // Usuário responsável pelo cancelamento
  cancelledAt?: string; // Data e hora do cancelamento
  items: ComandaItem[];
  openedAt: string;
  closedAt?: string;
  notes?: string;
  includeServiceCharge: boolean; // Taxa de serviço (desativada por padrão)
  serviceChargePercent: number; // 0% padrão
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
  customerName?: string;
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
  sessionId?: string; // ID da sessão de caixa (ex: sess-17938210) para agrupar atendimentos que passam da meia-noite
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
  sessionId?: string; // Sessão do caixa encerrado
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
