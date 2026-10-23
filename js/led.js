/* ==========================================================================
   LED-знак Goulash.tech Flowers:
   - Оригинальные рисунки цветов и курьера на круглой LED-матрице
   - Курьер для второго экрана
   - Гомография: CSS matrix3d() для перспективного размещения на фото столба
   Рендер и анимация: goulash-flowers-main/js/app.js (ES module)
   Новые рисунки: led-art.js. Предыдущая версия: backups/led-before-redesign/led.js.
   ========================================================================== */

import { LED_COLORS, SPRITES, FLOWER_ORDER } from './led-art.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function ledSign(canvas, mode) {
	const ctx = canvas.getContext('2d');
	// 32 светодиода по ширине, по высоте — сколько поместится в экран;
	// рисунки 32×32 используют каждый диод и центрируются по вертикали
	const N = 32;
	const pitch = canvas.width / N;
	const ROWS = Math.round(canvas.height / pitch);
	const oy0 = Math.floor((ROWS - N) / 2);
	const r = pitch * 0.34;
	const off = '#1d1d21';

	const spriteGrid = (sprite, dx = 0) => {
		const grid = Array.from({ length: ROWS }, () => Array(N).fill(null));
		sprite.forEach((row, y) => {
			for (let x = 0; x < N; x++) {
				const c = LED_COLORS[row[x]];
				if (!c) continue;
				const gx = x + dx;
				if (gx >= 0 && gx < N) grid[oy0 + y][gx] = c;
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
		if (reducedMotion) return draw(spriteGrid(SPRITES.courier));
		// курьер проезжает по табло слева направо
		let x = -32;
		let last = 0;
		const tick = (t) => {
			if (t - last > 70) {
				last = t;
				x = x >= 32 ? -32 : x + 1;
				draw(spriteGrid(SPRITES.courier, x));
			}
			requestAnimationFrame(tick);
		};
		return requestAnimationFrame(tick);
	}

	// цветы «распускаются» снизу вверх, затем меняются
	const order = FLOWER_ORDER;
	if (reducedMotion) return draw(spriteGrid(SPRITES[order[0]]));
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

// Запуск LED на всех canvas[data-led] на странице
export function initLedCanvases() {
	$$('canvas[data-led]').forEach((c) => ledSign(c, c.dataset.led));
}

// Гомография: прямоугольник canvas → четырёхугольник экрана на рендере.
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

export function initSign() {
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
}
