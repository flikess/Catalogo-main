export const BUSINESS_TYPES = [
    { id: 'confeitaria', label: '🍰 Confeitaria' },
    { id: 'salgados', label: '🥟 Salgados para festas' },
    { id: 'personalizados_festa', label: '🎨 Personalizados para festas' },
    { id: 'artesanato', label: '🧶 Artesanato' },
    { id: 'roupas', label: '👗 Loja de roupas / moda' },
    { id: 'lanchonete', label: '🍔 Lanchonete / hamburgueria' },
    { id: 'cosmeticos', label: '💄 Cosméticos e beleza' },
    { id: 'suplementos', label: '💊 Suplementos' },
    { id: 'joias', label: '💍 Joias e semijoias' },
    { id: 'petshop', label: '🐶 Pet shop' },
    { id: 'presentes', label: '🎁 Presentes personalizados' },
    { id: 'moveis', label: '🛋️ Móveis e decoração' },
    { id: 'geral', label: '🛍️ Loja geral' },
] as const;

export type BusinessTypeId = typeof BUSINESS_TYPES[number]['id'];

export interface BusinessConfig {
    sizeLabel: string;
    sizePlaceholder: string;
    variationLabel: string;
    variationPlaceholder: string;
    variationOptionPlaceholder: string;
    additionalLabel: string;
    productNamePlaceholder: string;
}

