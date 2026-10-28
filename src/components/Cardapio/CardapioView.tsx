import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { CATEGORY_LABELS } from '../../data/initialData';
import {
  Search,
  Wine,
  Sparkles,
  X,
  GlassWater,
  Info,
} from 'lucide-react';

export const CardapioView: React.FC = () => {
  const { products } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [activeMobileId, setActiveMobileId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Detecta se é celular/touch vs computador (desktop com mouse)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkTouch = () => {
      const isTouch = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
        window.innerWidth < 768
      );
      setIsTouchDevice(isTouch);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch, { passive: true });
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const categories = useMemo(() => {
    return [
      { key: 'all', label: 'Todos' },
      { key: 'autorais', label: 'Autorais' },
      { key: 'classicos', label: 'Clássicos' },
      { key: 'doses', label: 'Doses' },
      { key: 'cervejas', label: 'Cervejas' },
      { key: 'sem_alcool', label: 'Sem Álcool' },
      { key: 'petiscos', label: 'Petiscos' },
    ];
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesIngredients = item.ingredients?.some((ing) =>
          ing.toLowerCase().includes(query)
        );
        const matchesNotes = item.tastingNotes?.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesIngredients || matchesNotes;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Sincronização de cor exclusiva para CELULAR: ao rolar na tela touch, o item que passa pelo centro fica colorido
  // No computador (desktop), este efeito de scroll NÃO roda; apenas o hover do mouse colore o item!
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isTouchDevice) {
      setActiveMobileId(null);
      return;
    }

    let ticking = false;

    const detectActiveCardInViewport = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const cards = document.querySelectorAll<HTMLElement>('[data-cardapio-card]');
          if (cards.length === 0) {
            ticking = false;
            return;
          }

          // Zona focal de leitura no celular (cerca de 42% da altura da tela)
          const viewportFocusY = window.innerHeight * 0.42;
          let closestId: string | null = null;
          let minDistance = Infinity;

          cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(cardCenterY - viewportFocusY);

            // Considera itens visíveis na tela do celular
            if (rect.bottom > 60 && rect.top < window.innerHeight - 60) {
              if (distance < minDistance) {
                minDistance = distance;
                closestId = card.getAttribute('data-product-id');
              }
            }
          });

          if (closestId) {
            setActiveMobileId(closestId);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    detectActiveCardInViewport();
    window.addEventListener('scroll', detectActiveCardInViewport, { passive: true });

    return () => {
      window.removeEventListener('scroll', detectActiveCardInViewport);
    };
  }, [filteredProducts, isTouchDevice]);

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 touch-manipulation">
      {/* Clean Hero Header */}
      <section className="border-b border-neutral-900 bg-neutral-950 py-8 sm:py-10 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-2.5">
          <div className="w-10 h-10 border border-neutral-700 bg-black flex items-center justify-center mx-auto">
            <Wine className="w-5 h-5 text-white stroke-[1.4]" />
          </div>

          <div>
            <h1 className="font-brand text-2xl sm:text-4xl font-bold tracking-[0.22em] text-white uppercase">
              HONORATO
            </h1>
            <p className="text-[10px] sm:text-xs tracking-[0.25em] text-neutral-400 uppercase mt-1">
              Drinkeria & Cocktail Bar
            </p>
          </div>

          <p className="text-[11px] sm:text-xs text-neutral-400">
            Cardápio exclusivo para consulta · Peça diretamente ao garçom
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Search & Categories Bar (Sticky no celular e desktop) */}
        <div className="space-y-2.5 sticky top-12 sm:top-14 z-30 bg-black/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar drink, ingrediente, destilado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-white cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Categories com suporte a rolagem touch suave */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs whitespace-nowrap transition-all border cursor-pointer select-none ${
                    active
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Counter and phone hint */}
        <div className="py-2.5 flex items-center justify-between text-[11px] sm:text-xs text-neutral-500">
          <span>{filteredProducts.length} opções disponíveis</span>
          <span className="sm:hidden text-neutral-500">Toque no card para ver receita</span>
        </div>

        {/* Product Cards */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 border border-neutral-900 bg-neutral-950 my-6">
            <GlassWater className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-300">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredProducts.map((prod) => {
              const isCardActive = isTouchDevice
                ? activeMobileId === prod.id
                : hoveredCardId === prod.id;

              return (
                <article
                  key={prod.id}
                  data-cardapio-card
                  data-product-id={prod.id}
                  onMouseEnter={() => !isTouchDevice && setHoveredCardId(prod.id)}
                  onMouseLeave={() => !isTouchDevice && setHoveredCardId(null)}
                  onClick={() => {
                    if (isTouchDevice) setActiveMobileId(prod.id);
                    setActiveModalProduct(prod);
                  }}
                  className={`group border bg-neutral-950 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden relative ${
                    isCardActive
                      ? 'border-neutral-400 ring-1 ring-white/20 shadow-xl shadow-black/80'
                      : 'border-neutral-850 hover:border-neutral-500'
                  }`}
                >
                  {/* Photo: no computador colore no hover do mouse; no celular colore no scroll focal */}
                  <div className="relative aspect-16/10 overflow-hidden bg-neutral-900">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className={`w-full h-full object-cover transition-all duration-500 ease-out ${
                        isCardActive
                          ? 'grayscale-0 scale-[1.04] contrast-105'
                          : 'grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 group-hover:contrast-105'
                      }`}
                      loading="lazy"
                    />

                    {/* Badge da categoria */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/85 backdrop-blur-sm border border-neutral-700 text-white text-[9px] uppercase tracking-wider px-2 py-0.5 font-medium">
                        {CATEGORY_LABELS[prod.category] || prod.category}
                      </span>
                    </div>

                    {/* Badge de Volume */}
                    {prod.volume && (
                      <div className="absolute bottom-2 left-2 text-[10px] text-neutral-300 bg-black/80 backdrop-blur-sm px-2 py-0.5 font-mono border border-neutral-800">
                        {prod.volume}
                      </div>
                    )}

                    {/* Indicador de esgotado */}
                    {!prod.isAvailable && (
                      <div className="absolute inset-0 bg-black/85 flex items-center justify-center">
                        <span className="border border-white/60 text-white text-[10px] uppercase px-2.5 py-1 font-semibold tracking-wider">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-editorial text-lg sm:text-xl font-bold text-white leading-tight">
                          {prod.name}
                        </h3>
                        {/* Preço em destaque */}
                        <span className="text-base sm:text-lg font-bold text-white font-mono shrink-0">
                          {formatPrice(prod.price)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400">
                        {prod.alcoholContent || ''}
                      </span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-1">
                        <span>Ver detalhes</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Minimal Footer */}
        <footer className="mt-14 pt-6 border-t border-neutral-900 text-center text-xs text-neutral-500 space-y-1">
          <p className="font-brand tracking-widest uppercase text-neutral-400">Honorato Drinkeria</p>
          <p>Aprecie com moderação · Venda proibida para menores de 18 anos.</p>
        </footer>
      </div>

      {/* Drink Detail Modal (Otimizado para Celular em tela cheia suave) */}
      {activeModalProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setActiveModalProduct(null)}
        >
          <div
            className="relative w-full max-w-md bg-neutral-950 border border-neutral-700 max-h-[92dvh] overflow-y-auto shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar com alvo de toque touch de 44px */}
            <button
              type="button"
              onClick={() => setActiveModalProduct(null)}
              className="absolute top-3 right-3 z-20 min-w-[40px] min-h-[40px] p-2 bg-black/85 border border-neutral-700 text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar detalhes"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Foto no modal em cores reais para o cliente ver o drink */}
            <div className="relative aspect-16/10 bg-neutral-900 overflow-hidden">
              <img
                src={activeModalProduct.imageUrl}
                alt={activeModalProduct.name}
                className="w-full h-full object-cover transition-all duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="bg-black/90 border border-neutral-700 text-white text-[10px] uppercase tracking-wider px-2 py-0.5 font-mono">
                  {CATEGORY_LABELS[activeModalProduct.category] || activeModalProduct.category}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white">
                    {activeModalProduct.name}
                  </h2>
                  <span className="text-lg sm:text-xl font-bold text-white font-mono shrink-0">
                    {formatPrice(activeModalProduct.price)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                  {activeModalProduct.description}
                </p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-neutral-800 text-xs text-neutral-400">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-neutral-500">Volume</span>
                  <span className="text-white font-medium">{activeModalProduct.volume || 'Dose'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-neutral-500">Teor Alcoólico</span>
                  <span className="text-white font-medium">{activeModalProduct.alcoholContent || 'N/A'}</span>
                </div>
              </div>

              {/* Ingredients */}
              {activeModalProduct.ingredients && activeModalProduct.ingredients.length > 0 && (
                <div className="text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                    Composição & Ingredientes:
                  </span>
                  <p className="text-neutral-300 leading-relaxed">
                    {activeModalProduct.ingredients.join(' · ')}
                  </p>
                </div>
              )}

              {/* Tasting notes */}
              {activeModalProduct.tastingNotes && (
                <div className="p-3 bg-neutral-900/90 text-xs italic text-neutral-300 border border-neutral-800 leading-relaxed">
                  "{activeModalProduct.tastingNotes}"
                </div>
              )}

              {/* Action buttons */}
              <button
                type="button"
                onClick={() => setActiveModalProduct(null)}
                className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Voltar ao Cardápio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
