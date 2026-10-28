import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, BottleItem, RecipeIngredient } from '../../types';
import { CATEGORY_LABELS } from '../../data/initialData';
import {
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Wine,
  Layers,
  Droplet,
} from 'lucide-react';
import { ImageUploader } from '../Common/ImageUploader';

export const EstoqueView: React.FC = () => {
  const {
    products,
    bottles,
    saveProduct,
    toggleProductAvailability,
    deleteProduct,
    openNewSealedBottle,
    addSealedBottles,
    saveBottle,
    deleteBottle,
    resetToDefaults,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'garrafas' | 'produtos'>('garrafas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bottleCategoryFilter, setBottleCategoryFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Bottle modal state
  const [isBottleModalOpen, setIsBottleModalOpen] = useState<boolean>(false);
  const [editingBottle, setEditingBottle] = useState<BottleItem | null>(null);
  const [bottleFormData, setBottleFormData] = useState<{
    name: string;
    category: 'destilado' | 'licor' | 'vermute' | 'bitter' | 'vinho' | 'xarope' | 'cerveja' | 'insumo';
    bottleCapacityMl: string;
    openBottleCurrentMl: string;
    sealedBottlesCount: string;
    minBottlesAlert: string;
    costPerBottle: string;
  }>({
    name: '',
    category: 'destilado',
    bottleCapacityMl: '750',
    openBottleCurrentMl: '750',
    sealedBottlesCount: '3',
    minBottlesAlert: '1',
    costPerBottle: '100.00',
  });

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<{
    name: string;
    category: ProductCategory;
    description: string;
    ingredientsStr: string;
    tastingNotes: string;
    volume: string;
    alcoholContent: string;
    price: string;
    stock: string;
    minStockAlert: string;
    unit: 'un' | 'dose' | 'garrafa' | 'porcao';
    imageUrl: string;
    isAvailable: boolean;
    recipeIngredients: { bottleId: string; mlPerDrink: number }[];
  }>({
    name: '',
    category: 'autorais',
    description: '',
    ingredientsStr: '',
    tastingNotes: '',
    volume: '200ml',
    alcoholContent: '18% ABV',
    price: '38.00',
    stock: '25',
    minStockAlert: '5',
    unit: 'un',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    recipeIngredients: [],
  });

  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Low bottle alerts
  const lowBottles = useMemo(() => {
    return bottles.filter(
      (b) =>
        (b.openBottleCurrentMl / b.bottleCapacityMl) < 0.3 ||
        b.sealedBottlesCount <= b.minBottlesAlert
    );
  }, [bottles]);

  // Filtered bottles list
  const filteredBottles = useMemo(() => {
    return bottles.filter((b) => {
      if (bottleCategoryFilter !== 'all' && b.category !== bottleCategoryFilter) return false;
      if (onlyLowStock) {
        const isLow =
          (b.openBottleCurrentMl / b.bottleCapacityMl) < 0.3 ||
          b.sealedBottlesCount <= b.minBottlesAlert;
        if (!isLow) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [bottles, bottleCategoryFilter, onlyLowStock, searchQuery]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (onlyLowStock && p.stock > p.minStockAlert) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, onlyLowStock, searchQuery]);

  // Bottle Handlers
  const handleOpenNewBottleModal = () => {
    setEditingBottle(null);
    setBottleFormData({
      name: '',
      category: 'destilado',
      bottleCapacityMl: '750',
      openBottleCurrentMl: '750',
      sealedBottlesCount: '3',
      minBottlesAlert: '1',
      costPerBottle: '100.00',
    });
    setIsBottleModalOpen(true);
  };

  const handleOpenEditBottleModal = (b: BottleItem) => {
    setEditingBottle(b);
    setBottleFormData({
      name: b.name,
      category: b.category,
      bottleCapacityMl: b.bottleCapacityMl.toString(),
      openBottleCurrentMl: b.openBottleCurrentMl.toString(),
      sealedBottlesCount: b.sealedBottlesCount.toString(),
      minBottlesAlert: b.minBottlesAlert.toString(),
      costPerBottle: (b.costPerBottle || 0).toString(),
    });
    setIsBottleModalOpen(true);
  };

  const handleSaveBottleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottleFormData.name.trim()) return;

    const capacity = parseInt(bottleFormData.bottleCapacityMl, 10) || 750;
    const openMl = Math.min(capacity, parseInt(bottleFormData.openBottleCurrentMl, 10) || capacity);

    const b: BottleItem = {
      id: editingBottle ? editingBottle.id : `bot-${Date.now()}`,
      name: bottleFormData.name.trim(),
      category: bottleFormData.category,
      bottleCapacityMl: capacity,
      openBottleCurrentMl: openMl,
      sealedBottlesCount: Math.max(0, parseInt(bottleFormData.sealedBottlesCount, 10) || 0),
      minBottlesAlert: Math.max(0, parseInt(bottleFormData.minBottlesAlert, 10) || 1),
      costPerBottle: parseFloat(bottleFormData.costPerBottle.replace(',', '.')) || 0,
      unitLabel: 'ml',
    };

    saveBottle(b);
    setIsBottleModalOpen(false);
  };

  // Product Handlers
  const handleOpenNewProductModal = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      category: 'autorais',
      description: '',
      ingredientsStr: '',
      tastingNotes: '',
      volume: '200ml',
      alcoholContent: '18% ABV',
      price: '38.00',
      stock: '25',
      minStockAlert: '5',
      unit: 'un',
      imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      recipeIngredients: bottles.length > 0 ? [{ bottleId: bottles[0].id, mlPerDrink: 50 }] : [],
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProductFormData({
      name: prod.name,
      category: prod.category,
      description: prod.description,
      ingredientsStr: prod.ingredients ? prod.ingredients.join(', ') : '',
      tastingNotes: prod.tastingNotes || '',
      volume: prod.volume || '',
      alcoholContent: prod.alcoholContent || '',
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      minStockAlert: prod.minStockAlert.toString(),
      unit: prod.unit,
      imageUrl: prod.imageUrl,
      isAvailable: prod.isAvailable,
      recipeIngredients: prod.recipeIngredients
        ? prod.recipeIngredients.map((r) => ({ bottleId: r.bottleId, mlPerDrink: r.mlPerDrink }))
        : [],
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name.trim()) return;

    const formattedRecipe: RecipeIngredient[] = productFormData.recipeIngredients
      .filter((r) => r.bottleId && r.mlPerDrink > 0)
      .map((r) => {
        const bottleObj = bottles.find((b) => b.id === r.bottleId);
        return {
          bottleId: r.bottleId,
          bottleName: bottleObj ? bottleObj.name : 'Insumo',
          mlPerDrink: r.mlPerDrink,
        };
      });

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: productFormData.name.trim(),
      category: productFormData.category,
      description: productFormData.description.trim(),
      ingredients: productFormData.ingredientsStr
        ? productFormData.ingredientsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      recipeIngredients: formattedRecipe.length > 0 ? formattedRecipe : undefined,
      tastingNotes: productFormData.tastingNotes.trim() || undefined,
      volume: productFormData.volume.trim() || undefined,
      alcoholContent: productFormData.alcoholContent.trim() || undefined,
      price: parseFloat(productFormData.price.replace(',', '.')) || 0,
      stock: parseInt(productFormData.stock, 10) || 0,
      minStockAlert: parseInt(productFormData.minStockAlert, 10) || 0,
      unit: productFormData.unit,
      imageUrl:
        productFormData.imageUrl.trim() ||
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
      isAvailable: productFormData.isAvailable,
    };

    saveProduct(newProd);
    setIsProductModalOpen(false);
  };

  const handleAddRecipeIngredientRow = () => {
    if (bottles.length === 0) return;
    setProductFormData((prev) => ({
      ...prev,
      recipeIngredients: [...prev.recipeIngredients, { bottleId: bottles[0].id, mlPerDrink: 50 }],
    }));
  };

  const handleUpdateRecipeRow = (index: number, field: 'bottleId' | 'mlPerDrink', value: any) => {
    setProductFormData((prev) => {
      const updated = [...prev.recipeIngredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, recipeIngredients: updated };
    });
  };

  const handleRemoveRecipeRow = (index: number) => {
    setProductFormData((prev) => ({
      ...prev,
      recipeIngredients: prev.recipeIngredients.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h1 className="font-editorial text-2xl font-bold text-white">
              Estoque & Bar
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Garrafas, dosagens e rendimento
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'garrafas' ? (
              <button
                onClick={handleOpenNewBottleModal}
                className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Garrafa</span>
              </button>
            ) : (
              <button
                onClick={handleOpenNewProductModal}
                className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Drink</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal KPI Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 space-y-0.5">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Rótulos
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {bottles.length}
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 space-y-0.5">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Em Reserva (Lacradas)
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {bottles.reduce((acc, b) => acc + b.sealedBottlesCount, 0)} un
            </span>
          </div>

          <div
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`border p-3 sm:p-4 space-y-0.5 cursor-pointer transition-colors ${
              lowBottles.length > 0
                ? 'bg-neutral-900 border-white'
                : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                Críticas (&lt;30%)
              </span>
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {lowBottles.length}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-800 space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('garrafas')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'garrafas'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Garrafas no Bar ({bottles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('produtos')}
            className={`py-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'produtos'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Drinks & Fichas ({products.length})</span>
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="bg-neutral-950 border border-neutral-800 p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={
                activeTab === 'garrafas'
                  ? 'Buscar garrafa (Gin, Bourbon, Vermute...)'
                  : 'Buscar drink...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <label className="flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-900 border border-neutral-700 px-2.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="rounded-none bg-black border-neutral-700 text-white"
              />
              <span>Só Críticos</span>
            </label>

            <button
              onClick={() => {
                if (confirm('Restaurar estoque e produtos para o padrão inicial?')) {
                  resetToDefaults();
                }
              }}
              className="px-2.5 py-1.5 border border-neutral-800 text-neutral-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
              title="Restaurar padrão"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restaurar</span>
            </button>
          </div>
        </div>

        {/* TAB 1: GARRAFAS NO BAR */}
        {activeTab === 'garrafas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBottles.map((b) => {
              const pct = Math.round((b.openBottleCurrentMl / b.bottleCapacityMl) * 100);
              const isEnding = pct < 30 && pct > 0;
              const isEmpty = pct === 0;
              const isHalf = pct >= 30 && pct < 70;

              // Drinks that consume this bottle
              const consumingProducts = products.filter((p) =>
                p.recipeIngredients?.some((r) => r.bottleId === b.id)
              );

              return (
                <div
                  key={b.id}
                  className="bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition-all p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Bottle Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider block font-mono">
                          {b.category} · {b.bottleCapacityMl}ml
                        </span>
                        <h3 className="font-editorial text-base font-bold text-white leading-tight">
                          {b.name}
                        </h3>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border ${
                          isEmpty
                            ? 'border-white bg-black text-white'
                            : isEnding
                            ? 'border-white bg-white text-black'
                            : isHalf
                            ? 'border-neutral-700 bg-neutral-900 text-neutral-300'
                            : 'border-neutral-700 bg-neutral-900 text-white'
                        }`}
                      >
                        {isEmpty
                          ? 'Vazia'
                          : isEnding
                          ? 'Acabando'
                          : isHalf
                          ? 'Metade'
                          : 'Cheia'}
                      </span>
                    </div>

                    {/* Level Gauge */}
                    <div className="p-2.5 bg-neutral-900 border border-neutral-800 space-y-1.5">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-neutral-400 text-[11px]">Bancada:</span>
                        <span className="font-mono font-bold text-white text-xs">
                          {b.openBottleCurrentMl}ml / {b.bottleCapacityMl}ml ({pct}%)
                        </span>
                      </div>

                      <div className="w-full bg-black border border-neutral-700 h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isEnding ? 'bg-white' : 'bg-neutral-300'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-neutral-400 pt-0.5">
                        <span>
                          Resta: ~<strong className="text-white">{Math.floor(b.openBottleCurrentMl / 50)}</strong> doses
                        </span>
                        <span>
                          Total: ~<strong className="text-white">{Math.floor(b.bottleCapacityMl / 50)}</strong> doses
                        </span>
                      </div>
                    </div>

                    {/* Reserve Stock Row */}
                    <div className="p-2 bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block">Reserva</span>
                        <span className="font-mono font-bold text-white text-xs">
                          {b.sealedBottlesCount} fechadas
                        </span>
                      </div>

                      {b.sealedBottlesCount > 0 ? (
                        <button
                          onClick={() => openNewSealedBottle(b.id)}
                          className="px-2 py-1 border border-neutral-700 hover:border-white text-[10px] font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
                        >
                          Abrir
                        </button>
                      ) : (
                        <span className="text-[9px] text-white font-bold bg-neutral-800 px-1.5 py-0.5 border border-white">
                          Zerada
                        </span>
                      )}
                    </div>

                    {/* Drinks using this bottle */}
                    {consumingProducts.length > 0 && (
                      <div className="text-[10px] text-neutral-400 flex flex-wrap gap-1 items-center pt-0.5">
                        <span className="text-neutral-500">Usa em:</span>
                        {consumingProducts.slice(0, 3).map((p) => {
                          const ing = p.recipeIngredients?.find((r) => r.bottleId === b.id);
                          return (
                            <span
                              key={p.id}
                              className="px-1 py-0.2 border border-neutral-800 bg-neutral-900 text-neutral-300"
                            >
                              {p.name} ({ing?.mlPerDrink}ml)
                            </span>
                          );
                        })}
                        {consumingProducts.length > 3 && (
                          <span className="text-neutral-500">+{consumingProducts.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => addSealedBottles(b.id, 1)}
                        className="px-2 py-1 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-white cursor-pointer"
                      >
                        +1 un
                      </button>
                      <button
                        onClick={() => addSealedBottles(b.id, 6)}
                        className="px-2 py-1 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-white cursor-pointer"
                      >
                        +6 cx
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditBottleModal(b)}
                        className="p-1 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir ${b.name}?`)) deleteBottle(b.id);
                        }}
                        className="p-1 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: PRODUTOS & FICHAS */}
        {activeTab === 'produtos' && (
          <div className="bg-neutral-950 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="p-3">Drink / Item</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Ficha Técnica</th>
                  <th className="p-3">Rendimento / Garrafa</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-9 h-9 object-cover border border-neutral-700 grayscale shrink-0"
                        />
                        <div>
                          <span className="font-semibold text-white block text-xs">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {CATEGORY_LABELS[prod.category]}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-white text-xs">
                      {formatPrice(prod.price)}
                    </td>

                    {/* Recipe */}
                    <td className="p-3">
                      {prod.recipeIngredients && prod.recipeIngredients.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {prod.recipeIngredients.map((r) => (
                            <span
                              key={r.bottleId}
                              className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white font-mono"
                            >
                              {r.bottleName}: {r.mlPerDrink}ml
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-[10px]">
                          Sem baixa em garrafa
                        </span>
                      )}
                    </td>

                    {/* Calculated Yield */}
                    <td className="p-3">
                      {prod.recipeIngredients && prod.recipeIngredients.length > 0 ? (
                        <div className="space-y-0.5 text-[10px]">
                          {prod.recipeIngredients.map((r) => {
                            const b = bottles.find((bot) => bot.id === r.bottleId);
                            const yieldCount = b
                              ? Math.floor(b.bottleCapacityMl / Math.max(1, r.mlPerDrink))
                              : 0;
                            return (
                              <span key={r.bottleId} className="block text-neutral-300">
                                Garrafa faz <strong className="text-white font-mono">{yieldCount} drinks</strong>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-neutral-400 font-mono text-xs">
                          {prod.stock} un
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <button
                        onClick={() => toggleProductAvailability(prod.id)}
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                          prod.isAvailable
                            ? 'bg-neutral-900 border-neutral-700 text-white'
                            : 'bg-black border-neutral-800 text-neutral-500'
                        }`}
                      >
                        {prod.isAvailable ? 'Ativo' : 'Esgotado'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditProductModal(prod)}
                          className="p-1 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir ${prod.name}?`)) deleteProduct(prod.id);
                          }}
                          className="p-1 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA / EDITAR GARRAFA */}
      {isBottleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-700 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <h2 className="font-editorial text-lg font-bold text-white">
                {editingBottle ? 'Editar Garrafa' : 'Nova Garrafa no Bar'}
              </h2>
              <button
                onClick={() => setIsBottleModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBottleForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Nome da Garrafa / Marca
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gin Tanqueray, Bourbon Bulleit..."
                  value={bottleFormData.name}
                  onChange={(e) => setBottleFormData({ ...bottleFormData, name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Categoria
                  </label>
                  <select
                    value={bottleFormData.category}
                    onChange={(e) =>
                      setBottleFormData({ ...bottleFormData, category: e.target.value as any })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                  >
                    <option value="destilado">Destilado</option>
                    <option value="licor">Licor</option>
                    <option value="vermute">Vermute</option>
                    <option value="bitter">Bitter</option>
                    <option value="vinho">Vinho / Espumante</option>
                    <option value="xarope">Xarope</option>
                    <option value="insumo">Insumo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Capacidade da Garrafa (ml)
                  </label>
                  <input
                    type="number"
                    placeholder="750"
                    value={bottleFormData.bottleCapacityMl}
                    onChange={(e) =>
                      setBottleFormData({ ...bottleFormData, bottleCapacityMl: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Nível Atual na Bancada (ml)
                  </label>
                  <input
                    type="number"
                    value={bottleFormData.openBottleCurrentMl}
                    onChange={(e) =>
                      setBottleFormData({ ...bottleFormData, openBottleCurrentMl: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Garrafas Lacradas (Reserva)
                  </label>
                  <input
                    type="number"
                    value={bottleFormData.sealedBottlesCount}
                    onChange={(e) =>
                      setBottleFormData({ ...bottleFormData, sealedBottlesCount: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBottleModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR DRINK & RECEITA */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-700 w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <h2 className="font-editorial text-lg font-bold text-white">
                {editingProduct ? 'Editar Drink' : 'Novo Drink & Ficha Técnica'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Nome do Drink
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Negroni Honorato"
                    value={productFormData.name}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, name: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Categoria
                  </label>
                  <select
                    value={productFormData.category}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                  >
                    <option value="autorais">Autorais</option>
                    <option value="classicos">Clássicos</option>
                    <option value="doses">Doses</option>
                    <option value="cervejas">Cervejas</option>
                    <option value="vinhos">Vinhos</option>
                    <option value="sem_alcool">Sem Álcool</option>
                    <option value="petiscos">Petiscos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Coquetel equilibrado, amargo e aromático"
                  value={productFormData.description}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, description: e.target.value })
                  }
                  className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="38.00"
                    value={productFormData.price}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, price: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Volume / Taça
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 200ml, Dose"
                    value={productFormData.volume}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, volume: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 p-2 text-white"
                  />
                </div>
              </div>

              {/* Ficha Técnica & Baixa de Garrafas */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-white" />
                    <span>Ficha Técnica (Baixa Automática na Garrafa)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddRecipeIngredientRow}
                    className="px-2 py-1 bg-white text-black font-bold uppercase tracking-wider text-[10px] hover:bg-neutral-200 cursor-pointer"
                  >
                    + Adicionar Insumo
                  </button>
                </div>

                {productFormData.recipeIngredients.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">
                    Nenhuma garrafa vinculada. O drink não dará baixa em ml.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {productFormData.recipeIngredients.map((row, idx) => {
                      const bottle = bottles.find((b) => b.id === row.bottleId);
                      const yieldCount = bottle
                        ? Math.floor(bottle.bottleCapacityMl / Math.max(1, row.mlPerDrink))
                        : 0;

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-neutral-950 p-2 border border-neutral-800"
                        >
                          <select
                            value={row.bottleId}
                            onChange={(e) =>
                              handleUpdateRecipeRow(idx, 'bottleId', e.target.value)
                            }
                            className="flex-1 bg-neutral-900 border border-neutral-700 p-1.5 text-white text-xs"
                          >
                            {bottles.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.bottleCapacityMl}ml)
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={row.mlPerDrink}
                              onChange={(e) =>
                                handleUpdateRecipeRow(
                                  idx,
                                  'mlPerDrink',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-16 bg-neutral-900 border border-neutral-700 p-1.5 text-white font-mono text-xs text-right"
                            />
                            <span className="text-[10px] text-neutral-400">ml</span>
                          </div>

                          <span className="text-[10px] font-mono text-neutral-400 px-1">
                            (~{yieldCount} drinks/garrafa)
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeRow(idx)}
                            className="p-1 text-neutral-500 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Foto do Drink */}
              <ImageUploader
                value={productFormData.imageUrl}
                onChange={(dataUrl) =>
                  setProductFormData({ ...productFormData, imageUrl: dataUrl })
                }
              />

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 cursor-pointer"
                >
                  Salvar Drink
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
