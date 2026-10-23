/* ==========================================================================
   Секция «Пиковые дни» — таймер и таймлайн
   ========================================================================== */
const pad2 = n => String(n).padStart(2, '0');
const plural = (n, [one, few, many]) => {
	const a = Math.abs(n) % 100, b = a % 10;
	if (a > 10 && a < 20) return many;
	if (b > 1 && b < 5) return few;
	if (b === 1) return one;
	return many;
};

const HOLIDAYS = [
	{ id: 'march8', label: '8 марта', month: 2, day: 8, timeline: [
		{ when: 'За 3 недели', what: 'Открытие предзаказов', desc: 'Ограниченные слоты на 8 марта' },
		{ when: 'За 2 недели', what: 'Закупка материалов', desc: 'По прогнозу спроса из кабинета' },
		{ when: 'За 5 дней', what: 'Слоты закрыты', desc: 'Стоп-лист актуален везде' },
		{ when: '8 марта', what: 'Волновая доставка', desc: 'Курьеры уходят волнами с 6:00' },
	]},
	{ id: 'feb14', label: '14 февраля', month: 1, day: 14, timeline: [
		{ when: 'За 2 недели', what: 'Предзаказы открыты', desc: 'Клиенты выбирают слоты заранее' },
		{ when: 'За 3 дня', what: 'Push-напоминания', desc: 'Гуляш отправляет всем «поводникам»' },
		{ when: '13 февраля', what: 'Заготовка букетов', desc: 'Флористы работают с 7:00' },
		{ when: '14 февраля', what: 'Сюрпризы', desc: 'Курьер не звонит получателю' },
	]},
	{ id: 'sep1', label: '1 сентября', month: 8, day: 1, timeline: [
		{ when: 'За 10 дней', what: 'Запуск кампании', desc: 'Предзаказы для школьников' },
		{ when: 'За 3 дня', what: 'Закупка гладиолусов', desc: 'Традиционный цветок' },
		{ when: '31 августа', what: 'Ночная сборка', desc: 'Флористы с 18:00' },
		{ when: '1 сентября', what: 'Доставка 7:00–10:00', desc: 'Строго к первому звонку' },
	]},
];

export function initPeak(container) {
	const chipsEl = container.querySelector('[data-peak-chips]');
	const timelineEl = container.querySelector('[data-peak-timeline]');
	const cdD = container.querySelector('[data-cd="d"]');
	const cdH = container.querySelector('[data-cd="h"]');
	const cdM = container.querySelector('[data-cd="m"]');
	const ctaEl = container.querySelector('[data-peak-cta]');
	if (!chipsEl) return;

	let selected = HOLIDAYS[0];
	let timer = null;

	function renderHoliday(h) {
		selected = h;
		chipsEl.innerHTML = HOLIDAYS.map(hh =>
			`<button class="chip" type="button" aria-pressed="${hh.id === h.id}" data-hid="${hh.id}">${hh.label}</button>`
		).join('');
		if (timelineEl) {
			timelineEl.innerHTML = h.timeline.map(s =>
				`<li><span class="timeline__when">${s.when}</span><span class="timeline__what"><b>${s.what}</b>${s.desc}</span></li>`
			).join('');
		}
		if (ctaEl) ctaEl.dataset.ctaContext = `Хочу подготовиться к ${h.label}`;
		if (timer) clearInterval(timer);
		function tick() {
			const now = new Date();
			let t = new Date(now.getFullYear(), h.month, h.day);
			if (t <= now) t = new Date(now.getFullYear() + 1, h.month, h.day);
			const diff = t - now;
			const days = Math.floor(diff / 86400000);
			const hours = Math.floor((diff % 86400000) / 3600000);
			const mins = Math.floor((diff % 3600000) / 60000);
			if (cdD) cdD.textContent = pad2(days);
			if (cdH) cdH.textContent = pad2(hours);
			if (cdM) cdM.textContent = pad2(mins);
		}
		tick();
		timer = setInterval(tick, 60000);
	}

	chipsEl.addEventListener('click', e => {
		const btn = e.target.closest('[data-hid]');
		if (!btn) return;
		const h = HOLIDAYS.find(h => h.id === btn.dataset.hid);
		if (h) renderHoliday(h);
	});

	renderHoliday(HOLIDAYS[0]);
}
