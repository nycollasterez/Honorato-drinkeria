/**
 * Safe currency and number formatters for Honorato Drinkeria
 */
export const formatPrice = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return 'R$ 0,00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
