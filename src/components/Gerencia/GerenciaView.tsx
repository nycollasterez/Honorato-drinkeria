import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, DailyClosingReport } from '../../types';
import {
  Printer,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Check,
  Lock,
  Eye,
  EyeOff,
  Download,
  Calendar,
  TrendingUp,
  CreditCard,
  Wine,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export const GerenciaView: React.FC = () => {
  const {
    cashRegister,
    comandas,
    transactions,
    bottles,
    closingReports,
    performDailyClosing,
    setActiveView,
    setIsClientOnlyMode,
    staffPins,
    updateStaffPin,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'fechamento' | 'relatorio_a4' | 'seguranca'>('overview');
  const [reportPeriod, setReportPeriod] = useState<'hoje' | 'ontem' | '7dias' | 'mes' | 'historico'>('hoje');
  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('Gerente de Operações');

  // PIN security states
  const [showPins, setShowPins] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [tempPin, setTempPin] = useState<string>('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>('');

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Suprimentos e sangrias de hoje
  const todaySuprimentos = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'suprimento')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const todaySangrias = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'sangria')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Vendas de produtos de hoje
  const todayProductCounts = useMemo(() => {
    const counts: Record<string, { quantity: number; revenue: number }> = {};
    transactions.forEach((tx) => {
      tx.itemsSummary?.forEach((item) => {
        if (!counts[item.name]) counts[item.name] = { quantity: 0, revenue: 0 };
        counts[item.name].quantity += item.quantity;
        counts[item.name].revenue += item.quantity * item.price;
      });
    });
    return Object.entries(counts)
      .map(([name, d]) => ({ name, quantity: d.quantity, totalRevenue: d.revenue }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [transactions]);

  const todayComandasClosed = comandas.filter((c) => c.status === 'paga').length;

  // Selected Historical Report
  const currentHistoricalReport: DailyClosingReport | null = useMemo(() => {
    if (selectedHistoricalId) {
      return closingReports.find((r) => r.id === selectedHistoricalId) || null;
    }
    return closingReports[0] || null;
  }, [closingReports, selectedHistoricalId]);

  // Yesterday report (most recent closing report prior to today)
  const yesterdayReport: DailyClosingReport | null = useMemo(() => {
    if (closingReports.length === 0) return null;
    return closingReports[0];
  }, [closingReports]);

  // Last 7 days reports (up to 7 closing reports + today)
  const last7DaysReports = useMemo(() => {
    return closingReports.slice(0, 7);
  }, [closingReports]);

  // Consolidated Period Data Calculation
  const activeReportData = useMemo(() => {
    if (reportPeriod === 'hoje') {
      const totalRev = cashRegister.totalRevenue;
      const totalCmd = todayComandasClosed;
      const serv = cashRegister.totalServiceCharge;
      const payments = { ...cashRegister.byPaymentMethod };
      const products = [...todayProductCounts];
      const initialCash = cashRegister.initialCash;
      const finalCash = cashRegister.currentCashBalance;

      return {
        label: `Turno de Hoje (${new Date().toLocaleDateString('pt-BR')})`,
        periodName: 'Hoje (Em tempo real)',
        totalRevenue: totalRev,
        comandasCount: totalCmd,
        serviceCharge: serv,
        ticketMedio: totalCmd > 0 ? totalRev / totalCmd : 0,
        payments,
        products,
        initialCash,
        finalCash,
        suprimentos: todaySuprimentos,
        sangrias: todaySangrias,
        closedBy: managerName,
        notes: cashRegister.isOpen ? 'Caixa em operação normal' : 'Caixa fechado',
      };
    }

    if (reportPeriod === 'ontem') {
      if (yesterdayReport) {
        return {
          label: `Fechamento de Ontem (${yesterdayReport.date})`,
          periodName: 'Ontem',
          totalRevenue: yesterdayReport.totalRevenue,
          comandasCount: yesterdayReport.comandasCount,
          serviceCharge: yesterdayReport.totalServiceCharge,
          ticketMedio: yesterdayReport.comandasCount > 0 ? yesterdayReport.totalRevenue / yesterdayReport.comandasCount : 0,
          payments: yesterdayReport.byPaymentMethod,
          products: yesterdayReport.topProductsSold,
          initialCash: yesterdayReport.initialCash,
          finalCash: yesterdayReport.finalCashBalance,
          suprimentos: 0,
          sangrias: 0,
          closedBy: yesterdayReport.closedBy,
          notes: yesterdayReport.notes || 'Sem observações registradas',
        };
      }
      return {
        label: 'Ontem (Sem fechamento arquivado)',
        periodName: 'Ontem',
        totalRevenue: 0,
        comandasCount: 0,
        serviceCharge: 0,
        ticketMedio: 0,
        payments: { pix: 0, cartao_credito: 0, cartao_debito: 0, dinheiro: 0, misto: 0 },
        products: [],
        initialCash: 0,
        finalCash: 0,
        suprimentos: 0,
        sangrias: 0,
        closedBy: managerName,
        notes: 'Nenhum fechamento registrado para ontem.',
      };
    }

    if (reportPeriod === 'historico') {
      const rep = currentHistoricalReport;
      if (rep) {
        return {
          label: `Fechamento Histórico (${rep.date})`,
          periodName: `Histórico: ${rep.date}`,
          totalRevenue: rep.totalRevenue,
          comandasCount: rep.comandasCount,
          serviceCharge: rep.totalServiceCharge,
          ticketMedio: rep.comandasCount > 0 ? rep.totalRevenue / rep.comandasCount : 0,
          payments: rep.byPaymentMethod,
          products: rep.topProductsSold,
          initialCash: rep.initialCash,
          finalCash: rep.finalCashBalance,
          suprimentos: 0,
          sangrias: 0,
          closedBy: rep.closedBy,
          notes: rep.notes || 'Fechamento finalizado',
        };
      }
      return {
        label: 'Histórico Vazio',
        periodName: 'Histórico',
        totalRevenue: 0,
        comandasCount: 0,
        serviceCharge: 0,
        ticketMedio: 0,
        payments: { pix: 0, cartao_credito: 0, cartao_debito: 0, dinheiro: 0, misto: 0 },
        products: [],
        initialCash: 0,
        finalCash: 0,
        suprimentos: 0,
        sangrias: 0,
        closedBy: managerName,
        notes: 'Nenhum relatório histórico selecionado.',
      };
    }

    // Period: 7dias or mes
    const reportsToSum = reportPeriod === '7dias' ? last7DaysReports : closingReports;
    let rev = cashRegister.totalRevenue;
    let cmd = todayComandasClosed;
    let serv = cashRegister.totalServiceCharge;
    const pay = { ...cashRegister.byPaymentMethod };
    const prodMap: Record<string, { quantity: number; revenue: number }> = {};

    todayProductCounts.forEach((p) => {
      prodMap[p.name] = { quantity: p.quantity, revenue: p.totalRevenue };
    });

    reportsToSum.forEach((r) => {
      rev += r.totalRevenue;
      cmd += r.comandasCount;
      serv += r.totalServiceCharge;
      pay.pix += r.byPaymentMethod.pix;
      pay.cartao_credito += r.byPaymentMethod.cartao_credito;
      pay.cartao_debito += r.byPaymentMethod.cartao_debito;
      pay.dinheiro += r.byPaymentMethod.dinheiro;
      pay.misto += r.byPaymentMethod.misto;

      r.topProductsSold.forEach((p) => {
        if (!prodMap[p.name]) prodMap[p.name] = { quantity: 0, revenue: 0 };
        prodMap[p.name].quantity += p.quantity;
        prodMap[p.name].revenue += p.totalRevenue;
      });
    });

    const products = Object.entries(prodMap)
      .map(([name, d]) => ({ name, quantity: d.quantity, totalRevenue: d.revenue }))
      .sort((a, b) => b.quantity - a.quantity);

    return {
      label:
        reportPeriod === '7dias'
          ? `Consolidado dos Últimos 7 Dias (${reportsToSum.length + 1} turnos)`
          : `Consolidado Mensal (${reportsToSum.length + 1} turnos)`,
      periodName: reportPeriod === '7dias' ? 'Últimos 7 Dias' : 'Mês Consolidado',
      totalRevenue: rev,
      comandasCount: cmd,
      serviceCharge: serv,
      ticketMedio: cmd > 0 ? rev / cmd : 0,
      payments: pay,
      products,
      initialCash: cashRegister.initialCash,
      finalCash: cashRegister.currentCashBalance,
      suprimentos: todaySuprimentos,
      sangrias: todaySangrias,
      closedBy: managerName,
      notes: `Relatório acumulado gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    };
  }, [
    reportPeriod,
    cashRegister,
    todayComandasClosed,
    todayProductCounts,
    todaySuprimentos,
    todaySangrias,
    yesterdayReport,
    currentHistoricalReport,
    last7DaysReports,
    closingReports,
    managerName,
  ]);

  // Payment method percentage breakdown
  const paymentBreakdown = useMemo(() => {
    const p = activeReportData.payments;
    const total = (p.pix || 0) + (p.cartao_credito || 0) + (p.cartao_debito || 0) + (p.dinheiro || 0) || 1;
    return [
      { key: 'pix', label: 'PIX', amount: p.pix || 0, pct: Math.round(((p.pix || 0) / total) * 100) },
      { key: 'credito', label: 'Cartão de Crédito', amount: p.cartao_credito || 0, pct: Math.round(((p.cartao_credito || 0) / total) * 100) },
      { key: 'debito', label: 'Cartão de Débito', amount: p.cartao_debito || 0, pct: Math.round(((p.cartao_debito || 0) / total) * 100) },
      { key: 'dinheiro', label: 'Dinheiro Físico', amount: p.dinheiro || 0, pct: Math.round(((p.dinheiro || 0) / total) * 100) },
    ];
  }, [activeReportData]);

  // Critical bottle stock summary
  const lowBottles = useMemo(() => {
    return bottles.filter(
      (b) =>
        b.openBottleCurrentMl / b.bottleCapacityMl < 0.3 ||
        b.sealedBottlesCount <= b.minBottlesAlert
    );
  }, [bottles]);

  // CSV Export Function (UTF-8 BOM formatted for Excel)
  const handleExportCsv = () => {
    const separator = ';';
    const lines: string[] = [];

    // Header metadata
    lines.push(`HONORATO DRINKERIA - RELATÓRIO FINANCEIRO & OPERACIONAL`);
    lines.push(`Período${separator}${activeReportData.label}`);
    lines.push(`Data de Emissão${separator}${new Date().toLocaleString('pt-BR')}`);
    lines.push(`Responsável${separator}${activeReportData.closedBy}`);
    lines.push(``);

    // KPI Summary
    lines.push(`1. INDICADORES PRINCIPAIS`);
    lines.push(`Métrica${separator}Valor`);
    lines.push(`Faturamento Bruto${separator}${activeReportData.totalRevenue.toFixed(2)}`);
    lines.push(`Comandas Fechadas${separator}${activeReportData.comandasCount}`);
    lines.push(`Ticket Médio${separator}${activeReportData.ticketMedio.toFixed(2)}`);
    lines.push(`Taxa de Serviço (10%)${separator}${activeReportData.serviceCharge.toFixed(2)}`);
    lines.push(``);

    // Payment Methods
    lines.push(`2. FORMAS DE PAGAMENTO`);
    lines.push(`Método${separator}Valor (R$)${separator}Participação (%)`);
    paymentBreakdown.forEach((pm) => {
      lines.push(`${pm.label}${separator}${pm.amount.toFixed(2)}${separator}${pm.pct}%`);
    });
    lines.push(``);

    // Product Ranking
    lines.push(`3. MIX DE PRODUTOS & COQUETÉIS VENDIDOS`);
    lines.push(`Posição${separator}Produto${separator}Quantidade Vendida${separator}Faturamento (R$)`);
    activeReportData.products.forEach((prod, idx) => {
      lines.push(`${idx + 1}${separator}${prod.name}${separator}${prod.quantity}${separator}${prod.totalRevenue.toFixed(2)}`);
    });
    lines.push(``);

    // Bottles Audit
    lines.push(`4. AUDITORIA DE GARRAFAS & ESTOQUE`);
    lines.push(`Garrafa${separator}Volume Atual (ml)${separator}Capacidade (ml)${separator}Doses Restantes${separator}Reserva Lacrada${separator}Status`);
    bottles.forEach((b) => {
      const pct = Math.round((b.openBottleCurrentMl / b.bottleCapacityMl) * 100);
      const doses = Math.floor(b.openBottleCurrentMl / 50);
      const status = pct >= 70 ? 'Cheia' : pct >= 30 ? 'Pela Metade' : 'Crítico';
      lines.push(`${b.name}${separator}${b.openBottleCurrentMl}${separator}${b.bottleCapacityMl}${separator}${doses}${separator}${b.sealedBottlesCount}${separator}${status}`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDate = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `relatorio-honorato-${reportPeriod}-${safeDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteClosing = () => {
    if (confirm('Confirmar fechamento definitivo do caixa diário? Os valores serão consolidados e arquivados no histórico.')) {
      performDailyClosing(managerName, closingNotes);
      setActiveTab('relatorio_a4');
      setReportPeriod('hoje');
    }
  };

  const handlePrintA4 = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h1 className="font-editorial text-2xl font-bold text-white">
              Painel da Gerência
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/cardapio');
                }
                setIsClientOnlyMode(true);
                setActiveView('cardapio');
              }}
              className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cardápio Cliente</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('relatorio_a4');
              }}
              className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Ver A4</span>
            </button>

            <button
              onClick={() => setActiveTab('fechamento')}
              className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Fechar Caixa</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="no-print flex border-b border-neutral-800 space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('fechamento')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fechamento'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Fechar Caixa
          </button>
          <button
            onClick={() => setActiveTab('relatorio_a4')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'relatorio_a4'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Relatórios A4
          </button>
          <button
            onClick={() => setActiveTab('seguranca')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'seguranca'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Segurança & PINs
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Faturamento Hoje
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {formatPrice(cashRegister.totalRevenue)}
                </span>
                <p className="text-[10px] text-neutral-500">{todayComandasClosed} pagas</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Ticket Médio
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {formatPrice(todayComandasClosed > 0 ? cashRegister.totalRevenue / todayComandasClosed : 0)}
                </span>
                <p className="text-[10px] text-neutral-500">Por conta</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Serviço (10%)
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {formatPrice(cashRegister.totalServiceCharge)}
                </span>
                <p className="text-[10px] text-neutral-500">Taxa acumulada</p>
              </div>

              <div
                onClick={() => setActiveView('estoque')}
                className={`p-4 border cursor-pointer transition-colors space-y-1 ${
                  lowBottles.length > 0 ? 'bg-neutral-900 border-white' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                    Garrafas Críticas
                  </span>
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {lowBottles.length}
                </span>
                <p className="text-[10px] text-neutral-500">&lt;30% ou sem reserva</p>
              </div>
            </div>

            {/* Two Columns: Top Drinks & Bottle Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top Drinks */}
              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                  <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                    Mais Vendidos Hoje
                  </h3>
                  <button
                    onClick={() => {
                      setReportPeriod('hoje');
                      setActiveTab('relatorio_a4');
                    }}
                    className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Ver Completo
                  </button>
                </div>

                {todayProductCounts.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-4 text-center">
                    Nenhum drink ou produto vendido no turno de hoje até o momento.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-800 text-xs">
                    {todayProductCounts.slice(0, 5).map((item, idx) => (
                      <div key={item.name} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] w-5 h-5 flex items-center justify-center border border-neutral-700 bg-neutral-900 text-white font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-white font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white block">
                            {item.quantity} un
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {formatPrice(item.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottle Stock */}
              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                  <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                    Nível de Garrafas no Bar
                  </h3>
                  <button
                    onClick={() => setActiveView('estoque')}
                    className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Ir ao Estoque
                  </button>
                </div>

                <div className="divide-y divide-neutral-800 text-xs">
                  {bottles.slice(0, 5).map((b) => {
                    const pct = Math.round((b.openBottleCurrentMl / b.bottleCapacityMl) * 100);
                    const doses = Math.floor(b.openBottleCurrentMl / 50);
                    return (
                      <div key={b.id} className="py-2 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium text-white">{b.name}</span>
                          <span className="font-mono text-[11px] text-neutral-400">
                            {b.openBottleCurrentMl}ml ({pct}%) · ~{doses} doses
                          </span>
                        </div>
                        <div className="w-full bg-neutral-900 border border-neutral-800 h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${pct < 30 ? 'bg-white' : 'bg-neutral-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FECHAMENTO DO DIA */}
        {activeTab === 'fechamento' && (
          <div className="max-w-2xl mx-auto bg-neutral-950 border border-neutral-800 p-6 space-y-6 text-xs">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="font-editorial text-xl font-bold text-white">
                Fechamento de Caixa Diário
              </h2>
            </div>

            {/* Reconciliation breakdown */}
            <div className="space-y-2.5 bg-neutral-900/60 border border-neutral-800 p-4">
              <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] border-b border-neutral-800 pb-1.5">
                Conciliação da Gaveta (Dinheiro Físico)
              </h3>
              <div className="flex justify-between text-neutral-300">
                <span>Fundo de Abertura:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.initialCash)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>(+) Vendas em Dinheiro:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.byPaymentMethod.dinheiro)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>(+) Suprimentos de Caixa:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(todaySuprimentos)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>(-) Sangrias / Retiradas:</span>
                <span className="font-mono text-white font-semibold">-{formatPrice(todaySangrias)}</span>
              </div>

              <div className="p-2.5 bg-black border border-neutral-700 flex justify-between font-bold text-sm">
                <span className="text-white">Saldo Esperado na Gaveta:</span>
                <span className="font-mono text-white">
                  {formatPrice(cashRegister.currentCashBalance)}
                </span>
              </div>
            </div>

            {/* Electronic breakdown */}
            <div className="space-y-2.5 bg-neutral-900/60 border border-neutral-800 p-4">
              <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] border-b border-neutral-800 pb-1.5">
                Vendas Eletrônicas & Faturamento Total
              </h3>
              <div className="flex justify-between text-neutral-300">
                <span>PIX:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.byPaymentMethod.pix)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Cartão Débito:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.byPaymentMethod.cartao_debito)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Cartão Crédito:</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.byPaymentMethod.cartao_credito)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Serviço Arrecadado (10%):</span>
                <span className="font-mono text-white font-semibold">{formatPrice(cashRegister.totalServiceCharge)}</span>
              </div>

              <div className="flex justify-between py-2 border-t border-neutral-800 text-sm font-bold text-white">
                <span>FATURAMENTO BRUTO TOTAL:</span>
                <span className="font-mono text-base">{formatPrice(cashRegister.totalRevenue)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Responsável pelo Fechamento:
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Observações do Turno:
                </label>
                <input
                  type="text"
                  placeholder="Opcional..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 text-white focus:outline-none focus:border-white"
                />
              </div>

              <button
                onClick={handleExecuteClosing}
                className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer text-xs shadow-lg mt-2"
              >
                Confirmar Fechamento & Emitir Relatório A4
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: RELATÓRIOS EXECUTIVOS (A4 & CSV) */}
        {activeTab === 'relatorio_a4' && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="no-print bg-neutral-950 border border-neutral-800 p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
              {/* Period Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-400 font-semibold text-[11px] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Período:</span>
                </span>

                <div className="flex flex-wrap border border-neutral-700 bg-neutral-900">
                  <button
                    onClick={() => setReportPeriod('hoje')}
                    className={`px-3 py-1.5 font-semibold cursor-pointer transition-colors ${
                      reportPeriod === 'hoje' ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => setReportPeriod('ontem')}
                    className={`px-3 py-1.5 font-semibold cursor-pointer transition-colors ${
                      reportPeriod === 'ontem' ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Ontem
                  </button>
                  <button
                    onClick={() => setReportPeriod('7dias')}
                    className={`px-3 py-1.5 font-semibold cursor-pointer transition-colors ${
                      reportPeriod === '7dias' ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Últimos 7 Dias
                  </button>
                  <button
                    onClick={() => setReportPeriod('mes')}
                    className={`px-3 py-1.5 font-semibold cursor-pointer transition-colors ${
                      reportPeriod === 'mes' ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Mês Atual
                  </button>
                </div>

                {closingReports.length > 0 && (
                  <select
                    value={selectedHistoricalId}
                    onChange={(e) => {
                      setSelectedHistoricalId(e.target.value);
                      setReportPeriod('historico');
                    }}
                    className="bg-neutral-900 border border-neutral-700 text-neutral-200 py-1.5 px-2 text-xs focus:outline-none"
                  >
                    <option value="">Histórico de Fechamentos...</option>
                    {closingReports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.date} — {formatPrice(r.totalRevenue)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                  title="Baixar planilha compatível com Microsoft Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel (CSV)</span>
                </button>

                <button
                  onClick={handlePrintA4}
                  className="px-3.5 py-1.5 bg-white text-black font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-200 cursor-pointer shadow text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir PDF (A4)</span>
                </button>
              </div>
            </div>

            {/* A4 Printable Sheet */}
            <div className="flex justify-center">
              <div
                id="a4-report"
                className="a4-sheet bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 border border-neutral-400 shadow-2xl space-y-6 font-sans text-xs"
              >
                {/* Header */}
                <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                  <div>
                    <h1 className="font-brand text-2xl font-bold tracking-widest leading-none">
                      HONORATO DRINKERIA
                    </h1>
                    <span className="text-[10px] uppercase font-bold text-neutral-600 block mt-1 tracking-wider">
                      Relatório Gerencial Executivo
                    </span>
                  </div>

                  <div className="text-right text-[11px] text-neutral-600 space-y-0.5">
                    <span className="font-bold text-sm uppercase text-black block">
                      {activeReportData.periodName}
                    </span>
                    <span>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="block text-[10px]">Responsável: {activeReportData.closedBy}</span>
                  </div>
                </div>

                {/* KPI Highlights Grid */}
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 bg-neutral-100 border border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-600 block">Faturamento Bruto</span>
                    <span className="font-bold font-mono text-base block mt-0.5">
                      {formatPrice(activeReportData.totalRevenue)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-100 border border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-600 block">Comandas Pagas</span>
                    <span className="font-bold font-mono text-base block mt-0.5">
                      {activeReportData.comandasCount}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-100 border border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-600 block">Ticket Médio</span>
                    <span className="font-bold font-mono text-base block mt-0.5">
                      {formatPrice(activeReportData.ticketMedio)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-100 border border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-600 block">Serviço (10%)</span>
                    <span className="font-bold font-mono text-base block mt-0.5">
                      {formatPrice(activeReportData.serviceCharge)}
                    </span>
                  </div>
                </div>

                {/* Section 1: Formas de Pagamento & Participação */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline border-b border-black pb-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider">
                      1. Distribuição das Formas de Pagamento
                    </h3>
                    <span className="text-[10px] text-neutral-500">Total Faturado</span>
                  </div>

                  <table className="w-full text-left text-xs border border-neutral-300">
                    <thead className="bg-neutral-100 border-b border-neutral-300">
                      <tr>
                        <th className="p-2">Forma de Pagamento</th>
                        <th className="p-2 text-right">Valor Total</th>
                        <th className="p-2 text-right">Participação (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {paymentBreakdown.map((pm) => (
                        <tr key={pm.key}>
                          <td className="p-2 font-medium">{pm.label}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatPrice(pm.amount)}</td>
                          <td className="p-2 text-right font-mono text-neutral-700">{pm.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Reconciliação do Caixa (Gaveta) se for turno diário */}
                {(reportPeriod === 'hoje' || reportPeriod === 'ontem' || reportPeriod === 'historico') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline border-b border-black pb-1">
                      <h3 className="font-bold text-xs uppercase tracking-wider">
                        2. Conciliação da Gaveta (Dinheiro Físico)
                      </h3>
                      <span className="text-[10px] text-neutral-500">Auditoria Física</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-300 text-[11px]">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Fundo de Abertura:</span>
                          <span className="font-mono font-bold">{formatPrice(activeReportData.initialCash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Vendas em Dinheiro:</span>
                          <span className="font-mono font-bold">{formatPrice(activeReportData.payments.dinheiro)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Suprimentos / Entradas:</span>
                          <span className="font-mono font-bold">{formatPrice(activeReportData.suprimentos)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Sangrias / Retiradas:</span>
                          <span className="font-mono font-bold">-{formatPrice(activeReportData.sangrias)}</span>
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-neutral-300 flex justify-between font-bold text-xs">
                        <span>Saldo Final da Gaveta:</span>
                        <span className="font-mono text-sm">{formatPrice(activeReportData.finalCash)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Mix de Vendas & Ranking */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline border-b border-black pb-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider">
                      {reportPeriod === 'hoje' || reportPeriod === 'ontem' || reportPeriod === 'historico' ? '3.' : '2.'} Mix de Produtos Vendidos
                    </h3>
                    <span className="text-[10px] text-neutral-500">Por volume e receita</span>
                  </div>

                  {activeReportData.products.length === 0 ? (
                    <div className="p-3 text-center text-neutral-500 border border-neutral-200">
                      Nenhum produto vendido registrado no período selecionado.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border border-neutral-300">
                      <thead className="bg-neutral-100 border-b border-neutral-300">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">Item / Coquetel</th>
                          <th className="p-2 text-center">Qtd Vendida</th>
                          <th className="p-2 text-right">Faturamento Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {activeReportData.products.slice(0, 10).map((prod, idx) => (
                          <tr key={prod.name}>
                            <td className="p-2 text-center font-mono font-bold text-neutral-600">{idx + 1}</td>
                            <td className="p-2 font-medium">{prod.name}</td>
                            <td className="p-2 text-center font-mono font-bold">{prod.quantity} un</td>
                            <td className="p-2 text-right font-mono font-bold">{formatPrice(prod.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 4: Auditoria de Garrafas no Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline border-b border-black pb-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider">
                      {reportPeriod === 'hoje' || reportPeriod === 'ontem' || reportPeriod === 'historico' ? '4.' : '3.'} Nível das Garrafas (Auditoria do Estoque)
                    </h3>
                    <span className="text-[10px] text-neutral-500">Base: dose padrão 50ml</span>
                  </div>

                  <table className="w-full text-left text-[11px] border border-neutral-300">
                    <thead className="bg-neutral-100 border-b border-neutral-300">
                      <tr>
                        <th className="p-1.5">Destilado / Garrafa</th>
                        <th className="p-1.5">Volume Bancada</th>
                        <th className="p-1.5 text-center">Doses Aprox.</th>
                        <th className="p-1.5 text-center">Reserva Lacrada</th>
                        <th className="p-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {bottles.slice(0, 6).map((b) => {
                        const pct = Math.round((b.openBottleCurrentMl / b.bottleCapacityMl) * 100);
                        const doses = Math.floor(b.openBottleCurrentMl / 50);
                        return (
                          <tr key={b.id}>
                            <td className="p-1.5 font-medium">{b.name}</td>
                            <td className="p-1.5 font-mono">{b.openBottleCurrentMl}ml / {b.bottleCapacityMl}ml ({pct}%)</td>
                            <td className="p-1.5 text-center font-mono font-bold">{doses} doses</td>
                            <td className="p-1.5 text-center font-mono font-bold">{b.sealedBottlesCount} un</td>
                            <td className="p-1.5 text-right font-bold text-[10px]">
                              {pct >= 70 ? 'Cheia' : pct >= 30 ? 'Pela Metade' : 'Crítico'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Observations & Signatures */}
                <div className="pt-4 space-y-4">
                  {activeReportData.notes && (
                    <div className="p-2.5 bg-neutral-50 border border-neutral-200 text-[11px]">
                      <span className="font-bold block text-neutral-700">Observações:</span>
                      <p className="text-neutral-600">{activeReportData.notes}</p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-black grid grid-cols-2 gap-10 text-center text-xs">
                    <div>
                      <div className="border-b border-black pb-8" />
                      <p className="font-bold uppercase mt-1.5">{activeReportData.closedBy}</p>
                      <p className="text-[10px] text-neutral-600">Gerência de Operações</p>
                    </div>
                    <div>
                      <div className="border-b border-black pb-8" />
                      <p className="font-bold uppercase mt-1.5">Diretoria</p>
                      <p className="text-[10px] text-neutral-600">Honorato Drinkeria</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEGURANÇA & PINS DA EQUIPE */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* PINs Management Card */}
            <div className="bg-neutral-950 border border-neutral-800 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span>PINs de Acesso da Equipe</span>
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPins(!showPins)}
                  className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 w-fit cursor-pointer"
                >
                  {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPins ? 'Ocultar PINs' : 'Revelar PINs'}</span>
                </button>
              </div>

              {pinSuccessMsg && (
                <div className="p-3 bg-neutral-900 border border-white text-white text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { role: 'admin' as UserRole, title: 'Gerência (Admin)' },
                  { role: 'garcom' as UserRole, title: 'Garçom / Salão' },
                  { role: 'caixa' as UserRole, title: 'Operador de Caixa' },
                  { role: 'estoque' as UserRole, title: 'Controle de Estoque' },
                ].map((item) => {
                  const currentPin = staffPins[item.role] || (item.role === 'admin' ? '0101' : '1234');
                  const isEditing = editingRole === item.role;

                  return (
                    <div
                      key={item.role}
                      className="p-4 border border-neutral-800 bg-neutral-900/40 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                        <span className="font-mono text-sm px-2.5 py-1 bg-black border border-neutral-700 text-white font-bold tracking-widest">
                          {showPins ? currentPin : '••••'}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Novo PIN"
                            value={tempPin}
                            onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                            className="bg-black border border-neutral-600 px-3 py-1.5 text-xs text-white font-mono flex-1 focus:outline-none focus:border-white tracking-widest"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (tempPin.trim().length >= 3) {
                                updateStaffPin(item.role, tempPin.trim());
                                setEditingRole(null);
                                setTempPin('');
                                setPinSuccessMsg(`PIN de ${item.title} atualizado com sucesso!`);
                                setTimeout(() => setPinSuccessMsg(''), 4000);
                              }
                            }}
                            className="px-3 py-1.5 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 cursor-pointer"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(null);
                              setTempPin('');
                            }}
                            className="px-2.5 py-1.5 border border-neutral-700 text-neutral-400 text-xs hover:text-white cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRole(item.role);
                            setTempPin('');
                          }}
                          className="w-full py-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          Alterar PIN
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
