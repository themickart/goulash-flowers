/* ==========================================================================
   Goulash.tech Flowers — главный модуль
   ========================================================================== */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initLedCanvases, initSign } from './led.js';
import { initWorkshop } from './workshop.js';
import { initEkbMap } from './ekb-map.js';
import { initStock } from './stock.js';
import { initPeak } from './peak.js';
import { initCRM } from './crm.js';
import { initForm } from './form.js';
import { initRevenue } from './revenue.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rub = n => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
const pad = n => String(n).padStart(2, '0');
const plural = (n, [one, few, many]) => {
	const a = Math.abs(n) % 100, b = a % 10;
	if (a > 10 && a < 20) return many;
	if (b > 1 && b < 5) return few;
	if (b === 1) return one;
	return many;
};

// Lenis
const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

// Toast
const toaster = $('[data-toaster]');
let toastTimer;
function toast(text) {
	if (!toaster) return;
	toaster.textContent = text;
	toaster.classList.add('is-shown');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toaster.classList.remove('is-shown'), 2800);
}

// Шапка
(()=>{
	const header=$('[data-header]'),burger=$('[data-burger]');
	if(!header||!burger)return;
	const close=()=>{header.classList.remove('is-open');burger.setAttribute('aria-expanded','false');};
	burger.addEventListener('click',()=>{const o=!header.classList.contains('is-open');header.classList.toggle('is-open',o);burger.setAttribute('aria-expanded',String(o));});
	$$('.nav a').forEach(a=>a.addEventListener('click',close));
	const onScroll=()=>header.classList.toggle('is-stuck',window.scrollY>8);
	window.addEventListener('scroll',onScroll,{passive:true});
	onScroll();
	document.addEventListener('keydown',e=>e.key==='Escape'&&close());
})();

// Sticky CTA
(()=>{
	const cta=$('[data-sticky-cta]');
	if(!cta)return;
	const obs=new IntersectionObserver(entries=>cta.classList.toggle('is-shown',!entries.some(e=>e.isIntersecting)),{threshold:0});
	const hero=$('section.hero');
	if(hero)obs.observe(hero);
})();

// LED знак (спрайты + гомография)
initLedCanvases();
initSign();

// CTA context
(()=>{
	const fc=$('[data-form-context]'),ct=$('[data-form-context-text]'),cl=$('[data-form-context-close]');
	$$('[data-cta-context]').forEach(el=>el.addEventListener('click',()=>{
		const msg=el.dataset.ctaContext;
		if(!msg||!fc||!ct)return;
		ct.textContent=msg;fc.removeAttribute('hidden');
	}));
	cl?.addEventListener('click',()=>fc?.setAttribute('hidden',''));
})();

// FAQ
(()=>{
	$$('[data-faq] .faq__item').forEach(item=>{
		const btn=item.querySelector('.faq__q'),ans=item.querySelector('.faq__a');
		if(!btn||!ans)return;
		btn.addEventListener('click',()=>btn.setAttribute('aria-expanded',String(btn.getAttribute('aria-expanded')!=='true')));
	});
})();

// Hero KPI ticker
(()=>{
	const ORDERS=[
		{num:1842,product:'Пионы, 15 шт',status:'Курьер в пути'},
		{num:1843,product:'Розы, 25 шт',status:'Собирается'},
		{num:1844,product:'Тюльпаны, 21 шт',status:'Выдан курьеру'},
		{num:1845,product:'Хризантемы, 11 шт',status:'Принят'},
	];
	let idx=0;
	const numEl=$('[data-hero-num]'),productEl=$('[data-hero-product]'),statusEl=$('[data-hero-status]');
	const fillEl=$('[data-hero-fill]'),kpiActive=$('[data-kpi="active"]'),kpiDone=$('[data-kpi="done"]');
	function upd(){
		const o=ORDERS[idx%ORDERS.length];
		if(numEl)numEl.textContent=o.num;
		if(productEl)productEl.textContent=o.product;
		if(statusEl)statusEl.textContent=o.status;
		if(fillEl)fillEl.style.width=`${30+(idx%4)*18}%`;
		if(kpiActive)kpiActive.textContent=12-(idx%3);
		if(kpiDone)kpiDone.textContent=38+idx;
		idx++;
	}
	upd(); setInterval(upd,3000);
})();

// Peakstrip
(()=>{
	const list=$('[data-peakstrip]');
	if(!list)return;
	const EVT=[
		{label:'14 февраля',name:'День влюблённых',month:1,day:14},
		{label:'8 марта',name:'Женский день',month:2,day:8},
		{label:'1 сентября',name:'День знаний',month:8,day:1},
		{label:'4 ноября',name:'День народного единства',month:10,day:4},
	];
	const now=new Date();
	const sorted=EVT.map(e=>{
		let d=new Date(now.getFullYear(),e.month,e.day);
		if(d<now)d=new Date(now.getFullYear()+1,e.month,e.day);
		return{...e,diff:Math.ceil((d-now)/86400000)};
	}).sort((a,b)=>a.diff-b.diff);
	list.innerHTML=sorted.map((e,i)=>`<li class="peakstrip__item${i===0?' is-next':''}"><span class="peakstrip__num pixel">${e.diff}</span><span class="peakstrip__label">${plural(e.diff,['день','дня','дней'])} до ${e.label}<small>${e.name}</small></span></li>`).join('');
})();

