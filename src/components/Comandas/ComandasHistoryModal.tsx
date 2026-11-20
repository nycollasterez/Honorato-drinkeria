import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Comanda } from '../../types';
import {
  X,
  Search,
  Calendar,
  Filter,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  User,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { ReceiptModal } from '../Common/ReceiptModal';

interface ComandasHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComandasHistoryModal: React.FC<ComandasHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { comandas } = useApp();

  const [dateFilter, setDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [numberFilter, setNumberFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aberta' | 'fechando' | 'paga' | 'cancelada'>('all');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCustomerDisplayName = (cmd?: Comanda | null) => {
    if (!cmd || !cmd.customerName) return null;
    const name = cmd.customerName.trim();
    if (!name || /^mesa(\s*\d+)?$/i.test(name)) return null;
    return name;
  };

  const filteredHistory = useMemo(() => {
    return comandas.filter((c) => {
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Number filter
      if (numberFilter.trim() !== '') {
        const q = numberFilter.trim().toLowerCase();
        const matchesNum = c.number.toString().includes(q);
        const matchesIdent = c.identifier.toLowerCase().includes(q);
        const matchesCust = c.customerName?.toLowerCase().includes(q) || false;
        if (!matchesNum && !matchesIdent && !matchesCust) return false;
      }

      // Date filters (handles sessions crossing midnight)
      if (dateFilter) {
        const openDay = c.openedAt ? c.openedAt.slice(0, 10) : '';
        const closeDay = c.closedAt ? c.closedAt.slice(0, 10) : openDay;
        if (endDateFilter) {
          if (openDay < dateFilter && closeDay < dateFilter) return false;
          if (openDay > endDateFilter && closeDay > endDateFilter) return false;
        } else {
          if (openDay !== dateFilter && closeDay !== dateFilter) return false;
        }
      }

      return true;
    });
  }, [comandas, statusFilter, numberFilter, dateFilter, endDateFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c1122]/90 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overflow-x-hidden pt-4 sm:pt-6 pb-6">
      <div className="relative w-full max-w-5xl bg-[#13192f] border border-[#253257] p-4 sm:p-6 space-y-4 rounded-xl shadow-2xl my-auto box-border text-white max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2945] pb-3 shrink-0">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span>Histórico Geral de Comandas</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Consulte atendimentos passados, cancelamentos e caixas anteriores
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#10172e] border border-[#1f2945] p-3 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs shrink-0">
          {/* Number / Customer Search */}
          <div>
            <label className="block text-neutral-400 text-[10px] uppercase mb-1">
              Comanda / Mesa / Cliente
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Ex: 27, Mesa 04, Maria..."
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                className="w-full bg-[#1a2342] border border-[#253257] pl-8 pr-2.5 py-1.5 rounded text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-neutral-400 text-[10px] uppercase mb-1">
              Status do Atendimento
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-[#1a2342] border border-[#253257] p-1.5 rounded text-white text-xs focus:outline-none focus:border-orange-500"
            >
              <option value="all">Todos os Status</option>
              <option value="paga">Pagas (Encerradas)</option>
              <option value="aberta">Abertas</option>
              <option value="fechando">Pediu Conta</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          {/* Date Start */}
          <div>
            <label className="block text-neutral-400 text-[10px] uppercase mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-[#1a2342] border border-[#253257] p-1.5 rounded text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Date End */}
          <div>
            <label className="block text-neutral-400 text-[10px] uppercase mb-1">
              Data Fim (Opcional)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full bg-[#1a2342] border border-[#253257] p-1.5 rounded text-white text-xs focus:outline-none focus:border-orange-500"
              />
              {(dateFilter || endDateFilter || numberFilter || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('');
                    setEndDateFilter('');
                    setNumberFilter('');
                    setStatusFilter('all');
                  }}
                  className="px-2 py-1.5 text-[10px] text-neutral-400 hover:text-white border border-[#253257] rounded"
                  title="Limpar Filtros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content: List + Detail Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Comandas Table / List (7 cols on lg) */}
          <div className="lg:col-span-7 bg-[#10172e] border border-[#1f2945] rounded-lg overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">Nenhuma comanda encontrada para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="divide-y divide-navy-800">
                {filteredHistory.map((cmd) => {
                  const subtotal = cmd.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                  const total = cmd.includeServiceCharge ? subtotal + (subtotal * cmd.serviceChargePercent) / 100 : subtotal;
                  const isSelected = selectedComanda?.id === cmd.id;

                  return (
                    <div
                      key={cmd.id}
                      onClick={() => setSelectedComanda(cmd)}
                      className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-[#1a2342] border-l-4 border-orange-500'
                          : 'hover:bg-[#13192f]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-navy-950 border border-navy-700 px-1.5 py-0.5 rounded text-[11px]">
                            Comanda {cmd.number}
                          </span>
                          {getCustomerDisplayName(cmd) && (
                            <span className="font-semibold text-white truncate">
                              {getCustomerDisplayName(cmd)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                          <span>{new Date(cmd.openedAt).toLocaleDateString('pt-BR')} às {new Date(cmd.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {cmd.cashRegisterSessionId && (
                            <span className="font-mono text-neutral-500">· Caixa: {cmd.cashRegisterSessionId.slice(-6)}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-white text-sm block">
                          {formatPrice(total)}
                        </span>
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border mt-0.5 ${
                            cmd.status === 'paga'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                              : cmd.status === 'cancelada'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : cmd.status === 'fechando'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-navy-900 text-neutral-300 border-navy-700'
                          }`}
                        >
                          {cmd.status === 'paga'
                            ? 'Paga'
                            : cmd.status === 'cancelada'
                            ? 'Cancelada'
                            : cmd.status === 'fechando'
                            ? 'Fechando'
                            : 'Aberta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comanda Details (5 cols on lg) */}
          <div className="lg:col-span-5 bg-[#10172e] border border-[#1f2945] rounded-lg p-4 overflow-y-auto">
            {selectedComanda ? (
              <div className="space-y-4 text-xs">
                {/* Detail Header */}
                <div className="border-b border-[#1f2945] pb-3 flex justify-between items-start">
                  <div>
                    <span className="font-mono text-base font-bold px-2 py-0.5 border border-[#253257] bg-[#0c1122] text-white rounded inline-block mb-1">
                      Comanda {selectedComanda.number}
                    </span>
                    {getCustomerDisplayName(selectedComanda) && (
                      <h3 className="font-editorial text-xl font-bold text-white">
                        {getCustomerDisplayName(selectedComanda)}
                      </h3>
                    )}
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      selectedComanda.status === 'paga'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : selectedComanda.status === 'cancelada'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                        : 'bg-navy-900 text-neutral-300 border-navy-700'
                    }`}
                  >
                    {selectedComanda.status}
                  </span>
                </div>

                {/* Cancellation Details */}
                {selectedComanda.status === 'cancelada' && (
                  <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Comanda Cancelada</span>
                    </div>
                    <p className="text-[11px]">
                      <strong>Motivo:</strong> {selectedComanda.cancellationReason || 'Não informado'}
                    </p>
                    <p className="text-[10px] text-rose-400/80">
                      Responsável: {selectedComanda.cancelledBy || 'Administrador'} · {selectedComanda.cancelledAt ? new Date(selectedComanda.cancelledAt).toLocaleString('pt-BR') : ''}
                    </p>
                  </div>
                )}

                {/* Session & Timestamps */}
                <div className="p-2.5 bg-[#13192f] border border-[#1f2945] rounded space-y-1 text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Abertura:</span>
                    <span className="text-white font-mono">
                      {new Date(selectedComanda.openedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {selectedComanda.closedAt && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Encerramento:</span>
                      <span className="text-white font-mono">
                        {new Date(selectedComanda.closedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {selectedComanda.cashRegisterSessionId && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Sessão de Caixa:</span>
                      <span className="text-white font-mono">{selectedComanda.cashRegisterSessionId}</span>
                    </div>
                  )}
                  {selectedComanda.paymentMethod && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Forma de Pagamento:</span>
                      <span className="text-white font-semibold capitalize">{selectedComanda.paymentMethod}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-neutral-300 block uppercase">
                    Itens do Pedido ({selectedComanda.items.length}):
                  </span>
                  <div className="border border-[#1f2945] rounded divide-y divide-[#1f2945] bg-[#13192f] max-h-44 overflow-y-auto">
                    {selectedComanda.items.map((it) => (
                      <div key={it.id} className="p-2 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-white font-medium">
                            {it.quantity}x {it.productName}
                          </span>
                          {it.notes && (
                            <p className="text-[10px] text-neutral-400 italic">Obs: {it.notes}</p>
                          )}
                        </div>
                        <span className="font-mono text-white">
                          {formatPrice(it.unitPrice * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                {(() => {
                  const sub = selectedComanda.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                  const serv = selectedComanda.includeServiceCharge ? (sub * selectedComanda.serviceChargePercent) / 100 : 0;
                  const tot = sub + serv;

                  return (
                    <div className="p-3 bg-[#13192f] border border-[#1f2945] rounded space-y-1">
                      <div className="flex justify-between text-neutral-400">
                        <span>Subtotal:</span>
                        <span className="font-mono text-white">{formatPrice(sub)}</span>
                      </div>
                      {selectedComanda.includeServiceCharge && serv > 0 && (
                        <div className="flex justify-between text-neutral-400">
                          <span>Serviço ({selectedComanda.serviceChargePercent}%):</span>
                          <span className="font-mono text-white">{formatPrice(serv)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#1f2945]">
                        <span>Total:</span>
                        <span className="font-mono text-orange-400">{formatPrice(tot)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Action: Open Receipt */}
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="w-full py-2 bg-[#1a2342] hover:bg-[#202b50] border border-[#253257] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ver Comprovante / Recibo</span>
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-xs">Selecione uma comanda ao lado para ver todos os detalhes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {isReceiptOpen && selectedComanda && (
        <ReceiptModal
          comanda={selectedComanda}
          initialType="cliente"
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
