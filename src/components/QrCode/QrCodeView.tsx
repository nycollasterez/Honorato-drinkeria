import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  Copy,
  Check,
  ExternalLink,
  Wine,
  Download,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';

export const QrCodeView: React.FC = () => {
  const { setActiveView, setIsClientOnlyMode } = useApp();
  const [tableNumber, setTableNumber] = useState<string>('01');
  const [tableType, setTableType] = useState<string>('Mesa');
  const [customTableLabel, setCustomTableLabel] = useState<string>('');
  const [includeTableParam, setIncludeTableParam] = useState<boolean>(true);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-detect base menu URL considering any subfolder deployment (HostGator, local, domain)
  const getAutoDetectedMenuUrl = () => {
    if (typeof window === 'undefined') return 'https://seusite.com.br/cardapio';
    const origin = window.location.origin;
    const pathname = window.location.pathname;

    // Remove any trailing route views or index.html
    const cleanPath = pathname
      .replace(/\/index\.html$/i, '')
      .replace(/\/(qrcode|gerencia|caixa|comandas|estoque|login|cardapio)\/?$/i, '')
      .replace(/\/+$/, '');

    return `${origin}${cleanPath}/cardapio`;
  };

  // Initialize customUrl on mount
  useEffect(() => {
    setCustomUrl(getAutoDetectedMenuUrl());
  }, []);

  const currentLabel =
    customTableLabel.trim() ||
    (tableType === 'Geral' ? 'Todas as Mesas' : `${tableType} ${tableNumber}`);

  // Build the final target URL with optional table parameter
  const targetMenuUrl = (() => {
    const base = customUrl.trim() || getAutoDetectedMenuUrl();
    if (!includeTableParam || tableType === 'Geral') {
      return base;
    }
    const param = encodeURIComponent(currentLabel.toLowerCase().replace(/\s+/g, '-'));
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}mesa=${param}`;
  })();

  // Render QR codes
  useEffect(() => {
    if (!targetMenuUrl) return;

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        targetMenuUrl,
        {
          width: 250,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Erro ao gerar QR Code:', error);
        }
      );
    }

    if (printCanvasRef.current) {
      QRCode.toCanvas(
        printCanvasRef.current,
        targetMenuUrl,
        {
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Erro ao gerar QR Code para impressão:', error);
        }
      );
    }
  }, [targetMenuUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard && targetMenuUrl) {
      navigator.clipboard.writeText(targetMenuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      const filename = `qrcode-honorato-${currentLabel.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error('Falha ao baixar PNG:', err);
    }
  };

  const handleTestLink = () => {
    if (typeof window !== 'undefined') {
      window.open(targetMenuUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h1 className="font-editorial text-2xl font-bold text-white">
              QR Code & Placas de Mesa
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gere links diretos, baixe imagens em alta definição e imprima displays de mesa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestLink}
              className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Abrir o link do cardápio em uma nova aba para testar"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Testar Link</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/cardapio');
                }
                setIsClientOnlyMode(true);
                setActiveView('cardapio');
              }}
              className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Wine className="w-3.5 h-3.5" />
              <span>Modo Cliente</span>
            </button>
          </div>
        </div>

        {/* Configuration & Preview Grid */}
        <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls (5 cols) */}
          <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 p-5 space-y-5">
            <div className="space-y-0.5 border-b border-neutral-800 pb-2">
              <h3 className="font-editorial text-lg font-bold text-white">
                1. Configuração do Destino
              </h3>
              <p className="text-[11px] text-neutral-400">
                Ajuste a URL exata do seu domínio caso o site esteja em uma pasta ou subdomínio
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* URL input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-neutral-300 font-semibold flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>URL Base do Cardápio:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomUrl(getAutoDetectedMenuUrl())}
                    className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer flex items-center gap-1"
                    title="Redetectar URL pelo navegador"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Auto-detectar</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://seusite.com.br/cardapio"
                  className="w-full bg-neutral-900 border border-neutral-700 p-2.5 font-mono text-[11px] text-white focus:outline-none focus:border-white"
                />
                <p className="text-[10px] text-neutral-500">
                  Dica HostGator: Se o site estiver em <code className="text-neutral-300">dominio.com.br/bar/</code>, digite <code className="text-neutral-300">https://dominio.com.br/bar/cardapio</code>.
                </p>
              </div>

              {/* Table Identification */}
              <div className="pt-2 border-t border-neutral-800 space-y-3">
                <label className="block text-neutral-300 font-semibold">
                  Tipo de Local / Mesa:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Mesa', 'Balcão', 'Geral'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTableType(t)}
                      className={`p-2 border text-center transition-colors cursor-pointer text-xs ${
                        tableType === t
                          ? 'bg-white text-black border-white font-bold'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tableType !== 'Geral' && (
                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1.5">
                      Número do Local:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTableNumber(num)}
                          className={`w-8 h-8 border text-center font-mono font-bold cursor-pointer transition-colors text-xs ${
                            tableNumber === num
                              ? 'bg-white text-black border-white'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-neutral-400 text-[11px] mb-1">
                    Ou Nome Customizado (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Lounge VIP, Deck Superior, Balcão 1..."
                    value={customTableLabel}
                    onChange={(e) => setCustomTableLabel(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white focus:outline-none focus:border-white text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includeTableCheck"
                    checked={includeTableParam}
                    onChange={(e) => setIncludeTableParam(e.target.checked)}
                    className="accent-white cursor-pointer"
                  />
                  <label htmlFor="includeTableCheck" className="text-neutral-300 text-[11px] cursor-pointer">
                    Vincular identificação ao link (<code className="text-white">?mesa=...</code>)
                  </label>
                </div>
              </div>

              {/* Generated Final Link & Actions */}
              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <label className="block text-neutral-400 text-[11px]">Link Gravado no QR Code:</label>
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-white truncate select-all break-all">
                  {targetMenuUrl}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="py-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    title="Baixar imagem PNG do QR Code em alta resolução"
                  >
                    {downloadSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{downloadSuccess ? 'Baixado!' : 'Baixar PNG'}</span>
                  </button>
                </div>
              </div>

              {/* Print Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg text-xs"
                >
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                  <span>Imprimir Display de Mesa</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Card Display Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wider text-neutral-400 mb-3">
              Pré-visualização do Display de Mesa
            </span>

            {/* Printable Frame Preview */}
            <div className="w-full max-w-sm bg-white text-black p-8 border-4 border-black text-center space-y-5 shadow-2xl">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 border border-black flex items-center justify-center">
                  <Wine className="w-5 h-5 text-black" />
                </div>
                <div className="text-left">
                  <span className="font-brand text-lg font-bold tracking-widest block leading-none">
                    HONORATO
                  </span>
                  <span className="text-[8px] tracking-[0.25em] font-bold uppercase block text-neutral-700">
                    DRINKERIA
                  </span>
                </div>
              </div>

              <div className="py-1.5 border-y-2 border-black">
                <span className="font-editorial text-lg font-bold tracking-wider uppercase">
                  {currentLabel}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white border-2 border-black inline-block shadow-inner mx-auto">
                <canvas ref={canvasRef} className="mx-auto block" />
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold uppercase tracking-wider text-sm">
                  Cardápio Digital de Coquetéis
                </p>
                <p className="text-[11px] text-neutral-800 leading-snug">
                  Aponte a câmera do seu smartphone para conferir a carta completa de coquetéis autorais, doses e valores.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-300 text-[10px] text-neutral-700 font-medium">
                Chame nosso atendente para registrar seu pedido.
              </div>
            </div>
          </div>
        </div>

        {/* PRINT ONLY SECTION - Optimized for A4 or Table Tent Physical Print */}
        <div className="print-only hidden p-8 bg-white text-black min-h-screen">
          <div className="max-w-md mx-auto border-4 border-black p-10 text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 border-2 border-black flex items-center justify-center">
                <Wine className="w-7 h-7 text-black" />
              </div>
              <div className="text-left">
                <h1 className="font-brand text-2xl font-bold tracking-widest leading-none">
                  HONORATO
                </h1>
                <span className="text-[10px] tracking-[0.25em] font-bold uppercase block text-neutral-700">
                  DRINKERIA
                </span>
              </div>
            </div>

            <div className="py-2.5 border-y-2 border-black">
              <h2 className="font-editorial text-2xl font-bold tracking-wider uppercase">
                {currentLabel}
              </h2>
            </div>

            <div className="p-4 bg-white border-2 border-black inline-block mx-auto">
              <canvas ref={printCanvasRef} className="mx-auto block" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold uppercase tracking-wide">
                Cardápio Digital de Coquetéis
              </h3>
              <p className="text-xs text-neutral-800 max-w-xs mx-auto leading-relaxed">
                Abra a câmera do seu smartphone e aponte para o QR Code acima para consultar nossos coquetéis, receitas exclusivas, doses e valores.
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-400 text-xs text-neutral-700">
              Cardápio Informativo · Chame nosso garçom para realizar o seu pedido.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
