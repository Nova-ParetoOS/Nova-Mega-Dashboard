export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const parseCurrency = (str) => {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
};

export const getMonthName = (monthIndex) => {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return months[monthIndex - 1] || "";
};

export const roundToSpecial = (value) => {
    if (value <= 0) return 0;
    const thousands = Math.floor(value / 1000);
    const remainder = value % 1000;
    if (remainder === 0) return value; // exact thousand → keep (e.g. 20.000)
    if (remainder <= 900) return (thousands * 1000) + 900; // 001–900 → same milhar .900
    return ((thousands + 1) * 1000) + 900; // 901–999 → next milhar .900
};

export const normalizeStoreCode = (code) => {
    if (!code) return '';
    const str = String(code).toUpperCase().replace(/LOJA\s*/g, '').trim();
    return str.replace(/^0+(?=\d)/, '');
};
