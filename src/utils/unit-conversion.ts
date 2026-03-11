
/**
 * Trata conversões de unidades de medida para cálculos de custo e estoque.
 * Padrão base: kg, g, l, ml, unidade.
 */

export const convertQuantity = (quantity: number, fromUnit: string, toUnit: string): number => {
    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();

    if (from === to) return quantity;

    // Peso
    if ((from === 'g' || from === 'gramas') && (to === 'kg' || to === 'quilo' || to === 'quilograma')) {
        return quantity / 1000;
    }
    if ((from === 'kg' || from === 'quilo' || from === 'quilograma') && (to === 'g' || to === 'gramas')) {
        return quantity * 1000;
    }

    // Volume
    if ((from === 'ml' || from === 'mililitros') && (to === 'l' || to === 'litro')) {
        return quantity / 1000;
    }
    if ((from === 'l' || from === 'litro') && (to === 'ml' || to === 'mililitros')) {
        return quantity * 1000;
    }

    // Se não souber converter, retorna o original (evita zerar o cálculo)
    return quantity;
};

export const calculateIngredientCost = (recipeQty: number, recipeUnit: string, stockPrice: number, stockUnit: string): number => {
    const convertedQty = convertQuantity(recipeQty, recipeUnit, stockUnit);
    return convertedQty * stockPrice;
};
