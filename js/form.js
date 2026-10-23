/* Форма заявки — валидация + состояния */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function initForm(formEl) {
	if (!formEl) return;

	const states = {
		form: formEl.querySelector('[data-form-state="form"]'),
		success: formEl.querySelector('[data-form-state="success"]'),
		error: formEl.querySelector('[data-form-state="error"]'),
	};

	function showState(name) {
		Object.entries(states).forEach(([k, el]) => { if (el) el.hidden = k !== name; });
	}

	function validate() {
		let ok = true;
		const FIELDS = [
			{ name: 'name', msg: 'Введите имя' },
			{ name: 'phone', msg: 'Введите телефон', test: v => /[\d\s\-\+\(\)]{7,}/.test(v) },
			{ name: 'shop', msg: 'Введите название магазина' },
			{ name: 'city', msg: 'Введите город' },
			{ name: 'points', msg: 'Введите число точек', test: v => /^\d+$/.test(v.trim()) },
		];
		for (const f of FIELDS) {
			const input = formEl.querySelector(`[name="${f.name}"]`);
			const errEl = formEl.querySelector(`#e-${f.name}`) || formEl.querySelector(`[data-f="${f.name}"] .field__error`);
			const wrap = formEl.querySelector(`[data-f="${f.name}"]`);
			if (!input) continue;
			const val = input.value.trim();
			let err = '';
			if (!val) err = f.msg;
			else if (f.test && !f.test(val)) err = f.msg;
			if (errEl) errEl.textContent = err;
			wrap?.classList.toggle('is-error', !!err);
			if (err) ok = false;
		}
		// checkbox
		const agree = formEl.querySelector('[name="agree"]');
		const agreeErr = formEl.querySelector('#e-agree') || formEl.querySelector('[data-f="agree"] .field__error');
		const agreeWrap = formEl.querySelector('[data-f="agree"]');
		if (agree && !agree.checked) {
			if (agreeErr) agreeErr.textContent = 'Необходимо согласие';
			agreeWrap?.classList.add('is-error');
			ok = false;
		} else {
			if (agreeErr) agreeErr.textContent = '';
			agreeWrap?.classList.remove('is-error');
		}
		return ok;
	}

	async function submit() {
		if (!validate()) return;
		const btn = formEl.querySelector('[data-form-submit]');
		if (btn) { btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Отправляем…'; }
		await sleep(1400);
		if (btn) { btn.setAttribute('aria-busy', 'false'); btn.textContent = 'Отправить заявку'; }
		// 80% success simulation
		if (Math.random() < 0.8) {
			showState('success');
		} else {
			showState('error');
		}
	}

	formEl.addEventListener('submit', e => { e.preventDefault(); submit(); });
	formEl.querySelector('[data-retry]')?.addEventListener('click', () => { showState('form'); submit(); });
	formEl.querySelector('[data-back]')?.addEventListener('click', () => showState('form'));
}
