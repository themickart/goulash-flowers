/* ==========================================================================
   Goulash.tech для цветочных магазинов — интерактив лендинга.
   Всё на чистом JS: данные выдуманы, но каждое действие меняет экран.
   ========================================================================== */

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rub = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
const rubShort = (n) =>
	n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} млн ₽` : rub(Math.round(n / 1000) * 1000);
const plural = (n, [one, few, many]) => {
	const a = Math.abs(n) % 100;
	const b = a % 10;
	if (a > 10 && a < 20) return many;
	if (b > 1 && b < 5) return few;
	if (b === 1) return one;
	return many;
};
const pad = (n) => String(n).padStart(2, '0');

// детерминированный генератор — карта одинаковая при каждом открытии
function mulberry32(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* --- toast --------------------------------------------------------------- */

const toaster = $('[data-toaster]');
let toastTimer;
function toast(text) {
	toaster.textContent = text;
	toaster.classList.add('is-shown');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toaster.classList.remove('is-shown'), 2600);
}

/* --- шапка ----------------------------------------------------------------- */

(() => {
	const header = $('[data-header]');
	const burger = $('[data-burger]');
	const close = () => {
		header.classList.remove('is-open');
		burger.setAttribute('aria-expanded', 'false');
	};
	burger.addEventListener('click', () => {
		const open = !header.classList.contains('is-open');
		header.classList.toggle('is-open', open);
		burger.setAttribute('aria-expanded', String(open));
	});
	$$('.nav a').forEach((a) => a.addEventListener('click', close));
	const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();
	document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
})();

/* ==========================================================================
   LED-табло в герое: пиксельные цветы вместо пиццы и роллов
   ========================================================================== */

const LED_COLORS = {
	p: '#ff4f93',
	P: '#b8195a',
	r: '#ff3355',
	R: '#a3123a',
	y: '#ffd23f',
	g: '#b1ec52',
	G: '#5f9e2a',
	w: '#fff1f6',
	k: '#d9a066',
	K: '#9c6634',
	c: '#00ffff',
};

const SPRITES = {
	tulip: [
		'................',
		'......p...p.....',
		'.....pp.p.pp....',
		'.....ppppppp....',
		'.....pPppPpp....',
		'.....ppPpPpp....',
		'.....ppppppp....',
		'......ppppp.....',
		'.......ppp......',
		'........g.......',
		'..gg....g...gg..',
		'..ggg...g..ggg..',
		'...ggg..g.ggg...',
		'....gggggggg....',
		'......gggg......',
		'........g.......',
	],
	rose: [
		'................',
		'......rrrr......',
		'.....rRRrrr.....',
		'....rrRrrRrr....',
		'....rRrRRrRr....',
		'....rrRrrRrr....',
		'.....rrRRrr.....',
		'......rrrr......',
		'........g.......',
		'....gg..g.......',
		'...gggg.g.......',
		'....gg..g..gg...',
		'........g.gggg..',
		'........g..gg...',
		'........g.......',
		'........g.......',
	],
	bouquet: [
		'................',
		'...pp....ww.....',
		'..pyyp..wyyw....',
		'..pyyp..wyyw.pp.',
		'...pp.pp.ww.pyyp',
		'..g..pyyp...pyyp',
		'..gg.pyyp..g.pp.',
		'...gg.pp..gg....',
		'..kkkkkkkkkkkk..',
		'...kkkkkkkkkk...',
		'...kkKkkkkKkk...',
		'....kkkPPkkk....',
		'.....kkPPkk.....',
		'.....kkkkkk.....',
		'......kkkk......',
		'.......kk.......',
	],
	bike: [
		'................',
		'................',
		'................',
		'...pp.pp........',
		'..pyypyyp.......',
		'...ppgpp........',
		'..kkkkkkk.......',
		'..kkkkkkk..ww...',
		'..kkKKkkk...w...',
		'...c.......c....',
		'...ccccccccc....',
		'..www.c..c.www..',
		'.w...wc..cw...w.',
		'.w.c.w.cc.w.c.w.',
		'.w...w....w...w.',
		'..www......www..',
	],
};

function ledSign(canvas, mode) {
	const ctx = canvas.getContext('2d');
	// 32 светодиода по ширине, по высоте — сколько поместится в экран;
	// спрайт 16×16 рисуется квадратами 2×2 и центрируется по вертикали
	const N = 32;
	const pitch = canvas.width / N;
	const ROWS = Math.round(canvas.height / pitch);
	const oy0 = Math.floor((ROWS - N) / 2);
	const r = pitch * 0.34;
	const off = '#1d1d21';

	const spriteGrid = (sprite, dx = 0) => {
		const grid = Array.from({ length: ROWS }, () => Array(N).fill(null));
		sprite.forEach((row, y) => {
			for (let x = 0; x < 16; x++) {
				const c = LED_COLORS[row[x]];
				if (!c) continue;
				for (let oy = 0; oy < 2; oy++)
					for (let ox = 0; ox < 2; ox++) {
						const gx = x * 2 + ox + dx;
						if (gx >= 0 && gx < N) grid[oy0 + y * 2 + oy][gx] = c;
					}
			}
		});
		return grid;
	};

	const draw = (grid, alphaAt = () => 1) => {
		ctx.fillStyle = '#0b0b0c';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < N; x++) {
				const cx = (x + 0.5) * pitch;
				const cy = (y + 0.5) * pitch;
				const c = grid[y][x];
				const a = c ? alphaAt(x, y) : 0;
				ctx.globalAlpha = 1;
				ctx.fillStyle = off;
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.fill();
				if (a > 0) {
					// мягкое свечение + ядро диода
					ctx.globalAlpha = a * 0.28;
					ctx.fillStyle = c;
					ctx.beginPath();
					ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = a;
					ctx.beginPath();
					ctx.arc(cx, cy, r, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		ctx.globalAlpha = 1;
	};

	if (mode === 'courier') {
		if (reducedMotion) return draw(spriteGrid(SPRITES.bike));
		// курьер проезжает по табло слева направо
		let x = -32;
		let last = 0;
		const tick = (t) => {
			if (t - last > 70) {
				last = t;
				x = x >= 32 ? -32 : x + 1;
				draw(spriteGrid(SPRITES.bike, x));
			}
			requestAnimationFrame(tick);
		};
		return requestAnimationFrame(tick);
	}

	// цветы «распускаются» снизу вверх, затем меняются
	const order = ['tulip', 'bouquet', 'rose'];
	if (reducedMotion) return draw(spriteGrid(SPRITES.tulip));
	const rand = mulberry32(7);
	const delays = Array.from({ length: ROWS }, (_, y) => Array.from({ length: N }, () => (ROWS - y) / ROWS + rand() * 0.18));
	let idx = 0;
	let start = performance.now();
	let grid = spriteGrid(SPRITES[order[0]]);
	const GROW = 1300;
	const HOLD = 2600;
	const FADE = 450;
	const frame = (t) => {
		const e = t - start;
		if (e < GROW) {
			const p = e / GROW;
			draw(grid, (x, y) => Math.min(1, Math.max(0, (p * 1.2 - delays[y][x]) * 6)));
		} else if (e < GROW + HOLD) {
			draw(grid);
		} else if (e < GROW + HOLD + FADE) {
			draw(grid, () => 1 - (e - GROW - HOLD) / FADE);
		} else {
			idx = (idx + 1) % order.length;
			grid = spriteGrid(SPRITES[order[idx]]);
			start = t;
		}
		requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
}

$$('canvas[data-led]').forEach((c) => ledSign(c, c.dataset.led));

// Гомография: прямоугольник canvas → четырёхугольник экрана на рендере.
// Координаты data-quad — в пикселях рендера шириной 1200.
function homography(src, dst) {
	const A = [];
	src.forEach(([x, y], i) => {
		const [u, v] = dst[i];
		A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
		A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
	});
	// метод Гаусса для системы 8×8
	for (let c = 0; c < 8; c++) {
		let p = c;
		for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
		[A[c], A[p]] = [A[p], A[c]];
		for (let r = 0; r < 8; r++) {
			if (r === c) continue;
			const f = A[r][c] / A[c][c];
			for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
		}
	}
	const [a, b, cc, d, e, f, g, h] = A.map((row, i) => row[8] / row[i]);
	return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${cc},${f},0,1)`;
}

