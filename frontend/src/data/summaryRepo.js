import API from '../api/api';

const defaults = {
    balance: 4250,
    income: 3200,
    credit: 450,
};

export async function getSummary() {
    try {
        const res = await API.get('/summary');
        if (!res?.summary || typeof res.summary !== 'object') return defaults;
        return {
            balance: Number(res.summary.balance ?? defaults.balance),
            income: Number(res.summary.income ?? defaults.income),
            credit: Number(res.summary.credit ?? defaults.credit),
        };
    } catch {
        return defaults;
    }
}

export async function setSummary(next) {
    const payload = {
        balance: Number(next.balance ?? defaults.balance),
        income: Number(next.income ?? defaults.income),
        credit: Number(next.credit ?? defaults.credit),
    };
    const res = await API.put('/summary', payload);
    if (!res?.summary) return payload;
    return {
        balance: Number(res.summary.balance ?? payload.balance),
        income: Number(res.summary.income ?? payload.income),
        credit: Number(res.summary.credit ?? payload.credit),
    };
}
