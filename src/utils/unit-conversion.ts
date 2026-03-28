
/**
 * Trata conversões de unidades de medida para cálculos de custo e estoque.
 * Padrão base: kg, g, l, ml, unidade.
 */

export const convertQuantity = (quantity: number, fromUnit: string, toUnit: string): number => {
    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();

    if (from === to) return quantity;

    // Peso
    const isGram = from === 'g' || from === 'gramas' || from === 'grama';
    const isKg = from === 'kg' || from === 'quilo' || from === 'quilograma' || from === 'quilogramas';
    const toGram = to === 'g' || to === 'gramas' || to === 'grama';
    const toKg = to === 'kg' || to === 'quilo' || to === 'quilograma' || to === 'quilogramas';

    if (isGram && toKg) return quantity / 1000;
    if (isKg && toGram) return quantity * 1000;

    // Volume
    const isMl = from === 'ml' || from === 'mililitros' || from === 'mililitro';
    const isL = from === 'l' || from === 'litro' || from === 'litros';
    const toMl = to === 'ml' || to === 'mililitros' || to === 'mililitro';
    const toL = to === 'l' || to === 'litro' || to === 'litros';

    if (isMl && toL) return quantity / 1000;
    if (isL && toMl) return quantity * 1000;

    // Unidades
    const isUnid = from === 'unid' || from === 'unidade' || from === 'unidades';
    const toUnid = to === 'unid' || to === 'unidade' || to === 'unidades';
    if (isUnid && toUnid) return quantity;

    // Se não souber converter, retorna o original (evita zerar o cálculo)
    return quantity;
};

export const calculateIngredientCost = (recipeQty: number, recipeUnit: string, stockPrice: number, stockUnit: string): number => {
    const convertedQty = convertQuantity(recipeQty, recipeUnit, stockUnit);
    return convertedQty * stockPrice;
};
