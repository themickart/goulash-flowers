/* ==========================================================================
   Виджет «Мастерская» — очередь сборки с канбан-досккой
   ========================================================================== */

const CHANNELS = [
	{ id: 'all', label: 'Все' },
	{ id: 'site', label: 'Сайт' },
	{ id: 'tg', label: 'Telegram' },
	{ id: 'wa', label: 'WhatsApp' },
	{ id: 'call', label: 'Звонок' },
];

const PRODUCTS = [
	'Пионы 15 шт', 'Розы 25 шт', 'Тюльпаны 21 шт', 'Ромашки, букет',
	'Монобукет лаванда', 'Хризантемы 11 шт', 'Подсолнухи 9 шт',
	'Георгины 13 шт', 'Анемоны 19 шт', 'Ирисы 7 шт',
];

const NAMES = ['Андреев А.', 'Соколова М.', 'Иванов Д.', 'Лебедева Е.', 'Петров К.',
	'Смирнова О.', 'Кузьмин Р.', 'Волкова Н.', 'Тихонов И.', 'Зайцева Ю.'];

let _seed = 42;
function rand() {
	_seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
	return ((_seed >>> 0) / 0xffffffff);
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

let nextId = 1800;
let orders = [];
let filterCh = 'all';

const COLS = [
	{ id: 'queue', title: 'В очереди' },
	{ id: 'assembly', title: 'Сборка' },
	{ id: 'ready', title: 'Готово / Выдано' },
];

function makeOrder() {
	const channels = ['site', 'tg', 'wa', 'call'];
	const ch = pick(channels);
	const h = 16 + Math.floor(rand() * 4);
	const m = Math.floor(rand() * 60);
	const time = `${h}:${String(m).padStart(2, '0')}`;
	return {
		id: nextId++,
		channel: ch,
		product: pick(PRODUCTS),
		client: pick(NAMES),
		time,
		col: 'queue',
		startedAt: Date.now() - Math.floor(rand() * 900000),
	};
}

function seedOrders() {
	const counts = { queue: 3, assembly: 2, ready: 3 };
	for (const [col, n] of Object.entries(counts)) {
		for (let i = 0; i < n; i++) {
			const o = makeOrder();
			o.col = col;
			if (col === 'assembly') o.assemblyStart = Date.now() - Math.floor(rand() * 60000);
			if (col === 'ready') o.completedAt = Date.now();
			orders.push(o);
		}
	}
}

function elapsed(o) {
	const secs = Math.floor((Date.now() - o.startedAt) / 1000);
	const m = Math.floor(secs / 60), s = secs % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

// Прогресс сборки: заказ в assembly идёт 90 секунд
const ASSEMBLY_MS = 90000;

function assemblyProgress(o) {
	if (o.col !== 'assembly') return 0;
	const elapsed = Date.now() - (o.assemblyStart || o.startedAt);
	return Math.min(1, elapsed / ASSEMBLY_MS);
}

function render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime) {
	const visible = filterCh === 'all' ? orders : orders.filter(o => o.channel === filterCh);

	// filters
	filtersEl.innerHTML = CHANNELS.map(ch => {
		const cnt = ch.id === 'all' ? orders.length : orders.filter(o => o.channel === ch.id).length;
		const pressed = ch.id === filterCh;
		return `<button class="chip" type="button" data-ch="${ch.id}" aria-pressed="${pressed}">${ch.label}<span class="chip__count">${cnt}</span></button>`;
	}).join('');

	// board
	boardEl.innerHTML = COLS.map(col => {
		const colOrders = visible.filter(o => o.col === col.id);
		return `<div class="col">
			<div class="col__title">${col.title} <span style="font-weight:400">(${colOrders.length})</span></div>
			${colOrders.length === 0 ? '<div class="col__empty">Пусто</div>' : ''}
			${colOrders.map(o => {
				const prog = assemblyProgress(o);
				const isDone = col.id === 'ready';
				const isNew = o._isNew;
				const stage = COLS.findIndex(c => c.id === o.col);
				const status = stage === 0 ? 'Принят · ждёт флориста' : stage === 1 ? 'Флорист собирает букет' : 'Готов к выдаче';
				const action = stage === 0 ? 'Нажмите, чтобы начать сборку' : stage === 1 ? 'Нажмите, чтобы завершить сборку' : 'Сборка завершена';
				return `<button type="button" class="order-card order-card--${o.col}${isNew ? ' order-card--new' : ''}" data-order-id="${o.id}" ${isDone ? 'disabled' : ''} aria-label="Заказ ${o.id}. ${status}. ${action}">
					<div class="order-card__num">#${o.id}</div>
					<div class="order-card__title">${o.product}</div>
					<div class="order-card__meta">${o.client} · к ${o.time}</div>
					<span class="order-card__tag order-card__tag--${o.channel}">${CHANNELS.find(c => c.id === o.channel)?.label || o.channel}</span>
					<div class="order-card__status"><span></span>${status}</div>
					<ol class="order-card__timeline" aria-label="Этапы заказа">
						${['Принят', 'Сборка', 'Готов'].map((label, i) => `<li class="${i < stage ? 'is-done' : i === stage ? 'is-current' : ''}" ${i === stage ? 'aria-current="step"' : ''}><span></span>${label}</li>`).join('')}
					</ol>
					${col.id === 'assembly' ? `
						<div class="order-card__progress-label">Прогресс сборки <span data-order-percent>${Math.round(prog * 100)}%</span></div>
						<div class="order-card__progress" role="progressbar" aria-label="Сборка заказа ${o.id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog * 100)}">
							<div class="order-card__progress-fill" style="width:${Math.round(prog * 100)}%"></div>
						</div>` : ''}
					<span class="order-card__action">${isDone ? '✓ ' : '→ '}${action}</span>
				</button>`;
			}).join('')}
		</div>`;
	}).join('');

	// kpis
	const inWork = orders.filter(o => o.col !== 'ready').length;
	const readyOrders = orders.filter(o => o.col === 'ready');
	const avgMs = readyOrders.length > 0
		? readyOrders.reduce((s, o) => s + (o.completedAt - o.startedAt), 0) / readyOrders.length
		: 0;
	const avgMin = Math.round(avgMs / 60000);

	if (kpiActive) kpiActive.textContent = inWork;
	if (kpiAvg) kpiAvg.textContent = avgMin > 0 ? `${avgMin} мин` : '—';
	if (kpiOntime) kpiOntime.textContent = readyOrders.length ? `${Math.round(readyOrders.filter(o => o.completedAt - o.startedAt <= 900000).length / readyOrders.length * 100)}%` : '—';
}

export function initWorkshop(widgetEl) {
	const boardEl = widgetEl.querySelector('[data-ws-board]');
	const filtersEl = widgetEl.querySelector('[data-ws-filters]');
	const addBtn = widgetEl.querySelector('[data-ws-add]');
	// поддержка и старого .kpi__value и нового .demo-kpi__val
	const kpiActive = widgetEl.querySelector('[data-ws-kpi="active"]');
	const kpiAvg = widgetEl.querySelector('[data-ws-kpi="avg"]');
	const kpiOntime = widgetEl.querySelector('[data-ws-kpi="ontime"]');

	if (!boardEl) return;

	seedOrders();
	render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
	const message = widgetEl.querySelector('[data-ws-message]');
	boardEl.addEventListener('click', e => {
		const card = e.target.closest('[data-order-id]');
		const order = orders.find(o => o.id === Number(card?.dataset.orderId));
		if (!order || order.col === 'ready') return;
		if (order.col === 'queue') {
			order.col = 'assembly';
			order.assemblyStart = Date.now();
		} else {
			order.col = 'ready';
			order.completedAt = Date.now();
		}
		render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
		if (message) message.textContent = `Заказ #${order.id}: ${order.col === 'assembly' ? 'в сборке. Линия показывает текущий этап и прогресс.' : 'собран и готов к выдаче.'}`;
		boardEl.querySelector(`[data-order-id="${order.id}"]:not(:disabled)`)?.focus({ preventScroll: true });
	});

	filtersEl.addEventListener('click', e => {
		const btn = e.target.closest('[data-ch]');
		if (!btn) return;
		filterCh = btn.dataset.ch;
		render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
	});

	addBtn?.addEventListener('click', () => {
		const o = makeOrder();
		o.startedAt = Date.now();
		o._isNew = true;
		filterCh = 'all';
		orders.unshift(o);
		render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
		const newCard = boardEl.querySelector(`[data-order-id="${o.id}"]`);
		newCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		newCard?.focus({ preventScroll: true });
		if (message) message.textContent = `Заказ #${o.id} принят. Нажмите на карточку, чтобы начать сборку.`;
		// убираем флаг "новый" после анимации
		setTimeout(() => { o._isNew = false; }, 400);
		// через 8 сек переходит в сборку
		setTimeout(() => {
			const o2 = orders.find(x => x.id === o.id);
			if (o2 && o2.col === 'queue') {
				o2.col = 'assembly';
				o2.assemblyStart = Date.now();
				render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
			}
		}, 8000);
	});

	// auto-advance: queue → assembly (каждые 25 сек, медленно)
	setInterval(() => {
		const q = orders.filter(o => o.col === 'queue');
		if (q.length > 0) {
			const o = q[0]; // самый старый
			o.col = 'assembly';
			o.assemblyStart = Date.now();
			render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
		}
	}, 25000);

	// assembly → ready (через 90 сек после перехода в сборку)
	setInterval(() => {
		const now = Date.now();
		const a = orders.filter(o => o.col === 'assembly' && now - (o.assemblyStart || 0) >= ASSEMBLY_MS);
		if (a.length > 0) {
			a[0].col = 'ready';
			a[0].completedAt = now;
			render(boardEl, filtersEl, kpiActive, kpiAvg, kpiOntime);
		}
	}, 5000);

	// обновление прогресс-баров сборки каждые 3 сек (без полного перерисовывания DOM)
	setInterval(() => {
		const assemblyCards = orders.filter(o => o.col === 'assembly');
		assemblyCards.forEach(o => {
			const el = boardEl.querySelector(`[data-order-id="${o.id}"] .order-card__progress-fill`);
			if (el) {
				const p = assemblyProgress(o);
				el.style.width = `${Math.round(p * 100)}%`;
				el.parentElement.setAttribute('aria-valuenow', Math.round(p * 100));
				const percent = el.closest('.order-card').querySelector('[data-order-percent]');
				if (percent) percent.textContent = `${Math.round(p * 100)}%`;
				if (p >= 1) el.classList.add('is-done');
			}
		});
	}, 3000);
}