(() => {
	const sign = $('.sign');
	if (!sign) return;
	const screens = $$('[data-quad]', sign).map((el) => {
		const canvas = $('canvas', el);
		const w = canvas.width;
		const h = canvas.height;
		el.style.width = `${w}px`;
		el.style.height = `${h}px`;
		const quad = el.dataset.quad.split(' ').map((p) => p.split(',').map(Number));
		return { el, matrix: homography([[0, 0], [w, 0], [w, h], [0, h]], quad) };
	});
	const fit = () => {
		const s = sign.clientWidth / 1200;
		screens.forEach(({ el, matrix }) => (el.style.transform = `scale(${s}) ${matrix}`));
	};
	new ResizeObserver(fit).observe(sign);
	fit();
})();

/* ==========================================================================
   Пиковые даты: герой + обратный отсчёт
   ========================================================================== */

const PEAKS = [
	{ id: 'feb14', name: '14 февраля', gen: '14 февраля', date: (y) => new Date(y, 1, 14) },
	{ id: 'mar8', name: '8 марта', gen: '8 марта', date: (y) => new Date(y, 2, 8) },
	{ id: 'sep1', name: '1 сентября', gen: '1 сентября', date: (y) => new Date(y, 8, 1) },
	{
		id: 'mom',
		name: 'День матери',
		gen: 'Дня матери',
		// последнее воскресенье ноября
		date: (y) => {
			const d = new Date(y, 10, 30);
			d.setDate(30 - d.getDay());
			return d;
		},
	},
];