// Video player — главы читаются из HTML атрибутов data-at/data-title/data-text/data-time/data-icon
// Video player
(() => {
    const wrap = $('[data-film]');
    if (!wrap) return;

    const video = $('[data-film-video]', wrap);
    const fallback = $('[data-film-fallback]', wrap);
    const playBtn = $('[data-film-play]', wrap);
    const clockEl = $('[data-film-time]', wrap);
    const toastEl = $('[data-film-toast]', wrap);
    const toastTitle = $('[data-film-title]', wrap);
    const toastText = $('[data-film-text]', wrap);
    const toastIconUse = $('[data-film-icon] use', wrap);
   const chapterBtns = $$('.chapter');

    const chapters = chapterBtns.map(btn => ({
        el: btn,
        at: Number(btn.dataset.at) || 0,
        time: btn.dataset.time || '00:00',
        title: btn.dataset.title ||
            btn.querySelector('.chapter__title')?.textContent.trim() || '',
        text: btn.dataset.text || '',
        icon: btn.dataset.icon || '#i-bag'
    }));

    if (!chapters.length) return;

    let activeChapter = -1;
    let swapTimer;

    function showToast(chapter) {
        if (!toastEl) return;

        clearTimeout(swapTimer);

        // Скрываем уведомление перед сменой содержимого
        toastEl.classList.remove('is-shown');
        toastEl.classList.add('is-swapping');

        swapTimer = setTimeout(() => {
            if (toastTitle) toastTitle.textContent = chapter.title;
            if (toastText) toastText.textContent = chapter.text;

            if (toastIconUse) {
                toastIconUse.setAttribute('href', chapter.icon);
            }

            toastEl.classList.remove('is-swapping');

            // Перезапускаем появление
            void toastEl.offsetWidth;
            requestAnimationFrame(() => {
                toastEl.classList.add('is-shown');
            });
        }, 180);
    }

    function activateChapter(index) {
        if (index < 0 || index >= chapters.length) return;

        const chapter = chapters[index];

        chapters.forEach((item, i) => {
            item.el.setAttribute('aria-pressed', String(i === index));
            item.el.classList.toggle('is-complete', i < index);
            item.el.style.setProperty('--p', i <= index ? '1' : '0');
        });

        if (clockEl) clockEl.textContent = chapter.time;

        showToast(chapter);
        activeChapter = index;
    }

    function getChapterIndex(progress) {
        let index = 0;

        chapters.forEach((chapter, i) => {
            // Seeking can round the requested timestamp a few microseconds down.
            if (progress + 0.00001 >= chapter.at) index = i;
        });

        return index;
    }

    // Начальное состояние
    if (toastEl) {
        toastEl.classList.remove('is-shown');
        toastEl.classList.add('is-swapping');
    }

    activateChapter(0);

    // Воспроизведение и синхронизация глав
    if (video) {
        video.addEventListener('timeupdate', () => {
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;

            const progress = video.currentTime / video.duration;
            const index = getChapterIndex(progress);

            if (index !== activeChapter) {
                activateChapter(index);
            }
        });

        video.addEventListener('play', () => {
            if (playBtn) {
                playBtn.innerHTML =
                    '<svg aria-hidden="true"><use href="#i-pause"></use></svg>';
                playBtn.setAttribute('aria-label', 'Пауза');
            }
        });

        video.addEventListener('pause', () => {
            if (playBtn) {
                playBtn.innerHTML =
                    '<svg aria-hidden="true"><use href="#i-play"></use></svg>';
                playBtn.setAttribute('aria-label', 'Играть');
            }
        });

        playBtn?.addEventListener('click', () => {
            if (video.paused) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });

        chapterBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const chapter = chapters[index];

                if (Number.isFinite(video.duration) && video.duration > 0) {
                    video.currentTime = chapter.at * video.duration;
                }

                activateChapter(index);
            });
        });

        video.play().catch(() => {
    // Не скрываем видео, если браузер запретил автозапуск.
    if (playBtn) {
        playBtn.innerHTML =
            '<svg aria-hidden="true"><use href="#i-play"></use></svg>';
        playBtn.setAttribute('aria-label', 'Играть');
    }
});
    } else {
        // Если видео отсутствует, всё равно показываем смену этапов
        let step = 0;

        setInterval(() => {
            step = (step + 1) % chapters.length;
            activateChapter(step);
        }, 2800);
    }
})();

// Пиковые дни
(()=>{ const c=document.querySelector('#peak'); if(c)initPeak(c); })();
initRevenue(document.querySelector('[data-revenue]'));

// CRM
(()=>{ const c=document.querySelector('#occasions'); if(c)initCRM(c,toast); })();

// Форма
(()=>{ initForm(document.querySelector('[data-connect-form]')); })();

// Demo tabs — переключение вкладок кабинета (только внутри #demo)
(()=>{
	const demoSection=document.getElementById('demo');
	if(!demoSection)return;
	// Берём только табы внутри demo-секции
	const tabs=$$('.demo-tab[data-tab]',demoSection);
	// Берём только панели внутри demo-секции
	const panels=$$('.demo-panel[id^="tab-"]',demoSection);
	if(!tabs.length)return;
	let activeMap=false,activeStock=false;

	function switchTab(id){
		tabs.forEach(t=>{ t.classList.toggle('is-active',t.dataset.tab===id); t.setAttribute('aria-selected',String(t.dataset.tab===id)); });
		panels.forEach(p=>{ const ok=p.id===`tab-${id}`; p.classList.toggle('is-active',ok); p.hidden=!ok; });
		// ленивая инициализация при первом показе
		const panel=demoSection.querySelector(`#tab-${id}`);
		if(!panel)return;
		if(id==='couriers'&&!activeMap){
			activeMap=true;
			initEkbMap(panel);
		}
		if(id==='stock'&&!activeStock){
			activeStock=true;
			initStock(panel);
		}
	}

	tabs.forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.tab)));

	// Мастерская — инициализируем сразу
	const workshop=demoSection.querySelector('[data-widget="workshop"]');
	if(workshop)initWorkshop(workshop);
})();
