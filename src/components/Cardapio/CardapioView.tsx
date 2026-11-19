import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { CATEGORY_LABELS, MENU_CATEGORIES_ORDER } from '../../data/initialData';
import {
  Search,
  Wine,
  Sparkles,
  X,
  GlassWater,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';

export const CardapioView: React.FC = () => {
  const { products, menuCoverImage, menuCoverFocalPoint } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Ordered categories list
  const categories = useMemo(() => {
    // 1. Autorais, 2. Contemporâneos, 3. Clássicos, 4. Sem Álcool, 5. Experiências
    const baseList: { key: string; label: string }[] = [
      { key: 'all', label: 'Todos' },
      ...MENU_CATEGORIES_ORDER.map((item) => {
        const key = typeof item === 'string' ? item : item.key;
        const label = typeof item === 'string' ? (CATEGORY_LABELS[item] || item) : item.label;
        return { key, label };
      }),
    ];

    // Preserved categories if products exist
    const otherKeys: ProductCategory[] = ['doses', 'cervejas', 'vinhos', 'petiscos'];
    if (Array.isArray(products)) {
      otherKeys.forEach((k) => {
        if (products.some((p) => p && p.category === k)) {
          baseList.push({
            key: k,
            label: CATEGORY_LABELS[k] || k,
          });
        }
      });
    }

    return baseList;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((item) => {
      if (!item) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name ? item.name.toLowerCase().includes(query) : false;
        const matchesDesc = item.description ? item.description.toLowerCase().includes(query) : false;
        const matchesIngredients = Array.isArray(item.ingredients)
          ? item.ingredients.some((ing) => (typeof ing === 'string' ? ing.toLowerCase().includes(query) : false))
          : typeof item.ingredients === 'string'
          ? (item.ingredients as string).toLowerCase().includes(query)
          : false;
        const matchesNotes = item.tastingNotes ? item.tastingNotes.toLowerCase().includes(query) : false;
        return matchesName || matchesDesc || matchesIngredients || matchesNotes;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-[#0c1122] text-[#f0f4fc] pb-24 touch-manipulation">
      {/* Hero Header (com suporte a imagem de capa customizada) */}
      <section className="relative border-b border-[#1f2945] bg-[#0e1529] py-8 sm:py-12 px-4 text-center overflow-hidden">
        {menuCoverImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={menuCoverImage}
              alt="Capa do Cardápio"
              className={`w-full h-full object-cover opacity-25 ${
                menuCoverFocalPoint === 'top'
                  ? 'object-top'
                  : menuCoverFocalPoint === 'bottom'
                  ? 'object-bottom'
                  : 'object-center'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c1122]/60 via-[#0e1529]/80 to-[#0c1122]" />
          </div>
        )}

        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl overflow-hidden border-2 border-[#ff5a1f] shadow-lg shadow-[#ff5a1f]/30">
            <img
              src="./logo.jpg"
              alt="Pompéia Drinkeria"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = './favicon.svg';
              }}
            />
          </div>

          <div>
            <h1 className="font-brand text-2xl sm:text-4xl font-bold tracking-[0.22em] text-white uppercase">
              POMPÉIA
            </h1>
            <p className="text-[10px] sm:text-xs tracking-[0.28em] text-[#ff5a1f] uppercase font-bold mt-1">
              Drinkeria & Cocktail Bar
            </p>
          </div>

          <p className="text-[11px] sm:text-xs text-neutral-400">
            Cardápio exclusivo para consulta · Peça diretamente ao garçom
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Search & Categories Bar (Faixa horizontal compacta com rolagem suave no celular) */}
        <div className="space-y-2.5 sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 bg-[#0c1122]/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-[#1f2945]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar drink, ingrediente, destilado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#13192f] border border-[#253257] pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-[#ff5a1f] rounded-lg transition-colors"
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

          {/* Categorias: faixa horizontal compacta com rolagem lateral no celular */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs whitespace-nowrap transition-all border cursor-pointer select-none rounded-md shrink-0 ${
                    active
                      ? 'bg-[#ff5a1f] text-white border-[#ff5a1f] font-bold shadow-md shadow-[#ff5a1f]/30'
                      : 'bg-[#13192f] text-neutral-300 border-[#253257] hover:text-white hover:border-[#ff5a1f]/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Counter and phone hint */}
        <div className="py-2.5 flex items-center justify-between text-[11px] sm:text-xs text-neutral-400">
          <span>{filteredProducts.length} opções disponíveis</span>
          <span className="sm:hidden text-orange-400/90 font-medium">Toque para ver detalhes</span>
        </div>

        {/* Product Cards Grid: 
            CELULAR: 2 colunas lado a lado (grid-cols-2), cards compactos
            COMPUTADOR: Layout original preservado (sm:grid-cols-2 lg:grid-cols-3)
        */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 border border-[#1f2945] bg-[#13192f] rounded-xl my-6">
            <GlassWater className="w-8 h-8 mx-auto text-neutral-500 mb-2" />
            <p className="text-sm text-neutral-300">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
            {filteredProducts.map((prod) => {
              const focalClass =
                prod.imageFocalPoint === 'top'
                  ? 'object-top'
                  : prod.imageFocalPoint === 'bottom'
                  ? 'object-bottom'
                  : 'object-center';

              return (
                <article
                  key={prod.id}
                  data-cardapio-card
                  data-product-id={prod.id}
                  onMouseEnter={() => setHoveredCardId(prod.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onClick={() => setActiveModalProduct(prod)}
                  className="group border border-[#1f2945] hover:border-[#ff5a1f]/70 bg-[#13192f] rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-lg hover:shadow-black/60"
                >
                  {/* Photo: Compact aspect ratio on mobile, original 16/10 on desktop */}
                  <div className="relative aspect-[4/3] sm:aspect-16/10 overflow-hidden bg-[#0c1122]">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${focalClass}`}
                      loading="lazy"
                    />

                    {/* Badge da categoria (compacto no celular) */}
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                      <span className="bg-[#0c1122]/90 backdrop-blur-sm border border-[#ff5a1f]/40 text-[#ff5a1f] text-[8px] sm:text-[9px] uppercase tracking-wider px-1.5 sm:px-2 py-0.5 font-bold rounded">
                        {CATEGORY_LABELS[prod.category] || prod.category}
                      </span>
                    </div>

                    {/* Badge de Volume */}
                    {prod.volume && (
                      <div className="hidden sm:block absolute bottom-2 left-2 text-[10px] text-neutral-300 bg-[#0c1122]/85 backdrop-blur-sm px-2 py-0.5 font-mono border border-[#1f2945] rounded">
                        {prod.volume}
                      </div>
                    )}

                    {/* Indicador de esgotado */}
                    {!prod.isAvailable && (
                      <div className="absolute inset-0 bg-[#0c1122]/90 flex items-center justify-center">
                        <span className="border border-[#ff5a1f] text-[#ff5a1f] text-[9px] sm:text-[10px] uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold tracking-wider rounded">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content: Compact padding and typography on mobile, spacious on desktop */}
                  <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-3">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-0.5 sm:gap-2">
                        <h3 className="font-editorial text-xs sm:text-lg lg:text-xl font-bold text-white leading-tight line-clamp-1 sm:line-clamp-none">
                          {prod.name}
                        </h3>
                        {/* Preço em destaque */}
                        <span className="text-xs sm:text-base lg:text-lg font-bold text-[#ff5a1f] font-mono shrink-0">
                          {formatPrice(prod.price)}
                        </span>
                      </div>

                      {/* Descrição: recolhida no celular para economizar tela, visível nos detalhes */}
                      <p className="hidden sm:block text-xs text-neutral-300 line-clamp-2 mt-1.5 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-1.5 sm:pt-2 border-t border-[#1f2945] flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="hidden sm:inline text-[11px] text-[#8ba7ff]">
                        {prod.alcoholContent || ''}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider group-hover:text-[#ff5a1f] transition-colors flex items-center gap-1 font-semibold w-full sm:w-auto justify-end">
                        <span>Ver detalhes</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Minimal Footer */}
        <footer className="mt-14 pt-6 border-t border-[#1f2945] text-center text-xs text-neutral-400 space-y-1">
          <p className="font-brand tracking-widest uppercase text-[#ff5a1f] font-bold">Pompéia Drinkeria</p>
          <p>Aprecie com moderação · Venda proibida para menores de 18 anos.</p>
        </footer>
      </div>

      {/* Drink Detail Modal (Ao tocar no celular, abre detalhes completos) */}
      {activeModalProduct && (
        <div
          className="fixed inset-0 z-50 bg-[#0c1122]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setActiveModalProduct(null)}
        >
          <div
            className="relative w-full max-w-md bg-[#13192f] border border-[#ff5a1f]/40 max-h-[92dvh] overflow-y-auto shadow-2xl my-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar com alvo de toque de 40px */}
            <button
              type="button"
              onClick={() => setActiveModalProduct(null)}
              className="absolute top-3 right-3 z-20 min-w-[40px] min-h-[40px] p-2 bg-[#0c1122]/90 border border-[#253257] text-white hover:border-[#ff5a1f] hover:text-[#ff5a1f] flex items-center justify-center transition-colors cursor-pointer rounded-full"
              aria-label="Fechar detalhes"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Foto ampliada com enquadramento preservado */}
            <div className="relative aspect-16/10 bg-[#0c1122] overflow-hidden rounded-t-2xl">
              <img
                src={activeModalProduct.imageUrl}
                alt={activeModalProduct.name}
                className={`w-full h-full object-cover ${
                  activeModalProduct.imageFocalPoint === 'top'
                    ? 'object-top'
                    : activeModalProduct.imageFocalPoint === 'bottom'
                    ? 'object-bottom'
                    : 'object-center'
                }`}
              />
              <div className="absolute top-3 left-3">
                <span className="bg-[#0c1122]/90 border border-[#ff5a1f]/50 text-[#ff5a1f] text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-bold rounded">
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
                  <span className="text-lg sm:text-xl font-bold text-[#ff5a1f] font-mono shrink-0">
                    {formatPrice(activeModalProduct.price)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                  {activeModalProduct.description}
                </p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-[#1f2945] text-xs text-neutral-300">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Volume / Taça</span>
                  <span className="text-white font-medium">{activeModalProduct.volume || 'Dose'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Teor Alcoólico</span>
                  <span className="text-white font-medium">{activeModalProduct.alcoholContent || 'N/A'}</span>
                </div>
              </div>

              {/* Ingredients */}
              {activeModalProduct.ingredients && (
                <div className="text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-[#ff5a1f] block tracking-wider">
                    Composição & Ingredientes:
                  </span>
                  <p className="text-neutral-200 leading-relaxed">
                    {Array.isArray(activeModalProduct.ingredients)
                      ? activeModalProduct.ingredients.join(' · ')
                      : String(activeModalProduct.ingredients)}
                  </p>
                </div>
              )}

              {/* Tasting notes */}
              {activeModalProduct.tastingNotes && (
                <div className="p-3 bg-[#0c1122]/90 text-xs italic text-neutral-300 border border-[#1f2945] rounded-lg leading-relaxed">
                  "{activeModalProduct.tastingNotes}"
                </div>
              )}

              {/* Action button */}
              <button
                type="button"
                onClick={() => setActiveModalProduct(null)}
                className="w-full py-3 bg-[#ff5a1f] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#ff6f3b] transition-colors cursor-pointer rounded-xl shadow-lg shadow-[#ff5a1f]/30"
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
