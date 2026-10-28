import React, { useState } from 'react';
import { Comanda, PaymentMethod } from '../../types';
import { Printer, X, Users, Check, Share2, ShieldCheck, Clock, FileText } from 'lucide-react';

interface ReceiptModalProps {
  comanda: Comanda;
  onClose: () => void;
  onGoToCheckout?: () => void;
  initialType?: 'cliente' | 'estabelecimento';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  comanda,
  onClose,
  onGoToCheckout,
  initialType = 'cliente',
}) => {
  const [activeReceiptType, setActiveReceiptType] = useState<'cliente' | 'estabelecimento'>(initialType);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [copied, setCopied] = useState<boolean>(false);

  const subtotal = comanda.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const serviceAmount = comanda.includeServiceCharge
    ? (subtotal * comanda.serviceChargePercent) / 100
    : 0;
  const total = subtotal + serviceAmount;
  const perPerson = splitCount > 0 ? total / splitCount : total;

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const paymentLabelMap: Record<PaymentMethod, string> = {
    pix: 'PIX Instantâneo',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    dinheiro: 'Dinheiro Espécie',
    misto: 'Pagamento Misto / Dividido',
  };

  // Date and 30-day validity calculation
  const closedDate = comanda.closedAt ? new Date(comanda.closedAt) : new Date();
  const expirationDate = new Date(closedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const authCode = `HON-${Math.abs(comanda.id.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000 + 1000)}-${closedDate.getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleShareSummary = () => {
    const text =
      `HONORATO DRINKERIA\n` +
      `Via do Cliente - Comanda #${comanda.number.toString().padStart(2, '0')} (${comanda.identifier})\n` +
      comanda.items
        .map((i) => `${i.quantity}x ${i.productName} - ${formatPrice(i.unitPrice * i.quantity)}`)
        .join('\n') +
      `\n\nSubtotal: ${formatPrice(subtotal)}` +
      (comanda.includeServiceCharge ? `\nServiço (10%): ${formatPrice(serviceAmount)}` : '') +
      `\nTOTAL: ${formatPrice(total)}` +
      (comanda.status === 'paga' && comanda.paymentMethod ? `\nPago via: ${paymentLabelMap[comanda.paymentMethod]}` : '') +
      `\nDividido em ${splitCount} pessoas: ${formatPrice(perPerson)} cada.\n` +
      `Obrigado pela preferência!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-700 p-6 shadow-2xl text-white my-8 space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Type Toggle (Via do Cliente vs Via do Estabelecimento) */}
        <div className="no-print flex border border-neutral-800 bg-neutral-900 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveReceiptType('cliente')}
            className={`flex-1 py-2 px-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeReceiptType === 'cliente'
                ? 'bg-white text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Via do Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveReceiptType('estabelecimento')}
            className={`flex-1 py-2 px-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeReceiptType === 'estabelecimento'
                ? 'bg-white text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Via do Bar (30 dias)</span>
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div id="thermal-receipt" className="space-y-4 font-mono text-xs text-neutral-200 bg-black/40 p-4 border border-neutral-800">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-700 space-y-1">
            <h2 className="font-brand text-lg font-bold tracking-widest text-white">
              HONORATO DRINKERIA
            </h2>

            {activeReceiptType === 'cliente' ? (
              <>
                <p className="text-[10px] tracking-widest uppercase text-neutral-300 font-bold">
                  {comanda.status === 'paga' ? '*** VIA DO CLIENTE ***' : 'CONFERÊNCIA DE MESA'}
                </p>
                <p className="text-[9px] text-neutral-500 uppercase">
                  Documento não fiscal para conferência
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] tracking-widest uppercase text-white font-bold bg-neutral-900 py-0.5 border border-neutral-700">
                  VIA DO ESTABELECIMENTO
                </p>
                <div className="flex items-center justify-center gap-1 text-[9px] text-neutral-400 mt-1">
                  <Clock className="w-3 h-3 text-white" />
                  <span>ARQUIVO FISCAL INTERNO (VALIDADE 30 DIAS)</span>
                </div>
              </>
            )}

            <p className="text-[10px] text-neutral-400 pt-0.5">
              {closedDate.toLocaleDateString('pt-BR')} · {closedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Comanda Info */}
          <div className="py-2 border-b border-dashed border-neutral-800 text-[11px] space-y-1">
            <div className="flex justify-between font-bold text-white">
              <span>Comanda #{comanda.number.toString().padStart(2, '0')}</span>
              <span>{comanda.identifier}</span>
            </div>
            {comanda.customerName && (
              <div className="flex justify-between text-neutral-300">
                <span>Cliente:</span>
                <span>{comanda.customerName}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Situação:</span>
              <span className={`uppercase font-bold ${comanda.status === 'paga' ? 'text-white' : 'text-neutral-300'}`}>
                {comanda.status === 'paga' ? 'CONTA FECHADA / PAGA' : 'EM ABERTO'}
              </span>
            </div>

            {/* Establishment exclusive metadata */}
            {activeReceiptType === 'estabelecimento' && (
              <div className="pt-1.5 border-t border-neutral-900 text-[10px] text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Autenticação:</span>
                  <span className="font-bold text-white">{authCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guarda válida até:</span>
                  <span className="text-white font-bold">{expirationDate.toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="py-2 border-b border-dashed border-neutral-800 space-y-2">
            <div className="flex justify-between text-[10px] uppercase text-neutral-400 font-bold">
              <span>Qtd / Descrição</span>
              <span>Valor</span>
            </div>

            {comanda.items.map((item) => (
              <div key={item.id} className="text-xs space-y-0.5">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-white">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-medium shrink-0 font-mono">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-neutral-400 italic pl-3">
                    Obs: {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="py-2 border-b border-dashed border-neutral-700 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-300">
              <span>Subtotal dos itens:</span>
              <span className="font-mono">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex justify-between text-neutral-300">
              <span>Serviço opcional (10%):</span>
              <span className="font-mono">
                {comanda.includeServiceCharge ? formatPrice(serviceAmount) : 'R$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-dashed border-neutral-800">
              <span>TOTAL {comanda.status === 'paga' ? 'PAGO' : 'A PAGAR'}:</span>
              <span className="font-mono text-base">{formatPrice(total)}</span>
            </div>

            {comanda.status === 'paga' && comanda.paymentMethod && (
              <div className="flex justify-between text-neutral-300 pt-1 text-[11px]">
                <span>Forma de Pagamento:</span>
                <span className="font-bold text-white">
                  {paymentLabelMap[comanda.paymentMethod] || comanda.paymentMethod}
                </span>
              </div>
            )}
          </div>

          {/* Bill Split Calculator (Only on customer copy) */}
          {activeReceiptType === 'cliente' && (
            <div className="no-print pt-2 pb-2 border-b border-dashed border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Dividir conta entre:</span>
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSplitCount(num)}
                      className={`w-6 h-6 text-[10px] font-bold border cursor-pointer ${
                        splitCount === num
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-300">
                  Valor por pessoa ({splitCount}x):
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {formatPrice(perPerson)}
                </span>
              </div>
            </div>
          )}

          {/* Establishment Signature Field (Only on establishment copy) */}
          {activeReceiptType === 'estabelecimento' && (
            <div className="pt-4 pb-2 space-y-4 text-center">
              <div className="pt-8 border-b border-neutral-500 max-w-[260px] mx-auto" />
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Assinatura do Cliente / Controle do Caixa
              </p>
              <p className="text-[9px] text-neutral-600">
                Arquivo com retenção legal de 30 dias no banco de dados da Drinkeria.
              </p>
            </div>
          )}

          {/* Thermal Footer */}
          <div className="text-center pt-2 text-[10px] text-neutral-400 space-y-0.5">
            <p>Agradecemos a sua visita e preferência!</p>
            <p className="font-brand tracking-widest text-neutral-300">HONORATO DRINKERIA</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print mt-4 grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>
              Imprimir {activeReceiptType === 'cliente' ? 'Via do Cliente' : 'Via do Estabelecimento'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShareSummary}
            className="py-3 px-3 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          {onGoToCheckout && comanda.status !== 'paga' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToCheckout();
              }}
              className="col-span-2 py-3 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Receber & Fechar no Caixa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