function nextDate(peak, now = new Date()) {
	let d = peak.date(now.getFullYear());
	if (d < now) d = peak.date(now.getFullYear() + 1);
	return d;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const fmtDay = (d) => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

(() => {
	const now = new Date();
	const sorted = [...PEAKS].sort((a, b) => nextDate(a, now) - nextDate(b, now));
	const nearest = sorted[0];
	const daysTo = (p) => Math.ceil((nextDate(p, now) - now) / 864e5);

	// полоса праздников внизу героя: ближайший — первым и подсвечен
	$('[data-peakstrip]').innerHTML = sorted
		.map((p, i) => {
			const d = daysTo(p);
			const note = i === 0 ? `<small>${d > 21 ? 'успеете подключиться' : 'экспресс-запуск'}</small>` : '';
			return `<li><a class="peakstrip__item${i === 0 ? ' is-next' : ''}" href="#peak" data-strip-peak="${p.id}">
				<span class="peakstrip__num pixel">${d}</span>
				<span class="peakstrip__label">${plural(d, ['день', 'дня', 'дней'])} до ${p.gen}${note}</span>
			</a></li>`;
		})
		.join('');
	$('[data-peakstrip]').addEventListener('click', (e) => {
		const link = e.target.closest('[data-strip-peak]');
		if (link) $(`[data-peak="${link.dataset.stripPeak}"]`)?.click();
	});

	// секция «Пиковый день»
	const chipsWrap = $('[data-peaks]');
	const timeline = $('[data-peak-timeline]');
	let current = nearest.id;

	chipsWrap.innerHTML = PEAKS.map(
		(p) => `<button class="chip" type="button" data-peak="${p.id}" aria-pressed="${p.id === current}">${p.name}</button>`
	).join('');

	const renderTimeline = (peak) => {
		const d = nextDate(peak);
		const steps = [
			[addDays(d, -21), 'Открываем предзаказ', 'Клиенты выбирают букет и окно доставки заранее. Предоплата снижает отказы.'],
			[addDays(d, -7), 'Считаем мощность', `Гуляш сравнивает предзаказы с силами мастерской и курьеров и закрывает слоты, которые вы не потянете.`],
			[addDays(d, -1), 'Собираем к выезду', 'Очередь мастерской строится по времени выезда, а не по времени заказа. Букеты не вянут в ожидании.'],
			[d, 'Возим волнами', 'Курьеры получают готовые маршруты по районам, клиенты видят курьера на карте.'],
			['year', 'Возвращаем клиента', 'За 3 дня до следующего праздника каждый получает напоминание с прошлым букетом.'],
		];
		timeline.innerHTML = steps
			.map(
				([date, title, text]) =>
					`<li><span class="timeline__when">${date === 'year' ? 'Через год' : fmtDay(date)}</span><span class="timeline__what"><b>${title}</b>${text}</span></li>`
			)
			.join('');
	};

	const renderCountdown = () => {
		const peak = PEAKS.find((p) => p.id === current);
		const diff = Math.max(0, nextDate(peak) - new Date());
		$('[data-cd="d"]').textContent = Math.floor(diff / 864e5);
		$('[data-cd="h"]').textContent = Math.floor((diff % 864e5) / 36e5);
		$('[data-cd="m"]').textContent = Math.floor((diff % 36e5) / 6e4);
	};

	chipsWrap.addEventListener('click', (e) => {
		const btn = e.target.closest('[data-peak]');
		if (!btn) return;
		current = btn.dataset.peak;
		$$('[data-peak]', chipsWrap).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
		renderTimeline(PEAKS.find((p) => p.id === current));
		renderCountdown();
		renderCta();
	});

	const cta = $('[data-peak-cta]');
	const renderCta = () => {
		const peak = PEAKS.find((p) => p.id === current);
		cta.firstChild.textContent = `Подготовиться к ${peak.gen} `;
		cta.dataset.ctaContext = `Подготовка к ${peak.gen}`;
	};

	renderTimeline(nearest);
	renderCountdown();
	renderCta();
	setInterval(renderCountdown, 20000);
})();

/* ==========================================================================
   Ролик: HTML-оверлеи синхронизированы со временем видео
   ========================================================================== */

(() => {
	const root = $('[data-film]');
	const video = $('[data-film-video]');
	const timeEl = $('[data-film-time]');
	const toastEl = $('[data-film-toast]');
	const playBtn = $('[data-film-play]');
	const chaptersWrap = $('[data-chapters]');

	// at — начало сцены в секундах исходного 16-секундного ролика
	const SCENES = [
		{ at: 0, chapter: 'Заказ', title: 'Заказ принят', text: 'Пионы, 15 шт · к 20:00 · сюрприз', icon: 'i-bag', clock: [0, 2] },
		{ at: 3.5, chapter: 'Мастерская', title: 'Собран за 12 минут', text: 'Флорист Ольга · букет в очереди был первым', icon: 'i-flower', clock: [2, 14] },
		{ at: 7.5, chapter: 'Курьер', title: 'Курьер в пути', text: 'Маршрут построен · 3,2 км · будет в 19:58', icon: 'i-bike', clock: [14, 44] },
		{ at: 11, chapter: 'Вручение', title: 'Доставлено вовремя', text: 'Отправитель получил фото вручения', icon: 'i-door', clock: [44, 47] },
	];

	chaptersWrap.innerHTML = SCENES.map(
		(s, i) =>
			`<button class="chapter" type="button" data-chapter="${i}"><span class="chapter__time pixel">${pad(s.clock[0])}:00</span><span class="chapter__title">${s.chapter}</span></button>`
	).join('');
	const chapterBtns = $$('[data-chapter]', chaptersWrap);

	let useVideo = true;
	let virtualT = 0; // секунды, если видео ещё нет
	let virtualPlaying = !reducedMotion;
	const VIRTUAL_DUR = 16;
	let lastScene = -1;

	const duration = () => (useVideo && video.duration && isFinite(video.duration) ? video.duration : VIRTUAL_DUR);
	const currentTime = () => (useVideo ? video.currentTime : virtualT);
	const isPlaying = () => (useVideo ? !video.paused : virtualPlaying);

	const setPlayIcon = () => {
		const playing = isPlaying();
		playBtn.innerHTML = `<svg aria-hidden="true"><use href="#${playing ? 'i-pause' : 'i-play'}"/></svg>`;
		playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть');
	};

	const render = () => {
		const dur = duration();
		const t = ((currentTime() % dur) / dur) * VIRTUAL_DUR;
		let i = SCENES.length - 1;
		while (i > 0 && t < SCENES[i].at) i--;
		const end = SCENES[i + 1]?.at ?? VIRTUAL_DUR;
		const p = (t - SCENES[i].at) / (end - SCENES[i].at);
		const s = SCENES[i];
		const minutes = s.clock[0] + (s.clock[1] - s.clock[0]) * p;
		const totalSec = Math.floor(minutes * 60);
		timeEl.textContent = `${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}`;

		chapterBtns.forEach((b, j) => {
			b.classList.toggle('is-active', j === i);
			b.style.setProperty('--p', j < i ? 1 : j === i ? p : 0);
		});

		if (i !== lastScene) {
			lastScene = i;
			toastEl.classList.add('is-swapping');
			setTimeout(() => {
				$('[data-film-title]').textContent = s.title;
				$('[data-film-text]').textContent = s.text;
				$('[data-film-icon]').innerHTML = `<svg aria-hidden="true"><use href="#${s.icon}"/></svg>`;
				toastEl.classList.remove('is-swapping');
			}, 220);
		}
	};

	let prev = performance.now();
	const loop = (now) => {
		const dt = (now - prev) / 1000;
		prev = now;
		if (!useVideo && virtualPlaying) virtualT = (virtualT + dt) % VIRTUAL_DUR;
		render();
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);

	const fallback = () => {
		if (!useVideo) return;
		useVideo = false;
		// video.hidden = true;
		const fb = $('[data-film-fallback]');
		fb.hidden = false;
		fb.textContent = 'Ролик скоро появится. Пока посмотрите, как меняются статусы заказа.';
		setPlayIcon();
	};
	video.addEventListener('error', fallback, true);
	$('source', video)?.addEventListener('error', fallback);

	playBtn.addEventListener('click', () => {
		if (useVideo) {
			video.paused ? video.play() : video.pause();
		} else {
			virtualPlaying = !virtualPlaying;
		}
		userPaused = !isPlaying();
		setPlayIcon();
	});
	video.addEventListener('play', setPlayIcon);
	video.addEventListener('pause', setPlayIcon);

	chaptersWrap.addEventListener('click', (e) => {
		const b = e.target.closest('[data-chapter]');
		if (!b) return;
		const t = (SCENES[Number(b.dataset.chapter)].at / VIRTUAL_DUR) * duration() + 0.05;
		if (useVideo) {
			video.currentTime = t;
			video.play().catch(() => {});
		} else {
			virtualT = t;
			virtualPlaying = true;
		}
		setPlayIcon();
	});

	// играем, только когда ролик на экране
	let userPaused = reducedMotion;
	new IntersectionObserver(
		([entry]) => {
			if (!useVideo) return;
			if (entry.isIntersecting && !userPaused) video.play().catch(() => {});
			else video.pause();
		},
		{ threshold: 0.35 }
	).observe(root);
	setPlayIcon();
})();

/* ==========================================================================
   Вкладки кабинета
   ========================================================================== */

const panelHooks = {};
let selectTab = () => {};
(() => {
	const tabs = $$('[data-tab]');
	const select = (name, focus = false) => {
		tabs.forEach((t) => {
			const on = t.dataset.tab === name;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			if (on && focus) t.focus();
		});
		$$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
		$$('[data-side]').forEach((s) => s.classList.toggle('is-active', s.dataset.side === name));
		panelHooks[name]?.();
	};
	tabs.forEach((t, i) => {
		t.addEventListener('click', () => select(t.dataset.tab));
		t.addEventListener('keydown', (e) => {
			const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
			if (!dir) return;
			e.preventDefault();
			select(tabs[(i + dir + tabs.length) % tabs.length].dataset.tab, true);
		});
	});
	$$('[data-side]').forEach((s) => s.addEventListener('click', () => select(s.dataset.side)));
	selectTab = select;

	// «Посмотреть в кабинете» из карточек: открыть нужную вкладку и режим
	document.addEventListener('click', (e) => {
		const link = e.target.closest('[data-open-tab]');
		if (!link) return;
		select(link.dataset.openTab);
		const extra = link.dataset.openClick && $(link.dataset.openClick);
		if (extra) requestAnimationFrame(() => extra.click());
	});
})();

// переключатели-«пилюли»: одна кнопка из группы нажата
function bindSwitch(group, onChange) {
	group.addEventListener('click', (e) => {
		const b = e.target.closest('button[data-value]');
		if (!b || b.getAttribute('aria-pressed') === 'true') return;
		$$('button', group).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
		onChange(b.dataset.value);
	});
}

/* ==========================================================================
   Мастерская: очередь сборки
   ========================================================================== */

(() => {
	const CHANNELS = {
		site: 'Сайт',
		app: 'Приложение',
		mp: 'Маркетплейс',
		wa: 'WhatsApp',
		tg: 'Telegram',
		phone: 'Звонок',
	};
	const COLS = [
		{ id: 'new', title: 'Новые', action: 'Начать сборку', next: 'work' },
		{ id: 'work', title: 'Собираются', action: 'Собран', next: 'ready' },
		{ id: 'ready', title: 'Готовы к выезду', action: 'Отдать курьеру', next: 'gone' },
	];
	const POOL = [
		['Пионы Сара Бернар, 15 шт', ['К 18:00']],
		['Моно-букет из 51 розы', ['Открытка']],
		['Тюльпаны микс в коробке', ['Сюрприз', 'Не звонить']],
		['Гортензия и эвкалипт', ['К 19:30']],
		['Ранункулюсы, 25 шт', ['Срочно']],
		['Корзина «Весенняя»', ['Открытка', 'К 17:00']],
		['Букет дня со скидкой', []],
		['Кустовые розы и маттиола', ['Сюрприз']],
	];
	const COURIERS = ['Артём', 'Илья', 'Дина', 'Марат'];

	let id = 2046;
	let orders = [
		{ id: 2041, title: 'Пионы Сара Бернар, 15 шт', ch: 'site', tags: ['К 12:30'], due: 26 * 60, status: 'new' },
		{ id: 2042, title: 'Моно-букет из 25 роз', ch: 'mp', tags: ['Открытка'], due: 14 * 60, status: 'new' },
		{ id: 2043, title: 'Корзина: тюльпаны и мимоза', ch: 'wa', tags: ['Сюрприз', 'Не звонить'], due: 35 * 60, status: 'work' },
		{ id: 2044, title: 'Эустома и ранункулюсы', ch: 'app', tags: ['К 13:00'], due: 48 * 60, status: 'work' },
		{ id: 2045, title: 'Букет невесты, кустовые розы', ch: 'phone', tags: ['Срочно'], due: 4 * 60, status: 'ready' },
		{ id: 2046, title: 'Хризантемы сантини в коробке', ch: 'tg', tags: [], due: 52 * 60, status: 'new' },
	];
	let filter = 'all';
	let assembled = [14, 12, 16, 13]; // минуты сборки за смену
	const board = $('[data-ws-board]');
	const filtersWrap = $('[data-ws-filters]');

	const fmtDue = (s) => {
		const neg = s < 0;
		const a = Math.abs(Math.round(s));
		return `${neg ? 'опаздывает на ' : 'выезд через '}${Math.floor(a / 60)}:${pad(a % 60)}`;
	};

	const renderFilters = () => {
		const active = orders.filter((o) => o.status !== 'gone');
		const counts = active.reduce((m, o) => ((m[o.ch] = (m[o.ch] || 0) + 1), m), {});
		const items = [['all', 'Все каналы', active.length], ...Object.entries(CHANNELS).map(([k, v]) => [k, v, counts[k] || 0])];
		filtersWrap.innerHTML = items
			.map(
				([k, v, n]) =>
					`<button class="chip" type="button" data-f="${k}" aria-pressed="${k === filter}">${v}<span class="chip__count">${n}</span></button>`
			)
			.join('');
	};

	const renderKpis = () => {
		const active = orders.filter((o) => o.status !== 'gone');
		const ontime = active.length ? Math.round((active.filter((o) => o.due >= 0).length / active.length) * 100) : 100;
		const avg = assembled.reduce((a, b) => a + b, 0) / assembled.length;
		$('[data-ws-kpi="active"]').textContent = active.length;
		$('[data-ws-kpi-d="active"]').textContent = `${active.filter((o) => o.status === 'new').length} ждут флориста`;
		$('[data-ws-kpi="avg"]').textContent = `${avg.toFixed(1).replace('.', ',')} мин`;
		const avgD = $('[data-ws-kpi-d="avg"]');
		avgD.textContent = avg <= 15 ? 'в норме, цель 15 мин' : 'дольше цели в 15 мин';
		avgD.className = `kpi__delta ${avg <= 15 ? 'is-good' : 'is-bad'}`;
		$('[data-ws-kpi="ontime"]').textContent = `${ontime}%`;
		const otD = $('[data-ws-kpi-d="ontime"]');
		otD.textContent = ontime >= 90 ? 'всё по плану' : 'поднимите опаздывающие';
		otD.className = `kpi__delta ${ontime >= 90 ? 'is-good' : 'is-bad'}`;
	};

	const card = (o, col, fresh) => `
		<article class="order${o.due < 0 ? ' is-late' : ''}${fresh ? ' is-new' : ''}" data-id="${o.id}">
			<div class="order__top"><span>№${o.id}</span><span>${CHANNELS[o.ch]}</span></div>
			<div class="order__title">${o.title}</div>
			${o.tags.length ? `<div class="order__tags">${o.tags.map((t) => `<span class="tag ${t === 'Срочно' ? 'tag--bloom' : t.startsWith('К ') ? 'tag--cyan' : ''}">${t}</span>`).join('')}</div>` : ''}
			<div class="order__foot">
				<span class="order__timer" data-timer>${fmtDue(o.due)}</span>
				<button class="order__btn${col.id === 'ready' ? ' order__btn--light' : ''}" type="button" data-move="${o.id}">${col.action}</button>
			</div>
		</article>`;

	let freshId = null;
	const render = () => {
		board.innerHTML = COLS.map((col) => {
			const list = orders
				.filter((o) => o.status === col.id && (filter === 'all' || o.ch === filter))
				.sort((a, b) => a.due - b.due); // ближайший выезд — наверху
			return `<div class="col"><div class="col__head"><span>${col.title}</span><span>${list.length}</span></div>${
				list.length ? list.map((o) => card(o, col, o.id === freshId)).join('') : `<div class="col__empty">Пусто</div>`
			}</div>`;
		}).join('');
		renderFilters();
		renderKpis();
	};

	board.addEventListener('click', (e) => {
		const b = e.target.closest('[data-move]');
		if (!b) return;
		const o = orders.find((x) => x.id === Number(b.dataset.move));
		const col = COLS.find((c) => c.id === o.status);
		o.status = col.next;
		freshId = null;
		if (col.id === 'work') {
			const mins = 9 + Math.round(Math.random() * 7);
			assembled.push(mins);
			toast(`Букет №${o.id} собран за ${mins} мин`);
		}
		if (col.id === 'ready') toast(`№${o.id} передан курьеру ${COURIERS[o.id % COURIERS.length]}. Клиент получил SMS`);
		render();
	});

	filtersWrap.addEventListener('click', (e) => {
		const b = e.target.closest('[data-f]');
		if (!b) return;
		filter = b.dataset.f;
		render();
	});

	$('[data-ws-add]').addEventListener('click', () => {
		const [title, tags] = POOL[Math.floor(Math.random() * POOL.length)];
		const chs = Object.keys(CHANNELS);
		const o = { id: ++id, title, tags, ch: chs[Math.floor(Math.random() * chs.length)], due: (12 + Math.floor(Math.random() * 40)) * 60, status: 'new' };
		orders.push(o);
		freshId = o.id;
		if (filter !== 'all' && filter !== o.ch) filter = 'all';
		toast(`Новый заказ №${o.id} из канала «${CHANNELS[o.ch]}»`);
		render();
	});

	// время идёт в 6 раз быстрее реального, чтобы было видно, как горят сроки
	setInterval(() => {
		if ($('[data-panel="workshop"]').hidden) return;
		orders.forEach((o) => o.status !== 'gone' && (o.due -= 6));
		$$('.order', board).forEach((el) => {
			const o = orders.find((x) => x.id === Number(el.dataset.id));
			el.querySelector('[data-timer]').textContent = fmtDue(o.due);
			el.classList.toggle('is-late', o.due < 0);
		});
		renderKpis();
	}, 1000);

	render();
})();

/* ==========================================================================
   Курьеры: карта и маршруты
   ========================================================================== */

(() => {
	const W = 640;
	const H = 420;
	const SHOP = { x: 320, y: 210 };
	const COLORS = ['#00ffff', '#ff4f93', '#b1ec52', '#ffd23f', '#9b8cff'];
	const NAMES = ['Артём', 'Дина', 'Илья', 'Марат', 'Соня'];
	const DAYS = {
		normal: { points: 8, couriers: 2, seed: 11, prep: { manual: 6, auto: 3 } },
		peak: { points: 18, couriers: 3, seed: 23, prep: { manual: 22, auto: 9 } },
	};
	const UNIT_KM = 0.012; // 1 единица карты ≈ 12 м
	const MIN_PER_KM = 3.2; // электровелосипед ~19 км/ч
	const STOP_MIN = 4;
	const PROMISE = 60;

	let day = 'normal';
	let mode = 'auto';
	let anim = null;
	const mapEl = $('[data-map]');

	const genPoints = (cfg) => {
		const rnd = mulberry32(cfg.seed);
		return Array.from({ length: cfg.points }, (_, i) => {
			const a = rnd() * Math.PI * 2;
			const r = 70 + rnd() * 150;
			return {
				i,
				x: Math.max(24, Math.min(W - 24, SHOP.x + Math.cos(a) * r * 1.35)),
				y: Math.max(24, Math.min(H - 24, SHOP.y + Math.sin(a) * r * 0.85)),
			};
		});
	};
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

	const assign = (points, k) => {
		if (mode === 'manual') {
			// диспетчер раздаёт по очереди поступления
			const routes = Array.from({ length: k }, () => []);
			points.forEach((p, i) => routes[i % k].push(p));
			return routes;
		}
		// Гуляш: секторы вокруг магазина + ближайший сосед внутри сектора
		const sorted = [...points].sort(
			(a, b) => Math.atan2(a.y - SHOP.y, a.x - SHOP.x) - Math.atan2(b.y - SHOP.y, b.x - SHOP.x)
		);
		const size = Math.ceil(sorted.length / k);
		return Array.from({ length: k }, (_, c) => {
			const rest = sorted.slice(c * size, (c + 1) * size);
			const route = [];
			let cur = SHOP;
			while (rest.length) {
				rest.sort((a, b) => dist(cur, a) - dist(cur, b));
				cur = rest.shift();
				route.push(cur);
			}
			return route;
		});
	};

	const evaluate = (routes, prep) => {
		let km = 0;
		const etas = [];
		const perCourier = routes.map((route) => {
			let cur = SHOP;
			let len = 0;
			const stops = route.map((p, j) => {
				len += dist(cur, p);
				cur = p;
				const eta = prep + len * UNIT_KM * MIN_PER_KM + j * STOP_MIN;
				etas.push(eta);
				return { ...p, len, eta };
			});
			km += len * UNIT_KM;
			return { stops, len };
		});
		const avg = etas.reduce((a, b) => a + b, 0) / etas.length;
		const late = etas.filter((e) => e > PROMISE).length;
		return { perCourier, avg, late, km, total: etas.length };
	};

	const compute = (d, m) => {
		const cfg = DAYS[d];
		const saved = mode;
		mode = m;
		const res = evaluate(assign(genPoints(cfg), cfg.couriers), cfg.prep[m]);
		mode = saved;
		return res;
	};

	const streets = () => {
		let s = '';
		for (let x = 40; x < W; x += 64) s += `<line x1="${x}" y1="0" x2="${x + 18}" y2="${H}" stroke="#24262c" stroke-width="6"/>`;
		for (let y = 30; y < H; y += 56) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y - 10}" stroke="#24262c" stroke-width="6"/>`;
		s += `<line x1="0" y1="${H}" x2="${W}" y2="40" stroke="#2b2d34" stroke-width="12"/>`;
		s += `<path d="M-10 90 C 140 60, 200 170, 330 120 S 520 40, 660 110" fill="none" stroke="#0e2a30" stroke-width="26"/>`;
		s += `<path d="M-10 90 C 140 60, 200 170, 330 120 S 520 40, 660 110" fill="none" stroke="rgba(0,255,255,.18)" stroke-width="2"/>`;
		return s;
	};

	const render = () => {
		cancelAnimationFrame(anim);
		const res = compute(day, mode);
		const base = compute(day, mode === 'auto' ? 'manual' : 'auto');

		const routesSvg = res.perCourier
			.map((c, i) => {
				const d = `M${SHOP.x} ${SHOP.y} ` + c.stops.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
				return `<path class="route" data-route="${i}" d="${d}" stroke="${COLORS[i]}" opacity=".9"/>`;
			})
			.join('');
		const stopsSvg = res.perCourier
			.flatMap((c, i) =>
				c.stops.map(
					(p) =>
						`<circle class="stop" data-stop="${i}-${p.i}" cx="${p.x}" cy="${p.y}" r="7" fill="#26272c" stroke="${COLORS[i]}" stroke-width="2.5"/>`
				)
			)
			.join('');
		const ridersSvg = res.perCourier
			.map((_, i) => `<circle data-rider="${i}" cx="${SHOP.x}" cy="${SHOP.y}" r="6" fill="#fff" stroke="${COLORS[i]}" stroke-width="3" opacity="0"/>`)
			.join('');

		mapEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Карта: ${res.total} ${plural(res.total, ['адрес', 'адреса', 'адресов'])}, ${res.perCourier.length} ${plural(res.perCourier.length, ['курьер', 'курьера', 'курьеров'])}">
			${streets()}
			${routesSvg}
			${stopsSvg}
			<g transform="translate(${SHOP.x - 16} ${SHOP.y - 16})"><rect width="32" height="32" rx="8" fill="#00ffff"/><use href="#i-flower" x="4" y="4" width="24" height="24" style="filter:brightness(0)"/></g>
			${ridersSvg}
		</svg>`;

		// маршруты «рисуются»
		$$('[data-route]', mapEl).forEach((p) => {
			const L = p.getTotalLength();
			p.style.strokeDasharray = L;
			p.style.strokeDashoffset = reducedMotion ? 0 : L;
			p.getBoundingClientRect();
			p.style.transition = 'stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)';
			p.style.strokeDashoffset = 0;
		});

		// KPI
		const fmtMin = (m) => `${Math.round(m)} мин`;
		$('[data-map-kpi="avg"]').textContent = fmtMin(res.avg);
		$('[data-map-kpi="late"]').textContent = `${res.late} из ${res.total}`;
		$('[data-map-kpi="km"]').textContent = `${res.km.toFixed(1).replace('.', ',')} км`;
		const delta = (key, diff, unit, goodIfNeg) => {
			const el = $(`[data-map-kpi-d="${key}"]`);
			if (mode === 'manual') {
				el.textContent = 'как сейчас, без системы';
				el.className = 'kpi__delta';
				return;
			}
			const good = goodIfNeg ? diff < 0 : diff > 0;
			el.textContent = diff === 0 ? 'как вручную' : `${diff > 0 ? '+' : '−'}${String(Math.abs(diff)).replace('.', ',')}${unit} к ручному`;
			el.className = `kpi__delta ${diff === 0 ? '' : good ? 'is-good' : 'is-bad'}`;
		};
		delta('avg', Math.round(res.avg - base.avg), ' мин', true);
		delta('late', res.late - base.late, '', true);
		delta('km', Number((res.km - base.km).toFixed(1)), ' км', true);

		$('[data-map-couriers]').innerHTML = res.perCourier
			.map((c, i) => {
				const last = c.stops.at(-1);
				return `<div class="courier"><span class="courier__dot" style="background:${COLORS[i]}"></span><span class="courier__name">${NAMES[i]}</span><span class="courier__meta">${c.stops.length} ${plural(c.stops.length, ['адрес', 'адреса', 'адресов'])}<br>последний в ${last ? Math.round(last.eta) : 0} мин</span></div>`;
			})
			.join('');

		const notes = {
			'normal-manual': 'Диспетчер раздаёт заказы по очереди поступления. Курьеры пересекают город и мешают друг другу.',
			'normal-auto': 'Гуляш группирует адреса по районам и сам решает, кто куда едет. Диспетчер не нужен.',
			'peak-manual': 'В пик заказы копятся у флористов, а курьеры уезжают с одним букетом. Часть доставок опоздает.',
			'peak-auto': 'Гуляш собирает букеты к выезду, отправляет курьеров волнами и закрывает слоты, если не успевает.',
		};
		$('[data-map-note]').textContent = notes[`${day}-${mode}`];
		$('[data-map-run]').textContent = 'Запустить смену';
		$('[data-map-run]').disabled = false;
		lastRes = res;
	};

	let lastRes = null;
	const run = () => {
		const res = lastRes;
		const btn = $('[data-map-run]');
		btn.disabled = true;
		btn.textContent = 'Курьеры в пути…';
		const paths = $$('[data-route]', mapEl);
		const riders = $$('[data-rider]', mapEl);
		$$('.stop', mapEl).forEach((s) => s.setAttribute('fill', '#26272c'));
		const DUR = reducedMotion ? 1 : 4200;
		const maxLen = Math.max(...res.perCourier.map((c) => c.len));
		const t0 = performance.now();
		riders.forEach((r) => r.setAttribute('opacity', '1'));
		const step = (now) => {
			const k = Math.min(1, (now - t0) / DUR);
			res.perCourier.forEach((c, i) => {
				const path = paths[i];
				const L = path.getTotalLength();
				const traveled = Math.min(L, k * maxLen * (L / Math.max(1, c.len)));
				const pt = path.getPointAtLength(traveled);
				riders[i].setAttribute('cx', pt.x);
				riders[i].setAttribute('cy', pt.y);
				c.stops.forEach((s) => {
					if (traveled / (L / Math.max(1, c.len)) >= s.len - 0.5) {
						$(`[data-stop="${i}-${s.i}"]`, mapEl)?.setAttribute('fill', s.eta > PROMISE ? '#ff4f93' : '#b1ec52');
					}
				});
			});
			if (k < 1) anim = requestAnimationFrame(step);
			else {
				btn.disabled = false;
				btn.textContent = 'Повторить смену';
				toast(res.late ? `Смена закрыта: ${res.late} ${plural(res.late, ['опоздание', 'опоздания', 'опозданий'])}` : 'Смена закрыта: все букеты доставлены вовремя');
			}
		};
		anim = requestAnimationFrame(step);
	};

	bindSwitch($('[data-map-day]'), (v) => ((day = v), render()));
	bindSwitch($('[data-map-mode]'), (v) => ((mode = v), render()));
	$('[data-map-run]').addEventListener('click', run);

	let drawn = false;
	panelHooks.couriers = () => {
		// SVG нужно отрисовать видимым, чтобы getTotalLength работал
		if (!drawn) {
			drawn = true;
			render();
		}
	};
})();

/* ==========================================================================
   Поводы клиентов: CRM + push в приложении
   ========================================================================== */

(() => {
	const SEGMENTS = { all: 'Все', loyal: 'Постоянные', sleep: 'Засыпающие', new: 'Новые' };
	const clients = [
		{ id: 1, name: 'Сергей Ковалёв', who: 'день рождения жены', short: 'Марина', in: 2, last: 'Пионы Сара Бернар, 15 шт', sum: 6900, seg: 'loyal', orders: 9 },
		{ id: 2, name: 'Алина Мусина', who: 'годовщина свадьбы', short: 'годовщина', in: 4, last: 'Розы Эквадор, 25 шт', sum: 8200, seg: 'loyal', orders: 6 },
		{ id: 3, name: 'Дмитрий Орлов', who: 'день рождения мамы', short: 'мама', in: 6, last: 'Корзина „Весенняя“', sum: 5400, seg: 'sleep', orders: 3 },
		{ id: 4, name: 'Екатерина Лис', who: 'день рождения подруги', short: 'Оля', in: 5, last: 'Букет дня', sum: 2900, seg: 'new', orders: 1 },
		{ id: 5, name: 'Павел Гринёв', who: 'день рождения дочери', short: 'Соня', in: 9, last: 'Тюльпаны микс, 31 шт', sum: 4300, seg: 'loyal', orders: 12 },
		{ id: 6, name: 'Ольга Тарасова', who: 'юбилей коллеги', short: 'коллега', in: 12, last: 'Гортензия и эвкалипт', sum: 5100, seg: 'sleep', orders: 2 },
		{ id: 7, name: 'Игорь Белов', who: 'день знакомства', short: 'знакомство', in: 13, last: 'Кустовые розы', sum: 3800, seg: 'new', orders: 1 },
		{ id: 8, name: 'Наталья Ким', who: 'день рождения сестры', short: 'Вера', in: 18, last: 'Ранункулюсы, 25 шт', sum: 6100, seg: 'loyal', orders: 7 },
		{ id: 9, name: 'Руслан Ахметов', who: 'день рождения жены', short: 'Лейла', in: 23, last: 'Моно-букет из 51 розы', sum: 14900, seg: 'sleep', orders: 4 },
		{ id: 10, name: 'Мария Соколова', who: 'выпускной сына', short: 'выпускной', in: 27, last: 'Подсолнухи, 9 шт', sum: 3300, seg: 'new', orders: 1 },
	];
	let range = 7;
	let seg = 'all';
	let template = 'remind';
	let selected = 1;
	const sent = new Set();

	const listEl = $('[data-crm-list]');
	const segWrap = $('[data-crm-segments]');
	const pushEl = $('[data-crm-push]');
	const sendBtn = $('[data-crm-send]');

	const visible = () => clients.filter((c) => c.in <= range && (seg === 'all' || c.seg === seg)).sort((a, b) => a.in - b.in);

	const renderSegs = () => {
		const inRange = clients.filter((c) => c.in <= range);
		segWrap.innerHTML = Object.entries(SEGMENTS)
			.map(([k, v]) => {
				const n = k === 'all' ? inRange.length : inRange.filter((c) => c.seg === k).length;
				return `<button class="chip" type="button" data-seg="${k}" aria-pressed="${k === seg}">${v}<span class="chip__count">${n}</span></button>`;
			})
			.join('');
	};

	const pushFor = (c) => {
		const first = c.name.split(' ')[0];
		const date = fmtDay(addDays(new Date(), c.in));
		const days = `${c.in} ${plural(c.in, ['день', 'дня', 'дней'])}`;
		if (template === 'repeat')
			return { title: `Повторить «${c.last}»?`, text: `${first}, тот же букет на тот же адрес в один тап. ${rub(c.sum)}, доставим ${date} к нужному часу.` };
		if (template === 'promo')
			return { title: `−10% к поводу: ${c.who}`, text: `${first}, промокод ПОВОД10 действует до ${date}. Соберём и привезём за 60 минут.` };
		return { title: `Через ${days}: ${c.who}`, text: `${first}, в прошлый раз вы выбрали «${c.last}». Соберём такой же или подберём новый?` };
	};

	const renderPush = () => {
		const c = clients.find((x) => x.id === selected);
		if (!c) {
			pushEl.innerHTML = `<p class="muted" style="text-align:center;font-size:14px">Выберите клиента слева</p>`;
			sendBtn.disabled = true;
			return;
		}
		const p = pushFor(c);
		pushEl.innerHTML = `<div class="push"><div class="push__app"><span class="push__icon"><svg width="14" height="14"><use href="#i-flower"/></svg></span>Пион и Ко · сейчас</div><div class="push__title">${p.title}</div><div class="push__text">${p.text}</div></div>`;
		sendBtn.disabled = sent.has(c.id);
		sendBtn.textContent = sent.has(c.id) ? 'Уже отправлено' : `Отправить push: ${c.name.split(' ')[0]}`;
	};

	const render = () => {
		const list = visible();
		if (!list.some((c) => c.id === selected)) selected = list[0]?.id ?? null;
		listEl.innerHTML = list.length
			? list
					.map((c) => {
						const d = addDays(new Date(), c.in);
						return `<button class="client" type="button" data-client="${c.id}" aria-pressed="${c.id === selected}">
							<span class="client__date"><b>${d.getDate()}</b>${MONTHS_GEN[d.getMonth()].slice(0, 3)}</span>
							<span><span class="client__name">${c.name}</span><br><span class="client__info">${c.who} · ${c.orders} ${plural(c.orders, ['заказ', 'заказа', 'заказов'])} · ${c.last}</span></span>
							<span class="client__status${sent.has(c.id) ? ' is-sent' : ''}">${sent.has(c.id) ? 'Напомнили ✓' : `через ${c.in} ${plural(c.in, ['день', 'дня', 'дней'])}`}</span>
						</button>`;
					})
					.join('')
			: `<div class="col__empty">В этом сегменте поводов нет. Расширьте период.</div>`;
		const potential = list.reduce((s, c) => s + c.sum, 0);
		$('[data-crm-summary]').textContent = list.length
			? `${list.length} ${plural(list.length, ['повод', 'повода', 'поводов'])} в периоде, потенциальная выручка ${rub(potential)}. Напомнили: ${list.filter((c) => sent.has(c.id)).length}.`
			: '';
		renderSegs();
		renderPush();
	};

	listEl.addEventListener('click', (e) => {
		const b = e.target.closest('[data-client]');
		if (!b) return;
		selected = Number(b.dataset.client);
		render();
	});
	segWrap.addEventListener('click', (e) => {
		const b = e.target.closest('[data-seg]');
		if (!b) return;
		seg = b.dataset.seg;
		render();
	});
	bindSwitch($('[data-crm-range]'), (v) => ((range = Number(v)), render()));
	bindSwitch($('[data-crm-template]'), (v) => ((template = v), renderPush()));

	sendBtn.addEventListener('click', async () => {
		const c = clients.find((x) => x.id === selected);
		if (!c) return;
		sendBtn.disabled = true;
		sendBtn.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,.2);border-top-color:#040406"></span>';
		await sleep(700);
		sent.add(c.id);
		toast(`Push отправлен: ${c.name}`);
		render();
	});

	const now = new Date();
	$('[data-crm-clock]').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	$('[data-crm-date]').textContent = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
	render();
})();

/* ==========================================================================
   Склад свежести
   ========================================================================== */

(() => {
	const flowers = [
		{ id: 'peony', name: 'Пион Сара Бернар', origin: 'Нидерланды', qty: 140, life: 6, age: 3, price: 390 },
		{ id: 'rose', name: 'Роза Эксплорер', origin: 'Эквадор', qty: 260, life: 9, age: 2, price: 220 },
		{ id: 'tulip', name: 'Тюльпан микс', origin: 'Россия', qty: 410, life: 6, age: 4, price: 120 },
		{ id: 'ranunc', name: 'Ранункулюс', origin: 'Италия', qty: 75, life: 7, age: 5, price: 310 },
		{ id: 'eust', name: 'Эустома белая', origin: 'Кения', qty: 90, life: 10, age: 3, price: 260 },
		{ id: 'hydr', name: 'Гортензия', origin: 'Колумбия', qty: 38, life: 7, age: 2, price: 650 },
	];
	const CHANNELS = ['Сайт', 'Приложение', 'Маркетплейсы', 'WhatsApp-бот'];
	const stopped = new Set();
	let day = 0;
	const listEl = $('[data-stock-list]');
	const slider = $('[data-stock-day]');

	const left = (f) => f.life - f.age - day;
	const color = (l, life) => (l <= 0 ? '#505050' : l <= 1 ? '#ff4f93' : l <= 2 ? '#ffd23f' : '#b1ec52');

	const render = () => {
		listEl.innerHTML = flowers
			.map((f) => {
				const l = left(f);
				const dead = l <= 0;
				const isStopped = dead || stopped.has(f.id);
				const label = dead ? 'Списание' : `${l} ${plural(l, ['день', 'дня', 'дней'])} свежести`;
				return `<div class="stock__row${isStopped ? ' is-stopped' : ''}">
					<span class="stock__name">${f.name}<small>${f.origin} · ${f.price} ₽/шт</small></span>
					<span class="stock__qty">${f.qty} шт</span>
					<span class="fresh"><span>${label}</span><span class="fresh__bar"><span class="fresh__fill" style="width:${Math.max(0, (l / f.life) * 100)}%;background:${color(l, f.life)}"></span></span></span>
					<label class="toggle"><input type="checkbox" data-stop="${f.id}" ${isStopped ? 'checked' : ''} ${dead ? 'disabled' : ''}><span class="toggle__track"></span>${isStopped ? 'В стоп-листе' : 'В продаже'}</label>
				</div>`;
			})
			.join('');

		const stopCount = flowers.filter((f) => left(f) <= 0 || stopped.has(f.id)).length;
		$('[data-stock-channels]').innerHTML = CHANNELS.map(
			(c) => `<span class="channel">${c}${stopCount ? ` · −${stopCount}` : ' ✓'}</span>`
		).join('');

		const labels = ['Сегодня', 'Завтра', 'Через 2 дня', 'Через 3 дня', 'Через 4 дня'];
		$('[data-stock-day-label]').textContent = labels[day];
		slider.style.setProperty('--fill', `${(day / 4) * 100}%`);

		const risky = flowers.filter((f) => left(f) === 1 && !stopped.has(f.id));
		const dead = flowers.filter((f) => left(f) <= 0);
		const advice = $('[data-stock-advice]');
		const icon = `<svg class="advice__icon"><use href="#i-flower"/></svg>`;
		if (risky.length) {
			const save = risky.reduce((s, f) => s + f.qty * f.price * 0.85, 0);
			advice.innerHTML = `${icon}<div><p class="advice__title">Соберите букет дня из: ${risky.map((f) => f.name.toLowerCase()).join(', ')}</p><p class="advice__text">Завтра эти цветы потеряют вид. Скидка 15% в приложении и на сайте спасёт около ${rub(Math.round(save / 100) * 100)}.</p><button class="btn btn--light btn--sm" type="button" data-bouquet style="margin-top:12px">Запустить букет дня</button></div>`;
		} else if (dead.length) {
			const lost = dead.reduce((s, f) => s + f.qty * f.price, 0);
			advice.innerHTML = `${icon}<div><p class="advice__title">Ушло в списание на ${rub(lost)}</p><p class="advice__text">${dead.map((f) => f.name).join(', ')} сняты со всех витрин автоматически. Верните ползунок назад: Гуляш предупредил бы за день.</p></div>`;
		} else {
			advice.innerHTML = `${icon}<div><p class="advice__title">Все цветы свежие</p><p class="advice__text">Гуляш предупредит за день до того, как партия начнёт терять вид, и предложит букет дня. Промотайте время вперёд.</p></div>`;
		}
	};

	listEl.addEventListener('change', (e) => {
		const input = e.target.closest('[data-stop]');
		if (!input) return;
		const f = flowers.find((x) => x.id === input.dataset.stop);
		if (input.checked) {
			stopped.add(f.id);
			toast(`«${f.name}» снят с продажи в ${CHANNELS.length} каналах`);
		} else {
			stopped.delete(f.id);
			toast(`«${f.name}» снова в продаже`);
		}
		render();
	});

	$('[data-stock-advice]').addEventListener('click', (e) => {
		if (!e.target.closest('[data-bouquet]')) return;
		const risky = flowers.filter((f) => left(f) === 1);
		// продали в букетах дня — остатки обнуляются, позиции уходят из витрины
		risky.forEach((f) => {
			f.qty = 0;
			stopped.add(f.id);
		});
		toast('Букет дня опубликован в приложении, на сайте и маркетплейсах');
		render();
	});

	slider.addEventListener('input', () => {
		day = Number(slider.value);
		render();
	});
	render();
})();

/* ==========================================================================
   Калькулятор
   ========================================================================== */

(() => {
	const inputs = $$('[data-calc]');
	const val = (k) => Number($(`[data-calc="${k}"]`).value);
	const setFill = (input) => {
		const p = ((input.value - input.min) / (input.max - input.min)) * 100;
		input.style.setProperty('--fill', `${p}%`);
	};
	const render = () => {
		const orders = val('orders');
		const check = val('check');
		const points = val('points');
		const yearRevenue = orders * check * 365 * points;
		const repeat = yearRevenue * 0.3 * 0.13; // 30% выручки — повторные, +13% к ним
		const peak = 5 * orders * 3 * 0.15 * check * points; // 5 пиков, спрос ×3, 15% раньше теряли
		const loss = yearRevenue * 0.02;
		$('[data-calc-out="orders"]').textContent = orders;
		$('[data-calc-out="check"]').textContent = rub(check);
		$('[data-calc-out="points"]').textContent = points;
		$('[data-calc-row="repeat"]').textContent = rubShort(repeat);
		$('[data-calc-row="peak"]').textContent = rubShort(peak);
		$('[data-calc-row="loss"]').textContent = rubShort(loss);
		$('[data-calc-total]').textContent = `+${rubShort(repeat + peak + loss)}`;
		inputs.forEach(setFill);
	};
	inputs.forEach((i) => i.addEventListener('input', render));
	render();

	$('[data-calc-cta]').addEventListener('click', () => {
		const orders = val('orders');
		const volume = orders <= 30 ? 'до 30' : orders <= 100 ? '30–100' : orders <= 300 ? '100–300' : '300+';
		const radio = $(`[name="volume"][value="${volume}"]`);
		if (radio) radio.checked = true;
		setFormContext(
			`Расчёт: ${$('[data-calc-total]').textContent} в год · ${orders} заказов в день · чек ${rub(val('check'))} · точек: ${val('points')}`
		);
	});
})();

/* ==========================================================================
   Форма заявки
   ========================================================================== */

// тема заявки: откуда пришёл человек (кнопка в блоке, расчёт калькулятора)
function setFormContext(text) {
	const box = $('[data-form-context]');
	box.hidden = !text;
	$('[data-form-context-text]', box).textContent = text || '';
	box.querySelector('[name="context"]').value = text || '';
}

document.addEventListener('click', (e) => {
	const link = e.target.closest('[data-cta-context]');
	if (link) setFormContext(link.dataset.ctaContext);
});

(() => {
	const form = $('[data-form]');
	const submit = $('[data-submit]');
	const okState = $('[data-state="ok"]');
	const errState = $('[data-state="err"]');
	const phone = form.elements.phone;
	let touched = false;

	// маска +7 (XXX) XXX-XX-XX
	// возвращает 7XXXXXXXXXX; «8…» и «+7…» в начале считаются кодом страны
	const digits = (v) => {
		let d = v.replace(/\D/g, '');
		if (v.trim().startsWith('+7')) d = d.slice(1);
		if (d.length > 10 && /^[78]/.test(d)) d = d.slice(1);
		return d ? '7' + d.slice(0, 10) : '';
	};
	const formatPhone = (d) => {
		if (!d) return '';
		const p = d.slice(1);
		let out = '+7';
		if (p.length) out += ` (${p.slice(0, 3)}`;
		if (p.length >= 3) out += ')';
		if (p.length > 3) out += ` ${p.slice(3, 6)}`;
		if (p.length > 6) out += `-${p.slice(6, 8)}`;
		if (p.length > 8) out += `-${p.slice(8, 10)}`;
		return out;
	};
	phone.addEventListener('input', () => {
		phone.value = formatPhone(digits(phone.value));
	});
	phone.addEventListener('focus', () => {
		if (!phone.value) phone.value = '+7';
	});
	phone.addEventListener('blur', () => {
		if (phone.value === '+7') phone.value = '';
	});

	const rules = {
		name: (v) => (!v.trim() ? 'Напишите, как к вам обращаться' : !/^[A-Za-zА-Яа-яЁё\s-]{2,40}$/.test(v.trim()) ? 'Только буквы, от 2 символов' : ''),
		phone: (v) => (!digits(v) ? 'Укажите телефон, по нему мы перезвоним' : digits(v).length < 11 ? 'В номере не хватает цифр' : ''),
		shop: (v) => (v.trim().length < 2 ? 'Укажите название магазина' : ''),
		consent: (_, el) => (!el.checked ? 'Без согласия мы не сможем перезвонить' : ''),
	};

	const check = (name) => {
		const el = form.elements[name];
		const msg = rules[name](el.value, el);
		const field = el.closest('.field');
		field.classList.toggle('is-invalid', !!msg);
		el.setAttribute('aria-invalid', String(!!msg));
		field.querySelector('.field__error').textContent = msg;
		return !msg;
	};
	const checkAll = () => Object.keys(rules).map(check).every(Boolean);

	Object.keys(rules).forEach((name) => {
		const el = form.elements[name];
		el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => touched && check(name));
		el.addEventListener('blur', () => el.value && check(name));
	});

	const showState = (state) => {
		form.hidden = state !== 'form';
		okState.hidden = state !== 'ok';
		errState.hidden = state !== 'err';
		if (state !== 'form') (state === 'ok' ? okState : errState).focus();
	};

	// имитация запроса: настоящей отправки в демо нет
	const fakeRequest = async (data) => {
		await sleep(1600);
		if (!navigator.onLine) throw new Error('offline');
		if (digits(data.phone) === '70000000000') throw new Error('server');
		return { ok: true };
	};

	const send = async () => {
		const data = Object.fromEntries(new FormData(form));
		submit.disabled = true;
		submit.innerHTML = '<span class="spinner"></span> Отправляем…';
		form.setAttribute('aria-busy', 'true');
		$$('[data-retry]').forEach((b) => (b.disabled = true));
		try {
			await fakeRequest(data);
			$('[data-ok-text]').textContent = `${data.name.trim()}, перезвоним на ${data.phone} в течение 15 минут в рабочее время и покажем, как Гуляш проведёт ближайший праздник для «${data.shop.trim()}».${data.context ? ` Тему «${data.context}» передадим менеджеру.` : ''}`;
			showState('ok');
		} catch (err) {
			$('[data-err-text]').textContent =
				err.message === 'offline'
					? 'Нет подключения к интернету. Данные формы сохранены: проверьте сеть и отправьте ещё раз.'
					: 'Сервер не ответил. Данные формы сохранены: отправьте ещё раз или позвоните нам.';
			showState('err');
		} finally {
			submit.disabled = false;
			submit.textContent = 'Отправить заявку';
			form.removeAttribute('aria-busy');
			$$('[data-retry]').forEach((b) => (b.disabled = false));
		}
	};

	form.addEventListener('submit', (e) => {
		e.preventDefault();
		touched = true;
		if (!checkAll()) {
			form.querySelector('[aria-invalid="true"]')?.focus();
			return;
		}
		send();
	});

	$('[data-retry]').addEventListener('click', async (e) => {
		const btn = e.currentTarget;
		btn.innerHTML = '<span class="spinner"></span> Отправляем…';
		await send();
		btn.textContent = 'Отправить ещё раз';
	});
	$('[data-form-context-close]').addEventListener('click', () => setFormContext(''));
	$('[data-back]').addEventListener('click', () => showState('form'));
	$('[data-reset]').addEventListener('click', () => {
		form.reset();
		setFormContext('');
		touched = false;
		$$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
		$$('.field__error', form).forEach((f) => (f.textContent = ''));
		showState('form');
		form.elements.name.focus();
	});
})();

/* ==========================================================================
   FAQ
   ========================================================================== */

$('[data-faq]').addEventListener('click', (e) => {
	const q = e.target.closest('.faq__q');
	if (!q) return;
	q.setAttribute('aria-expanded', String(q.getAttribute('aria-expanded') !== 'true'));
});

/* ==========================================================================
   Липкая кнопка заявки на мобильном: после героя и пока форма не на экране
   ========================================================================== */

(() => {
	const btn = $('[data-sticky-cta]');
	const seen = { hero: true, connect: false };
	const update = () => btn.classList.toggle('is-shown', !seen.hero && !seen.connect);
	const watch = (el, key) =>
		new IntersectionObserver(([entry]) => {
			seen[key] = entry.isIntersecting;
			update();
		}).observe(el);
	watch($('.hero'), 'hero');
	watch($('#connect'), 'connect');
})();

/* ==========================================================================
   Плавная прокрутка (Lenis — как на goulash.tech) и якорные ссылки
   ========================================================================== */

(() => {
	const headerOffset = () => -($('[data-header]').offsetHeight + 8);
	const lenis = reducedMotion ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
	if (lenis) {
		const raf = (t) => {
			lenis.raf(t);
			requestAnimationFrame(raf);
		};
		requestAnimationFrame(raf);
	}
	document.addEventListener('click', (e) => {
		const a = e.target.closest('a[href^="#"]');
		if (!a || a.getAttribute('href') === '#') return;
		const target = a.getAttribute('href') === '#top' ? 0 : $(a.getAttribute('href'));
		if (target === null) return;
		e.preventDefault();
		if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : headerOffset() });
		else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + headerOffset() });
	});
})();
