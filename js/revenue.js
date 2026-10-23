const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const money = value => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

export function initRevenue(container) {
    if (!container) return;
    const inputs = [...container.querySelectorAll('[data-revenue-input]')];
    const ranges = [...container.querySelectorAll('[data-revenue-range]')];
    const extra = container.querySelector('[data-revenue-extra]');
    const added = container.querySelector('[data-revenue-added]');
    const base = container.querySelector('[data-revenue-base]');
    const formula = container.querySelector('[data-revenue-formula]');
    const error = container.querySelector('[data-revenue-error]');
    const cta = container.querySelector('[data-revenue-cta]');
    let growth = 10;

    function update() {
        ranges.forEach(range => {
            const input = inputs.find(item => item.dataset.revenueInput === range.dataset.revenueRange);
            const value = input.valueAsNumber;
            if (!Number.isFinite(value)) return;
            const min = Number(range.min), max = Number(range.max);
            range.value = Math.max(min, Math.min(max, value));
            range.style.setProperty('--fill', `${(Number(range.value) - min) / (max - min) * 100}%`);
            range.setAttribute('aria-valuetext', `${number.format(value)}${range.dataset.revenueRange === 'check' ? ' ₽' : ''}${value > max ? ', точное значение задано в поле' : ''}`);
        });
        const valid = inputs.map(input => {
            const ok = input.value !== '' && input.checkValidity();
            input.setAttribute('aria-invalid', String(!ok));
            return ok;
        }).every(Boolean);
        error.hidden = valid;
        if (!valid) {
            extra.textContent = '—';
            added.textContent = '—';
            base.textContent = '—';
            formula.textContent = 'Заказы: 0–10 000 · чек: 0–1 000 000 ₽ · точки: 1–1 000';
            cta.dataset.ctaContext = 'Хочу обсудить потенциал выручки моего магазина';
            return;
        }
        const values = Object.fromEntries(inputs.map(input => [input.dataset.revenueInput, Number(input.value)]));
        const current = values.orders * values.check * values.locations * 30;
        const increase = current * growth / 100;
        extra.textContent = `+${money(increase)}`;
        added.textContent = number.format(values.orders * values.locations * 30 * growth / 100);
        base.textContent = money(current);
        formula.textContent = `${number.format(values.orders)} зак./день × ${money(values.check)} × ${values.locations} точ. × 30 дней × ${growth}%`;
        cta.dataset.ctaContext = `Расчёт: ${values.orders} зак./день на точку, чек ${money(values.check)}, точек ${values.locations}. Сценарий +${growth}%: +${money(increase)} за 30 дней.`;
    }
    inputs.forEach(input => input.addEventListener('input', update));
    ranges.forEach(range => range.addEventListener('input', () => {
        const input = inputs.find(item => item.dataset.revenueInput === range.dataset.revenueRange);
        input.value = range.value;
        update();
    }));
    container.querySelector('[data-revenue-growth]').addEventListener('click', event => {
        const button = event.target.closest('[data-growth]');
        if (!button) return;
        growth = Number(button.dataset.growth);
        container.querySelectorAll('[data-growth]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        update();
    });
    update();
}
