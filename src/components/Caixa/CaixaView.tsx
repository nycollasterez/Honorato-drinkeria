import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Comanda, PaymentMethod, PaymentSplit, EstablishmentReceipt } from '../../types';
import { CATEGORY_LABELS } from '../../data/initialData';
import { ReceiptModal } from '../Common/ReceiptModal';
import {
  CreditCard,
  QrCode,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Printer,
  FileCheck,
  CheckCircle2,
  X,
  AlertCircle,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  FileText,
  ShieldCheck,
  Search,
  Calendar,
} from 'lucide-react';

export const CaixaView: React.FC = () => {
  const {
    comandas,
    transactions,
    cashRegister,
    establishmentReceipts,
    closeComandaAndPay,
    registerDirectSale,
    addCashMovement,
    openCashRegister,
    closeCashRegister,
    products,
    setSelectedComandaId,
    setActiveView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'comandas' | 'balcao' | 'movimentacoes' | 'vias_arquivo' | 'fechamento'>('comandas');
  const [selectedComandaToPay, setSelectedComandaToPay] = useState<Comanda | null>(null);
  const [openCashAmount, setOpenCashAmount] = useState<string>('0.00');

  // Payment process state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cashAmountReceived, setCashAmountReceived] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitMethod1, setSplitMethod1] = useState<PaymentMethod>('pix');
  const [splitAmount1, setSplitAmount1] = useState<string>('');
  const [splitMethod2, setSplitMethod2] = useState<PaymentMethod>('cartao_credito');

  // Direct counter sale state
  const [directSaleCart, setDirectSaleCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<PaymentMethod>('pix');
  const [directSaleCashReceived, setDirectSaleCashReceived] = useState<string>('');
  const [directSaleSearch, setDirectSaleSearch] = useState<string>('');

  // Cash movement modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'suprimento' | 'sangria'>('sangria');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementDesc, setMovementDesc] = useState<string>('');

  // Receipt modal for paid comanda
  const [receiptComanda, setReceiptComanda] = useState<Comanda | null>(null);

  // Archive receipts state (30-day retention)
  const [receiptsSearch, setReceiptsSearch] = useState<string>('');
  const [receiptsDateFilter, setReceiptsDateFilter] = useState<string>('');
  const [archiveReceiptToView, setArchiveReceiptToView] = useState<EstablishmentReceipt | null>(null);
  const [archiveReceiptMode, setArchiveReceiptMode] = useState<'cliente' | 'estabelecimento'>('cliente');

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Open & closing comandas ready for checkout
  const pendingComandas = useMemo(() => {
    return comandas.filter((c) => c.status === 'aberta' || c.status === 'fechando');
  }, [comandas]);

  // Compute selected comanda total
  const selectedComandaTotal = useMemo(() => {
    if (!selectedComandaToPay) return 0;
    const subtotal = selectedComandaToPay.items.reduce(
      (acc, i) => acc + i.unitPrice * i.quantity,
      0
    );
    return selectedComandaToPay.includeServiceCharge
      ? subtotal + (subtotal * selectedComandaToPay.serviceChargePercent) / 100
      : subtotal;
  }, [selectedComandaToPay]);

  // Cash change calculation
  const cashChange = useMemo(() => {
    const received = parseFloat(cashAmountReceived.replace(',', '.')) || 0;
    if (received > selectedComandaTotal) {
      return received - selectedComandaTotal;
    }
    return 0;
  }, [cashAmountReceived, selectedComandaTotal]);

  // Direct sale cart total
  const directSaleTotal = useMemo(() => {
    return directSaleCart.reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return acc + (prod ? prod.price * item.quantity : 0);
    }, 0);
  }, [directSaleCart, products]);

  // Filtered establishment receipts (last 30 days) with text & day/date filter
  const filteredArchiveReceipts = useMemo(() => {
    const q = receiptsSearch.trim().toLowerCase();
    const d = receiptsDateFilter.trim();

    return establishmentReceipts.filter((r) => {
      // Date filter check
      if (d) {
        const itemDateStr = r.createdAt.split('T')[0];
        if (itemDateStr !== d) return false;
      }

      // Text search check
      if (q) {
        const matchesNum = r.comandaNumber.toString().includes(q);
        const matchesIdent = r.identifier.toLowerCase().includes(q);
        const matchesCustomer = r.customerName?.toLowerCase().includes(q) || false;
        const matchesAuth = r.authCode.toLowerCase().includes(q);
        return matchesNum || matchesIdent || matchesCustomer || matchesAuth;
      }

      return true;
    });
  }, [establishmentReceipts, receiptsSearch, receiptsDateFilter]);

  const filteredArchiveTotal = useMemo(() => {
    return filteredArchiveReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [filteredArchiveReceipts]);

  // Convert selected archive receipt to Comanda shape for printing in ReceiptModal
  const receiptFromArchive: Comanda | null = useMemo(() => {
    if (!archiveReceiptToView) return null;
    return {
      id: archiveReceiptToView.comandaId || archiveReceiptToView.transactionId,
      number: archiveReceiptToView.comandaNumber,
      identifier: archiveReceiptToView.identifier,
      customerName: archiveReceiptToView.customerName,
      status: 'paga',
      items: archiveReceiptToView.items.map((it, idx) => ({
        id: `arch-${idx}`,
        productId: '',
        productName: it.name,
        unitPrice: it.price,
        quantity: it.quantity,
        addedAt: archiveReceiptToView.createdAt,
      })),
      openedAt: archiveReceiptToView.createdAt,
      closedAt: archiveReceiptToView.createdAt,
      includeServiceCharge: archiveReceiptToView.serviceCharge > 0,
      serviceChargePercent: 10,
      paymentMethod: archiveReceiptToView.paymentMethod,
      totalPaid: archiveReceiptToView.totalAmount,
    };
  }, [archiveReceiptToView]);

  // Handle Checkout of Comanda
  const handleConfirmComandaPayment = () => {
    if (!selectedComandaToPay) return;

    const paymentChosen: PaymentMethod = isSplitPayment ? 'misto' : paymentMethod;

    if (isSplitPayment) {
      const amt1 = parseFloat(splitAmount1.replace(',', '.')) || 0;
      const amt2 = selectedComandaTotal - amt1;
      const splits: PaymentSplit[] = [
        { method: splitMethod1, amount: amt1 },
        { method: splitMethod2, amount: Math.max(0, amt2) },
      ];
      closeComandaAndPay(selectedComandaToPay.id, 'misto', splits);
    } else {
      const received = parseFloat(cashAmountReceived.replace(',', '.')) || undefined;
      closeComandaAndPay(selectedComandaToPay.id, paymentMethod, undefined, received);
    }

    const paidComandaToReceipt: Comanda = {
      ...selectedComandaToPay,
      status: 'paga',
      closedAt: new Date().toISOString(),
      paymentMethod: paymentChosen,
      totalPaid: selectedComandaTotal,
    };

    setReceiptComanda(paidComandaToReceipt);
    setSelectedComandaToPay(null);
    setCashAmountReceived('');
    setIsSplitPayment(false);
  };

  // Direct sale helper functions
  const handleAddToCart = (productId: string) => {
    setDirectSaleCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setDirectSaleCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as { productId: string; quantity: number }[]
    );
  };

  const handleFinishDirectSale = () => {
    if (directSaleCart.length === 0) return;
    const received = parseFloat(directSaleCashReceived.replace(',', '.')) || undefined;
    registerDirectSale(directSaleCart, directSalePaymentMethod, received);
    setDirectSaleCart([]);
    setDirectSaleCashReceived('');
    alert('Venda de balcão concluída com sucesso!');
  };

  const handleCreateCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movementAmount.replace(',', '.')) || 0;
    if (val <= 0 || !movementDesc.trim()) return;

    addCashMovement(movementType, val, movementDesc);
    setMovementAmount('');
    setMovementDesc('');
    setIsMovementModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <h1 className="font-editorial text-2xl font-bold text-white">
            Caixa & PDV
          </h1>

          <button
            onClick={() => setIsMovementModalOpen(true)}
            className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Sangria / Suprimento</span>
          </button>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Faturado Hoje
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatPrice(cashRegister.totalRevenue)}
            </span>
            <p className="text-[10px] text-neutral-500">
              Serviço: {formatPrice(cashRegister.totalServiceCharge)}
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Gaveta (Espécie)
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatPrice(cashRegister.currentCashBalance)}
            </span>
            <p className="text-[10px] text-neutral-500">Fundo + Entradas</p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              PIX
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatPrice(cashRegister.byPaymentMethod.pix)}
            </span>
            <p className="text-[10px] text-neutral-500">Instantâneo</p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Cartões
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatPrice(
                cashRegister.byPaymentMethod.cartao_credito +
                  cashRegister.byPaymentMethod.cartao_debito
              )}
            </span>
            <p className="text-[10px] text-neutral-500">Débito + Crédito</p>
          </div>
        </div>

        {/* Cash Register Open/Closed Status Bar */}
        {!cashRegister.isOpen ? (
          <div className="bg-neutral-950 border border-neutral-700 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-neutral-600 bg-neutral-900 flex items-center justify-center text-white shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Caixa Fechado</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="number"
                step="0.01"
                placeholder="Fundo R$"
                value={openCashAmount}
                onChange={(e) => setOpenCashAmount(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white font-mono w-32 focus:outline-none focus:border-white text-center"
              />
              <button
                type="button"
                onClick={() => {
                  const amt = parseFloat(openCashAmount.replace(',', '.')) || 0;
                  openCashRegister(amt);
                }}
                className="px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                Abrir Caixa
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-semibold text-white">Turno de Caixa Aberto</span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400">Fundo: {formatPrice(cashRegister.initialCash)}</span>
            </div>
            <button
              onClick={() => setActiveTab('fechamento')}
              className="text-neutral-400 hover:text-white underline cursor-pointer text-[11px]"
            >
              Ir para Fechamento de Turno
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex flex-wrap border-b border-neutral-800 space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('comandas')}
            className={`py-2.5 px-3 sm:px-4 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'comandas'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Fechar Comanda ({pendingComandas.length})
          </button>
          <button
            onClick={() => setActiveTab('balcao')}
            className={`py-2.5 px-3 sm:px-4 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'balcao'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Venda Rápida de Balcão
          </button>
          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`py-2.5 px-3 sm:px-4 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'movimentacoes'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Histórico & Movimentações
          </button>
          <button
            onClick={() => setActiveTab('vias_arquivo')}
            className={`py-2.5 px-3 sm:px-4 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vias_arquivo'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Arquivo de Vias (30 Dias)</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-neutral-900 border border-neutral-700 text-white font-mono">
              {establishmentReceipts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fechamento')}
            className={`py-2.5 px-3 sm:px-4 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fechamento'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Relatório de Fechamento
          </button>
        </div>

        {/* TAB 1: FECHAR COMANDAS */}
        {activeTab === 'comandas' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* List of open/fechando comandas */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-bold text-neutral-400">
                Comandas Pendentes
              </h3>

              {pendingComandas.length === 0 ? (
                <div className="p-8 text-center border border-neutral-800 bg-neutral-950 text-neutral-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-white" />
                  <p className="text-xs text-white font-medium">Todas as contas estão pagas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingComandas.map((cmd) => {
                    const isSelected = selectedComandaToPay?.id === cmd.id;
                    const sub = cmd.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                    const tot = cmd.includeServiceCharge ? sub * 1.1 : sub;

                    return (
                      <div
                        key={cmd.id}
                        onClick={() => {
                          setSelectedComandaToPay(cmd);
                          setCashAmountReceived('');
                          setIsSplitPayment(false);
                        }}
                        className={`p-4 border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-neutral-900 border-white ring-1 ring-white/40'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-black border border-neutral-700 text-white">
                              #{cmd.number.toString().padStart(2, '0')}
                            </span>
                            <span className="font-semibold text-sm text-white">{cmd.identifier}</span>
                          </div>
                          {cmd.customerName && (
                            <p className="text-xs text-neutral-400">{cmd.customerName}</p>
                          )}
                          <p className="text-[10px] text-neutral-400">
                            {cmd.items.length} itens consumidos
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-bold text-white block">
                            {formatPrice(tot)}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 border ${
                              cmd.status === 'fechando'
                                ? 'bg-white text-black border-white'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            }`}
                          >
                            {cmd.status === 'fechando' ? 'Pediu a Conta' : 'Aberta'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Settlement Pane */}
            <div className="lg:col-span-7">
              {selectedComandaToPay ? (
                <div className="bg-neutral-950 border border-neutral-800 p-6 space-y-6">
                  {/* Header of selected */}
                  <div className="pb-4 border-b border-neutral-800 flex justify-between items-start">
                    <div>
                      <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                        Recebimento de Comanda
                      </span>
                      <h2 className="font-editorial text-2xl font-bold text-white">
                        Comanda #{selectedComandaToPay.number.toString().padStart(2, '0')} · {selectedComandaToPay.identifier}
                      </h2>
                      {selectedComandaToPay.customerName && (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Cliente: {selectedComandaToPay.customerName}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-400 block">Total a Pagar</span>
                      <span className="text-2xl font-bold text-white font-mono">
                        {formatPrice(selectedComandaTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Items breakdown mini */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 max-h-36 overflow-y-auto text-xs space-y-1">
                    {selectedComandaToPay.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-neutral-300">
                        <span>{i.quantity}x {i.productName}</span>
                        <span className="font-mono">{formatPrice(i.unitPrice * i.quantity)}</span>
                      </div>
                    ))}
                    {selectedComandaToPay.includeServiceCharge && (
                      <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-800 text-[11px]">
                        <span>Serviço (10%):</span>
                        <span className="font-mono">
                          {formatPrice((selectedComandaTotal / 1.1) * 0.1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Split toggle */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                      <input
                        type="checkbox"
                        checked={isSplitPayment}
                        onChange={(e) => setIsSplitPayment(e.target.checked)}
                        className="rounded-none border-neutral-700 bg-neutral-900 text-white"
                      />
                      <span>Dividir pagamento em duas formas (ex: PIX + Cartão)</span>
                    </label>
                  </div>

                  {/* Payment Methods */}
                  {!isSplitPayment ? (
                    <div className="space-y-4">
                      <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block">
                        Escolha a Forma de Pagamento:
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {[
                          { key: 'pix', label: 'PIX Instantâneo' },
                          { key: 'cartao_credito', label: 'Cartão Crédito' },
                          { key: 'cartao_debito', label: 'Cartão Débito' },
                          { key: 'dinheiro', label: 'Dinheiro Espécie' },
                        ].map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setPaymentMethod(m.key as PaymentMethod)}
                            className={`p-3 border text-center transition-colors cursor-pointer ${
                              paymentMethod === m.key
                                ? 'bg-white text-black border-white font-bold'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* If PIX is selected */}
                      {paymentMethod === 'pix' && (
                        <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-2 text-center">
                          <p className="text-xs text-neutral-300 font-semibold">
                            Chave PIX Honorato Drinkeria:
                          </p>
                          <p className="font-mono text-xs bg-black p-2 border border-neutral-700 text-white select-all">
                            pix@honoratodrinkeria.com.br
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Valor exato a transferir: <strong className="text-white">{formatPrice(selectedComandaTotal)}</strong>
                          </p>
                        </div>
                      )}

                      {/* If Cash is selected - Change Calculator */}
                      {paymentMethod === 'dinheiro' && (
                        <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
                          <div>
                            <label className="block text-neutral-300 font-medium mb-1">
                              Valor Entregue pelo Cliente em Dinheiro:
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`Ex: ${(Math.ceil(selectedComandaTotal / 10) * 10).toFixed(2)}`}
                              value={cashAmountReceived}
                              onChange={(e) => setCashAmountReceived(e.target.value)}
                              className="w-full bg-black border border-neutral-700 p-2.5 text-white font-mono text-base focus:outline-none focus:border-white"
                            />
                          </div>

                          {cashChange > 0 && (
                            <div className="p-3 bg-black border border-neutral-700 flex justify-between items-center text-sm font-bold">
                              <span className="text-neutral-300">TROCO A DEVOLVER:</span>
                              <span className="font-mono text-xl text-white">
                                {formatPrice(cashChange)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Split Payment Config */
                    <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-4 text-xs">
                      <span className="font-bold text-white block">Divisão de Pagamento:</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-neutral-400 mb-1">Forma 1:</label>
                          <select
                            value={splitMethod1}
                            onChange={(e) => setSplitMethod1(e.target.value as PaymentMethod)}
                            className="w-full bg-black border border-neutral-700 p-2 text-white"
                          >
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_debito">Cartão Débito</option>
                            <option value="cartao_credito">Cartão Crédito</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-neutral-400 mb-1">Valor da Forma 1 (R$):</label>
                          <input
                            type="number"
                            step="0.01"
                            value={splitAmount1}
                            onChange={(e) => setSplitAmount1(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                        <div>
                          <label className="block text-neutral-400 mb-1">Forma 2 (Restante):</label>
                          <select
                            value={splitMethod2}
                            onChange={(e) => setSplitMethod2(e.target.value as PaymentMethod)}
                            className="w-full bg-black border border-neutral-700 p-2 text-white"
                          >
                            <option value="cartao_credito">Cartão Crédito</option>
                            <option value="cartao_debito">Cartão Débito</option>
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-neutral-400 mb-1">Valor Restante Calculado:</label>
                          <div className="p-2 bg-black border border-neutral-700 text-white font-mono font-bold">
                            {formatPrice(
                              Math.max(
                                0,
                                selectedComandaTotal -
                                  (parseFloat(splitAmount1.replace(',', '.')) || 0)
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Finish Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleConfirmComandaPayment}
                      className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Receber {formatPrice(selectedComandaTotal)}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-950 border border-neutral-800 p-12 text-center text-neutral-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                  <p className="text-xs font-semibold text-white">Selecione uma comanda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VENDA RÁPIDA DE BALCÃO */}
        {activeTab === 'balcao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Products picker (7 cols) */}
            <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-editorial text-lg font-bold text-white">
                  Venda de Balcão
                </h3>
              </div>

              <input
                type="text"
                placeholder="Buscar produto..."
                value={directSaleSearch}
                onChange={(e) => setDirectSaleSearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-xs text-white focus:outline-none focus:border-white"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {products
                  .filter((p) =>
                    directSaleSearch.trim() === ''
                      ? true
                      : p.name.toLowerCase().includes(directSaleSearch.toLowerCase())
                  )
                  .map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => handleAddToCart(prod.id)}
                      className="p-3 border border-neutral-800 bg-neutral-900 hover:border-neutral-500 cursor-pointer flex justify-between items-center transition-colors text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white block">{prod.name}</span>
                        <span className="text-[10px] text-neutral-400">
                          {CATEGORY_LABELS[prod.category]} · Estoque: {prod.stock}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white block">{formatPrice(prod.price)}</span>
                        <span className="text-[10px] text-neutral-300 underline">+ Adicionar</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Direct Sale Cart & Checkout (5 cols) */}
            <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 p-5 space-y-5">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-editorial text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span>Carrinho de Balcão</span>
                </h3>
                {directSaleCart.length > 0 && (
                  <button
                    onClick={() => setDirectSaleCart([])}
                    className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Esvaziar
                  </button>
                )}
              </div>

              {directSaleCart.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs border border-dashed border-neutral-800">
                  Carrinho de balcão vazio. Selecione os produtos ao lado.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="divide-y divide-neutral-800 border border-neutral-800 max-h-48 overflow-y-auto">
                    {directSaleCart.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      if (!prod) return null;
                      return (
                        <div
                          key={item.productId}
                          className="p-2.5 flex items-center justify-between text-xs bg-neutral-900/40"
                        >
                          <div>
                            <span className="font-medium text-white block">{prod.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {item.quantity}x {formatPrice(prod.price)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateCartQty(item.productId, -1)}
                              className="w-6 h-6 border border-neutral-700 bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateCartQty(item.productId, 1)}
                              className="w-6 h-6 border border-neutral-700 bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 flex justify-between items-center text-sm font-bold">
                    <span>Total Balcão:</span>
                    <span className="font-mono text-lg">{formatPrice(directSaleTotal)}</span>
                  </div>

                  {/* Payment selector */}
                  <div className="space-y-2 text-xs">
                    <label className="block text-neutral-400 font-medium">Forma de Pagamento:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'pix', label: 'PIX' },
                        { key: 'dinheiro', label: 'Dinheiro' },
                        { key: 'cartao_debito', label: 'Débito' },
                        { key: 'cartao_credito', label: 'Crédito' },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setDirectSalePaymentMethod(m.key as PaymentMethod)}
                          className={`py-2 px-2 border text-center cursor-pointer transition-colors ${
                            directSalePaymentMethod === m.key
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Change */}
                  {directSalePaymentMethod === 'dinheiro' && (
                    <div className="space-y-2 text-xs">
                      <label className="block text-neutral-400">Valor Recebido (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.00"
                        value={directSaleCashReceived}
                        onChange={(e) => setDirectSaleCashReceived(e.target.value)}
                        className="w-full bg-black border border-neutral-700 p-2 text-white font-mono"
                      />
                      {parseFloat(directSaleCashReceived.replace(',', '.')) > directSaleTotal && (
                        <div className="p-2 bg-black border border-neutral-700 flex justify-between font-bold">
                          <span>Troco:</span>
                          <span className="font-mono">
                            {formatPrice(
                              parseFloat(directSaleCashReceived.replace(',', '.')) -
                                directSaleTotal
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleFinishDirectSale}
                    className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Concluir Venda Balcão ({formatPrice(directSaleTotal)})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MOVIMENTAÇÕES & HISTÓRICO */}
        {activeTab === 'movimentacoes' && (
          <div className="bg-neutral-950 border border-neutral-800 p-6 space-y-4">
            <h3 className="font-editorial text-xl font-bold text-white">
              Histórico de Entradas e Saídas do Caixa
            </h3>

            <div className="divide-y divide-neutral-800 border border-neutral-800 max-h-[500px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Nenhuma transação registrada até o momento.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-neutral-900/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === 'sangria'
                              ? 'bg-neutral-400'
                              : 'bg-white'
                          }`}
                        />
                        <span className="font-semibold text-white">{tx.description}</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono px-1.5 py-0.2 border border-neutral-800 bg-neutral-900">
                          {tx.paymentMethod}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400">
                        {new Date(tx.timestamp).toLocaleString('pt-BR')}
                      </p>

                      {tx.itemsSummary && (
                        <p className="text-[10px] text-neutral-400">
                          Itens: {tx.itemsSummary.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-bold font-mono ${
                          tx.type === 'sangria' ? 'text-neutral-400' : 'text-white'
                        }`}
                      >
                        {tx.type === 'sangria' ? '-' : '+'} {formatPrice(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARQUIVO DE VIAS DO ESTABELECIMENTO (VALIDADE 30 DIAS) */}
        {activeTab === 'vias_arquivo' && (
          <div className="bg-neutral-950 border border-neutral-800 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>Arquivo de Vias do Estabelecimento (30 Dias)</span>
                </h3>
              </div>

              {/* Day / Date Selector & Search Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Quick Presets */}
                <div className="flex border border-neutral-800 bg-neutral-900 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setReceiptsDateFilter('')}
                    className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      !receiptsDateFilter
                        ? 'bg-white text-black font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptsDateFilter(new Date().toISOString().split('T')[0])}
                    className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      receiptsDateFilter === new Date().toISOString().split('T')[0]
                        ? 'bg-white text-black font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setReceiptsDateFilter(y.toISOString().split('T')[0]);
                    }}
                    className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      receiptsDateFilter ===
                      (() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        return y.toISOString().split('T')[0];
                      })()
                        ? 'bg-white text-black font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Ontem
                  </button>
                </div>

                {/* Specific Calendar Date Picker */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 px-2.5 py-1.5 text-xs text-white">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="date"
                    value={receiptsDateFilter}
                    onChange={(e) => setReceiptsDateFilter(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                    title="Filtrar por dia específico"
                  />
                  {receiptsDateFilter && (
                    <button
                      type="button"
                      onClick={() => setReceiptsDateFilter('')}
                      className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                      title="Limpar filtro de data"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Text Search Box */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar comanda, mesa, cliente..."
                    value={receiptsSearch}
                    onChange={(e) => setReceiptsSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Filter Summary Banner */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-900/40 p-2.5 border border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span>
                  {receiptsDateFilter ? (
                    <>
                      Exibindo vias do dia <strong className="text-white">{new Date(receiptsDateFilter + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                    </>
                  ) : (
                    'Exibindo todas as vias dos últimos 30 dias'
                  )}
                  {receiptsSearch && <> correspondentes a &quot;<strong className="text-white">{receiptsSearch}</strong>&quot;</>}
                </span>
              </span>

              <span className="font-mono text-white font-semibold">
                {filteredArchiveReceipts.length} {filteredArchiveReceipts.length === 1 ? 'via' : 'vias'} · Total: {formatPrice(filteredArchiveTotal)}
              </span>
            </div>

            {filteredArchiveReceipts.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 border border-neutral-800 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                <p className="text-xs text-white font-medium">Nenhuma via arquivada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArchiveReceipts.map((rec) => {
                  const daysRemaining = Math.max(
                    0,
                    Math.ceil((new Date(rec.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <div
                      key={rec.id}
                      className="p-4 bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {rec.comandaNumber > 0 ? (
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-black border border-neutral-700 text-white">
                                #{rec.comandaNumber.toString().padStart(2, '0')}
                              </span>
                            ) : null}
                            <span className="font-bold text-sm text-white">{rec.identifier}</span>
                          </div>
                          {rec.customerName && (
                            <p className="text-xs text-neutral-400 mt-0.5">Cliente: {rec.customerName}</p>
                          )}
                          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            {new Date(rec.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-bold font-mono text-white block">
                            {formatPrice(rec.totalAmount)}
                          </span>
                          <span className="text-[10px] text-neutral-400 uppercase font-mono px-1.5 py-0.5 border border-neutral-800 bg-black block mt-0.5">
                            {rec.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Items preview */}
                      <div className="text-[11px] text-neutral-400 line-clamp-2 bg-black/40 p-2 border border-neutral-800/80">
                        {rec.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ')}
                      </div>

                      {/* Footer & Actions */}
                      <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                          <Clock className="w-3 h-3 text-white" />
                          <span>Válido por mais <strong className="text-white">{daysRemaining} dias</strong></span>
                          <span className="text-neutral-600">· {rec.authCode}</span>
                        </div>

                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setArchiveReceiptMode('cliente');
                              setArchiveReceiptToView(rec);
                            }}
                            className="flex-1 sm:flex-initial px-2.5 py-1.5 border border-neutral-700 hover:border-neutral-500 bg-neutral-900 text-white text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                            title="Reimprimir Via do Cliente"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Via Cliente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setArchiveReceiptMode('estabelecimento');
                              setArchiveReceiptToView(rec);
                            }}
                            className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-[11px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                            title="Imprimir Via do Estabelecimento"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Via do Bar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FECHAMENTO DO DIA */}
        {activeTab === 'fechamento' && (
          <div className="max-w-2xl mx-auto bg-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6">
            <div className="text-center pb-4 border-b border-neutral-800 space-y-1">
              <h2 className="font-brand text-2xl font-bold tracking-widest text-white">
                HONORATO DRINKERIA
              </h2>
              <p className="text-xs uppercase tracking-widest text-neutral-400">
                Relatório de Fechamento de Caixa
              </p>
              <p className="text-[11px] text-neutral-400">
                Data do turno: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Fundo de Abertura:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.initialCash)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Total Vendas em PIX:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.byPaymentMethod.pix)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Total Vendas em Cartão Débito:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.byPaymentMethod.cartao_debito)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Total Vendas em Cartão Crédito:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.byPaymentMethod.cartao_credito)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Total Vendas em Dinheiro:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.byPaymentMethod.dinheiro)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span className="text-neutral-400">Total Taxa de Serviço (10%):</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.totalServiceCharge)}</span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-neutral-700 text-sm font-bold text-white">
                <span>FATURAMENTO TOTAL DO TURNO:</span>
                <span className="font-mono text-lg">{formatPrice(cashRegister.totalRevenue)}</span>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 flex justify-between font-bold">
                <span className="text-neutral-300">Saldo Físico em Espécie na Gaveta:</span>
                <span className="font-mono text-white">{formatPrice(cashRegister.currentCashBalance)}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => window.print()}
                className="w-1/2 py-3 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Deseja fechar o caixa do turno atual?')) {
                    closeCashRegister();
                    alert('Caixa encerrado com sucesso!');
                  }
                }}
                className="w-1/2 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Encerrar Turno de Caixa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Sangria ou Suprimento */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-700 p-6 space-y-5 text-white">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="font-editorial text-xl font-bold">Movimentação de Caixa</h3>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCashMovement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('sangria')}
                  className={`p-2.5 border text-center cursor-pointer transition-colors ${
                    movementType === 'sangria'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                  }`}
                >
                  Sangria (Retirada)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('suprimento')}
                  className={`p-2.5 border text-center cursor-pointer transition-colors ${
                    movementType === 'suprimento'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                  }`}
                >
                  Suprimento (Entrada)
                </button>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Valor em Dinheiro (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 100.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white font-mono focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Motivo / Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento fornecedor de gelo, reforço de moedas"
                  value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="w-1/2 py-2.5 border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-white text-black font-semibold uppercase tracking-wider hover:bg-neutral-200"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Receipt Modal after payment */}
      {receiptComanda && (
        <ReceiptModal
          comanda={receiptComanda}
          initialType="cliente"
          onClose={() => setReceiptComanda(null)}
        />
      )}

      {/* Archive Receipt Modal */}
      {receiptFromArchive && (
        <ReceiptModal
          comanda={receiptFromArchive}
          initialType={archiveReceiptMode}
          onClose={() => setArchiveReceiptToView(null)}
        />
      )}
    </div>
  );
};
