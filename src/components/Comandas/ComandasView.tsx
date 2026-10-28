import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Comanda, ComandaStatus, Product } from '../../types';
import { CATEGORY_LABELS } from '../../data/initialData';
import { ReceiptModal } from '../Common/ReceiptModal';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Wine,
  Trash2,
  FileText,
  CreditCard,
  X,
  Printer,
  ChevronRight,
  Filter,
  DollarSign,
  AlertTriangle,
  Minus,
} from 'lucide-react';

export const ComandasView: React.FC = () => {
  const {
    comandas,
    products,
    openComanda,
    addItemToComanda,
    removeItemFromComanda,
    updateComandaStatus,
    toggleServiceCharge,
    selectedComandaId,
    setSelectedComandaId,
    setActiveView,
  } = useApp();

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'aberta' | 'fechando' | 'paga'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState<boolean>(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // New comanda form state
  const [newIdentifier, setNewIdentifier] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // Add Item to comanda state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // Format currency safely
  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtered comandas
  const filteredComandas = useMemo(() => {
    return comandas.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesNumber = c.number.toString().includes(q);
        const matchesIdent = c.identifier.toLowerCase().includes(q);
        const matchesCust = c.customerName?.toLowerCase().includes(q) || false;
        return matchesNumber || matchesIdent || matchesCust;
      }
      return true;
    });
  }, [comandas, statusFilter, searchQuery]);

  // Selected comanda
  const activeComanda = useMemo(() => {
    if (!selectedComandaId) {
      // default to first open or first comanda
      return (
        comandas.find((c) => c.status === 'aberta' || c.status === 'fechando') ||
        comandas[0] ||
        null
      );
    }
    return comandas.find((c) => c.id === selectedComandaId) || null;
  }, [comandas, selectedComandaId]);

  // Totals of active comanda
  const subtotal = activeComanda
    ? activeComanda.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
    : 0;
  const serviceAmount =
    activeComanda && activeComanda.includeServiceCharge
      ? (subtotal * activeComanda.serviceChargePercent) / 100
      : 0;
  const totalAmount = subtotal + serviceAmount;

  // Filtered products for item launcher
  const filteredProductsToLaunch = useMemo(() => {
    return products.filter((p) => {
      if (itemCategoryFilter !== 'all' && p.category !== itemCategoryFilter) return false;
      if (itemSearchQuery.trim() !== '') {
        const q = itemSearchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, itemCategoryFilter, itemSearchQuery]);

  // Handle open comanda
  const handleCreateComanda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentifier.trim()) return;

    const created = openComanda(newIdentifier, newCustomerName, newNotes);
    setNewIdentifier('');
    setNewCustomerName('');
    setNewNotes('');
    setIsNewComandaModalOpen(false);
    setSelectedComandaId(created.id);
  };

  // Handle submit item to comanda
  const handleLaunchItem = () => {
    if (!activeComanda || !selectedProductId || itemQuantity <= 0) return;
    addItemToComanda(activeComanda.id, selectedProductId, itemQuantity, itemNotes);
    setSelectedProductId('');
    setItemQuantity(1);
    setItemNotes('');
    setIsAddItemModalOpen(false);
  };

  const presetObservations = [
    'Sem gelo',
    'Gelo extra',
    'Pouco doce',
    'Sem canudo',
    'Trocar Gin por Vodka',
    'Bem gelado',
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <h1 className="font-editorial text-2xl font-bold text-white">
            Comandas
          </h1>

          <button
            onClick={() => setIsNewComandaModalOpen(true)}
            className="px-3.5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Comanda</span>
          </button>
        </div>

        {/* Layout: Master List (Left) + Detail & Order Launcher (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Comandas Grid / Selector (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search & Status Filters */}
            <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar comanda #, mesa ou cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-white"
                />
              </div>

              {/* Status Segmented Buttons */}
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {(
                  [
                    { key: 'all', label: 'Todas' },
                    { key: 'aberta', label: 'Abertas' },
                    { key: 'fechando', label: 'Fechando' },
                    { key: 'paga', label: 'Pagas' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`py-1.5 px-2 border text-center transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Comandas */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredComandas.length === 0 ? (
                <div className="text-center py-12 border border-neutral-800 p-6 bg-neutral-950">
                  <FileText className="w-8 h-8 mx-auto text-neutral-400 mb-2 stroke-[1.2]" />
                  <p className="text-xs text-neutral-400">Nenhuma comanda encontrada neste filtro.</p>
                </div>
              ) : (
                filteredComandas.map((cmd) => {
                  const isSelected = activeComanda?.id === cmd.id;
                  const cmdSubtotal = cmd.items.reduce(
                    (acc, i) => acc + i.unitPrice * i.quantity,
                    0
                  );
                  const cmdTotal = cmd.includeServiceCharge
                    ? cmdSubtotal * 1.1
                    : cmdSubtotal;

                  return (
                    <div
                      key={cmd.id}
                      onClick={() => setSelectedComandaId(cmd.id)}
                      className={`p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-neutral-900 border-white ring-1 ring-white/40'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 border border-neutral-700 bg-neutral-800 text-white">
                            #{cmd.number.toString().padStart(2, '0')}
                          </span>
                          <span className="font-semibold text-sm text-white">
                            {cmd.identifier}
                          </span>
                        </div>

                        {cmd.customerName && (
                          <p className="text-xs text-neutral-400">
                            Cliente: {cmd.customerName}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span>{cmd.items.length} itens</span>
                          <span>·</span>
                          <span className="capitalize">{cmd.status}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-white block">
                          {formatPrice(cmdTotal)}
                        </span>
                        <span
                          className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 mt-1 border ${
                            cmd.status === 'aberta'
                              ? 'border-neutral-600 bg-neutral-800 text-white'
                              : cmd.status === 'fechando'
                              ? 'border-white bg-white text-black'
                              : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                          }`}
                        >
                          {cmd.status === 'aberta'
                            ? 'Aberta'
                            : cmd.status === 'fechando'
                            ? 'Pediu Conta'
                            : 'Paga'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Active Comanda Detailed View (7 cols on lg) */}
          <div className="lg:col-span-7">
            {activeComanda ? (
              <div className="bg-neutral-950 border border-neutral-800 p-5 sm:p-6 space-y-6">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold px-2.5 py-1 border border-neutral-700 bg-black text-white">
                        Comanda #{activeComanda.number.toString().padStart(2, '0')}
                      </span>
                      <h2 className="font-editorial text-2xl font-bold text-white">
                        {activeComanda.identifier}
                      </h2>
                    </div>

                    {activeComanda.customerName && (
                      <p className="text-xs text-neutral-300 mt-1">
                        Cliente / Responsável: <strong className="text-white">{activeComanda.customerName}</strong>
                      </p>
                    )}

                    {activeComanda.notes && (
                      <p className="text-xs text-neutral-400 italic mt-0.5">
                        Obs: {activeComanda.notes}
                      </p>
                    )}
                  </div>

                  {/* Status Toggle & State */}
                  <div className="flex items-center gap-2">
                    {activeComanda.status !== 'paga' && (
                      <button
                        onClick={() =>
                          updateComandaStatus(
                            activeComanda.id,
                            activeComanda.status === 'fechando' ? 'aberta' : 'fechando'
                          )
                        }
                        className={`px-3 py-1.5 text-xs font-medium border cursor-pointer transition-colors ${
                          activeComanda.status === 'fechando'
                            ? 'bg-white text-black border-white'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        {activeComanda.status === 'fechando' ? 'Pediu Conta' : 'Pedir Conta'}
                      </button>
                    )}

                    {activeComanda.status === 'paga' && (
                      <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-black border border-white">
                        Paga
                      </span>
                    )}
                  </div>
                </div>

                {/* Fast Action Buttons */}
                {activeComanda.status !== 'paga' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsAddItemModalOpen(true)}
                      className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lançar Item</span>
                    </button>

                    <button
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Conferência da Conta</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('caixa');
                      }}
                      className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Ir ao Caixa Fechar</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Imprimir Conta / Recibo</span>
                    </button>
                  </div>
                )}

                {/* Items in the Comanda */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Itens ({activeComanda.items.length})
                  </h3>

                  {activeComanda.items.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-neutral-800 bg-neutral-900/50">
                      <Wine className="w-6 h-6 mx-auto text-neutral-400 mb-2 stroke-[1.2]" />
                      <p className="text-xs text-neutral-400">Comanda vazia</p>
                      <button
                        onClick={() => setIsAddItemModalOpen(true)}
                        className="mt-2 text-xs text-white underline hover:text-neutral-300 cursor-pointer"
                      >
                        Lançar item
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-800 border border-neutral-800">
                      {activeComanda.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-neutral-900/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-black border border-neutral-700 px-1.5 py-0.2">
                                {item.quantity}x
                              </span>
                              <span className="font-medium text-white text-sm">
                                {item.productName}
                              </span>
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-neutral-400 italic pl-6">
                                Obs: {item.notes}
                              </p>
                            )}

                            <span className="text-[10px] text-neutral-400 pl-6 block">
                              Lançado às {new Date(item.addedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-white">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </span>

                            {activeComanda.status !== 'paga' && (
                              <button
                                onClick={() => removeItemFromComanda(activeComanda.id, item.id)}
                                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Cancelar / Estornar Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial Summary & Service Fee */}
                <div className="p-3 bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeComanda.includeServiceCharge}
                        onChange={() => toggleServiceCharge(activeComanda.id)}
                        disabled={activeComanda.status === 'paga'}
                        className="rounded-none border-neutral-700 bg-neutral-950 text-white focus:ring-0"
                      />
                      <span>Serviço (10%)</span>
                    </label>
                    <span className="font-mono">
                      {activeComanda.includeServiceCharge ? formatPrice(serviceAmount) : 'R$ 0,00'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm sm:text-base font-bold text-white pt-2 border-t border-neutral-800">
                    <span>TOTAL:</span>
                    <span className="font-mono text-lg">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 p-12 text-center text-neutral-400">
                <FileText className="w-10 h-10 mx-auto mb-3 stroke-[1.2] text-neutral-400" />
                <p className="text-sm font-semibold text-white">Selecione uma comanda</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nova Comanda */}
      {isNewComandaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-700 p-6 space-y-5 text-white">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="font-editorial text-xl font-bold">Abrir Nova Comanda</h3>
              <button
                onClick={() => setIsNewComandaModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComanda} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Mesa ou Identificador * (Ex: Mesa 04, Balcão 02, Lounge)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mesa 01"
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Nome do Cliente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lucas & Mariana"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Observações Iniciais
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário, prefere taças de cristal"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewComandaModalOpen(false)}
                  className="w-1/2 py-2.5 border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-white text-black font-semibold uppercase tracking-wider hover:bg-neutral-200"
                >
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Item / Drink na Comanda */}
      {isAddItemModalOpen && activeComanda && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-700 p-6 space-y-5 text-white max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-editorial text-xl font-bold">Lançar Item no Pedido</h3>
                <p className="text-xs text-neutral-400">
                  Comanda #{activeComanda.number.toString().padStart(2, '0')} · {activeComanda.identifier}
                </p>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar inside launcher */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Buscar produto..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-white"
              />

              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'autorais', label: 'Autorais' },
                  { key: 'classicos', label: 'Clássicos' },
                  { key: 'doses', label: 'Doses' },
                  { key: 'cervejas', label: 'Cervejas' },
                  { key: 'sem_alcool', label: 'Sem Álcool' },
                  { key: 'petiscos', label: 'Petiscos' },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setItemCategoryFilter(c.key)}
                    className={`px-2.5 py-1 border whitespace-nowrap ${
                      itemCategoryFilter === c.key
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product selection list */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800 border border-neutral-800 pr-1 max-h-56">
              {filteredProductsToLaunch.map((prod) => {
                const isChosen = selectedProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      isChosen
                        ? 'bg-white text-black'
                        : 'bg-neutral-950 text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{prod.name}</span>
                      <span className={`text-[10px] ${isChosen ? 'text-neutral-700' : 'text-neutral-400'}`}>
                        {CATEGORY_LABELS[prod.category]} · Estoque: {prod.stock} {prod.unit}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold">{formatPrice(prod.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantity and Modifications/Observations */}
            <div className="space-y-4 pt-2 border-t border-neutral-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 border border-neutral-700 bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-base font-bold w-8 text-center text-white">
                    {itemQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => prev + 1)}
                    className="w-8 h-8 border border-neutral-700 bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Observation Presets */}
              <div>
                <span className="block text-neutral-400 mb-1.5 font-medium">
                  Observações rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetObservations.map((obs) => (
                    <button
                      key={obs}
                      type="button"
                      onClick={() =>
                        setItemNotes((prev) =>
                          prev ? `${prev}, ${obs}` : obs
                        )
                      }
                      className="px-2 py-1 text-[11px] border border-neutral-800 bg-neutral-900 hover:border-neutral-600 text-neutral-300"
                    >
                      + {obs}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Observação personalizada..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white placeholder-neutral-400 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="w-1/3 py-2.5 border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedProductId}
                  onClick={handleLaunchItem}
                  className={`w-2/3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    selectedProductId
                      ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer'
                      : 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar e Lançar na Comanda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt & Bill Split Modal */}
      {isReceiptModalOpen && activeComanda && (
        <ReceiptModal
          comanda={activeComanda}
          onClose={() => setIsReceiptModalOpen(false)}
          onGoToCheckout={() => {
            setIsReceiptModalOpen(false);
            setActiveView('caixa');
          }}
        />
      )}
    </div>
  );
};
