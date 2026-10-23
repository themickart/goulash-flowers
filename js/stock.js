/* ==========================================================================
   Виджет «Склад свежести» — управление остатками цветов
   ========================================================================== */

const FLOWERS = [
	{ name: 'Пионы', emoji: '🌸', shelf: 3, qty: 45, ordered: 80 },
	{ name: 'Розы красные', emoji: '🌹', shelf: 5, qty: 120, ordered: 200 },
	{ name: 'Тюльпаны', emoji: '🌷', shelf: 4, qty: 67, ordered: 100 },
	{ name: 'Хризантемы', emoji: '🌼', shelf: 6, qty: 88, ordered: 150 },
	{ name: 'Подсолнухи', emoji: '🌻', shelf: 5, qty: 34, ordered: 60 },
	{ name: 'Ромашки', emoji: '🌼', shelf: 4, qty: 55, ordered: 90 },
	{ name: 'Лаванда', emoji: '💜', shelf: 7, qty: 22, ordered: 40 },
	{ name: 'Ирисы', emoji: '💜', shelf: 3, qty: 41, ordered: 70 },
	{ name: 'Георгины', emoji: '🌸', shelf: 4, qty: 18, ordered: 30 },
	{ name: 'Анемоны', emoji: '🌸', shelf: 3, qty: 29, ordered: 50 },
];

const DAY_LABELS = ['сегодня', '+1 день', '+2 дня', '+3 дня', '+4 дня', '+5 дней'];

function getStatus(flower, day) {
	const remaining = flower.shelf - day;
	if (remaining <= 0) return 'write-off';
	if (remaining === 1) return 'today';
	if (remaining === 2) return 'tomorrow';
	return 'fresh';
}

const STATUS_COLORS = {
	fresh: '#b1ec52',
	tomorrow: '#ffd23f',
	today: '#ff4f93',
	'write-off': '#505050',
};
const STATUS_LABELS = {
	fresh: 'Свежие',
	tomorrow: 'Продать завтра',
	today: 'Продать сегодня',
	'write-off': 'К списанию',
};

export function initStock(widgetEl) {
	const listEl = widgetEl.querySelector('[data-stock-list]');
	const summaryEl = widgetEl.querySelector('[data-stock-summary]');
	const dayInput = widgetEl.querySelector('[data-stock-day]');
	const dayLabel = widgetEl.querySelector('[data-stock-day-label]');

	if (!listEl) return;

	function render(day) {
		let fresh = 0, total = 0, writeOff = 0;

		listEl.innerHTML = FLOWERS.map(f => {
			const status = getStatus(f, day);
			const color = STATUS_COLORS[status];
			const label = STATUS_LABELS[status];
			const qty = status === 'write-off' ? 0 : Math.max(0, f.qty - day * Math.floor(f.qty * 0.1));
			if (status !== 'write-off') { total += qty; if (status === 'fresh') fresh += qty; }
			else writeOff++;
			return `<div class="stock__row" data-freshness="${status}">
				<span class="stock__flower" aria-hidden="true">${f.emoji}</span>
				<span class="stock__details">
					<span class="stock__name">${f.name}</span>
					<span class="stock__sub">${status === 'write-off' ? 'Срок хранения истёк' : `Срок хранения: ещё ${f.shelf - day} дн.`}</span>
				</span>
				<span class="stock__qty">${qty} <small>шт.</small></span>
				<span class="stock__status"><span class="fresh__dot" style="background:${color}"></span>${label}</span>
			</div>`;
		}).join('');

		const writeOffPct = Math.round(writeOff / FLOWERS.length * 100);
		summaryEl.textContent = day === 0
			? `Итого: ${total} стеблей, всё свежее`
			: `Итого: ${total} стеблей · спишем ${writeOff} позиций (${writeOffPct}%)`;
	}

	function selectDay(day) {
		dayInput.value = day;
		const label = DAY_LABELS[day] || `+${day} дней`;
		if (dayLabel) dayLabel.textContent = label;
		dayInput.setAttribute('aria-valuetext', label);
		dayInput.style.setProperty('--range-progress', `${day / 5 * 100}%`);
		widgetEl.querySelectorAll('[data-stock-select]').forEach(btn => btn.setAttribute('aria-pressed', String(Number(btn.dataset.stockSelect) === day)));
		render(day);
	}
	dayInput?.addEventListener('input', () => selectDay(Number(dayInput.value)));
	widgetEl.querySelector('.stock-days__ticks')?.addEventListener('click', e => {
		const btn = e.target.closest('[data-stock-select]');
		if (btn) selectDay(Number(btn.dataset.stockSelect));
	});

	selectDay(0);
}