export const BUSINESS_CONFIGS: Record<BusinessTypeId, BusinessConfig> = {
    confeitaria: {
        sizeLabel: 'Tamanhos / Pesos',
        sizePlaceholder: 'Ex: Aro 15, 1kg, 20 fatias',
        variationLabel: 'Variações (ex: Massas, Recheios fixos)',
        variationPlaceholder: 'Ex: Massa',
        variationOptionPlaceholder: 'Ex: Chocolate',
        additionalLabel: 'Adicionais / Coberturas',
        productNamePlaceholder: 'Ex: Bolo de Chocolate Belga',
    },
    salgados: {
        sizeLabel: 'Tamanhos / Unidades',
        sizePlaceholder: 'Ex: Centro (100 un), Meio centro (50 un)',
        variationLabel: 'Variações (ex: Tipo de frito/assado)',
        variationPlaceholder: 'Ex: Opção',
        variationOptionPlaceholder: 'Ex: Frito na hora',
        additionalLabel: 'Adicionais / Molhos',
        productNamePlaceholder: 'Ex: Coxinha de Frango com Catupiry',
    },
    personalizados_festa: {
        sizeLabel: 'Dimensões / Kits',
        sizePlaceholder: 'Ex: Kit 10 un, 20x30cm',
        variationLabel: 'Personalização (ex: Tema, Papel)',
        variationPlaceholder: 'Ex: Tema',
        variationOptionPlaceholder: 'Ex: Jardim Encantado',
        additionalLabel: 'Adicionais / Acabamentos',
        productNamePlaceholder: 'Ex: Caixa Milk Luxo',
    },
    artesanato: {
        sizeLabel: 'Tamanhos / Medidas',
        sizePlaceholder: 'Ex: 20cm, Grande, Único',
        variationLabel: 'Variações (ex: Cores, Materiais)',
        variationPlaceholder: 'Ex: Cor',
        variationOptionPlaceholder: 'Ex: Cru',
        additionalLabel: 'Adicionais / Embalagem para presente',
        productNamePlaceholder: 'Ex: Amigurumi Ursinho de Crochê',
    },
    roupas: {
        sizeLabel: 'Tamanhos / Numeração',
        sizePlaceholder: 'Ex: P, M, G, 42',
        variationLabel: 'Variações (ex: Cor, Estampa)',
        variationPlaceholder: 'Ex: Cor',
        variationOptionPlaceholder: 'Ex: Azul Marinho',
        additionalLabel: 'Adicionais / Embalagens',
        productNamePlaceholder: 'Ex: Camiseta Oversized Algodão',
    },
    lanchonete: {
        sizeLabel: 'Tamanhos / Porções',
        sizePlaceholder: 'Ex: 300ml, 500ml, Combo',
        variationLabel: 'Variações (ex: Ponto da carne, Tipo de pão)',
        variationPlaceholder: 'Ex: Ponto da carne',
        variationOptionPlaceholder: 'Ex: Ao ponto',
        additionalLabel: 'Adicionais / Ingredientes extras',
        productNamePlaceholder: 'Ex: Burger Duplo com Cheddar',
    },
    cosmeticos: {
        sizeLabel: 'Volumetria / Tamanhos',
        sizePlaceholder: 'Ex: 30ml, 100ml, Refil',
        variationLabel: 'Variações (ex: Fragrância, Tom de pele)',
        variationPlaceholder: 'Ex: Fragrância',
        variationOptionPlaceholder: 'Ex: Lavanda',
        additionalLabel: 'Adicionais / Brindes',
        productNamePlaceholder: 'Ex: Sérum Facial Vitamina C',
    },
    suplementos: {
        sizeLabel: 'Pesos / Unidades',
        sizePlaceholder: 'Ex: 900g, 2kg, 60 cápsulas',
        variationLabel: 'Variações (ex: Sabor)',
        variationPlaceholder: 'Ex: Sabor',
        variationOptionPlaceholder: 'Ex: Baunilha',
        additionalLabel: 'Adicionais',
        productNamePlaceholder: 'Ex: Whey Protein Isolado',
    },
    joias: {
        sizeLabel: 'Tamanhos / Comprimento',
        sizePlaceholder: 'Ex: Aro 18, 45cm',
        variationLabel: 'Variações (ex: Banho, Pedra)',
        variationPlaceholder: 'Ex: Banho',
        variationOptionPlaceholder: 'Ex: Ouro 18k',
        additionalLabel: 'Adicionais / Garantia estendida',
        productNamePlaceholder: 'Ex: Colar Ponto de Luz Prata 925',
    },
    petshop: {
        sizeLabel: 'Tamanhos / Pesos',
        sizePlaceholder: 'Ex: P, 10kg, Unidade',
        variationLabel: 'Variações (ex: Sabor, Raça)',
        variationPlaceholder: 'Ex: Sabor',
        variationOptionPlaceholder: 'Ex: Carne e Vegetais',
        additionalLabel: 'Adicionais',
        productNamePlaceholder: 'Ex: Ração Premium Adulto',
    },
    presentes: {
        sizeLabel: 'Tamanhos / Modelos',
        sizePlaceholder: 'Ex: Standard, Premium, Luxo',
        variationLabel: 'Personalização (ex: Mensagem, Foto)',
        variationPlaceholder: 'Opção',
        variationOptionPlaceholder: 'Ex: Com foto',
        additionalLabel: 'Adicionais / Itens extras',
        productNamePlaceholder: 'Ex: Cesta de Café da Manhã Especial',
    },
    moveis: {
        sizeLabel: 'Dimensões / Medidas',
        sizePlaceholder: 'Ex: 1.20m x 0.80m',
        variationLabel: 'Acabamentos (ex: Madeira, Tecido)',
        variationPlaceholder: 'Ex: Acabamento',
        variationOptionPlaceholder: 'Ex: Carvalho',
        additionalLabel: 'Adicionais / Montagem',
        productNamePlaceholder: 'Ex: Mesa de Jantar Retangular',
    },
    geral: {
        sizeLabel: 'Tamanhos / Opções',
        sizePlaceholder: 'Ex: P, M, G / Único',
        variationLabel: 'Variações',
        variationPlaceholder: 'Variação',
        variationOptionPlaceholder: 'Opção',
        additionalLabel: 'Adicionais',
        productNamePlaceholder: 'Nome do produto',
    },
};

export const getBusinessTypeLabel = (id: string) => {
    return BUSINESS_TYPES.find(t => t.id === id)?.label || 'Não definido';
};

export const getBusinessTypeIcon = (id: string) => {
    // Agora o ícone está dentro da string do label no início (ex: '🍰 Confeitaria')
    const label = getBusinessTypeLabel(id);
    const emojiMatch = label.match(/^\p{Emoji_Presentation}/u) || label.match(/^\p{Emoji}/u);
    return emojiMatch ? emojiMatch[0] : '🛍️';
};

export const getBusinessConfig = (id: string | null | undefined): BusinessConfig => {
    if (!id || !BUSINESS_CONFIGS[id as BusinessTypeId]) {
        return BUSINESS_CONFIGS.geral;
    }
    return BUSINESS_CONFIGS[id as BusinessTypeId];
};
