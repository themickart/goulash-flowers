/* CRM демо — напоминания о поводах */
const MONTHS_GEN=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const fmtDay=d=>`${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
const rub=n=>`${Math.round(n).toLocaleString('ru-RU')} ₽`;
const plural=(n,[one,few,many])=>{const a=Math.abs(n)%100,b=a%10;if(a>10&&a<20)return many;if(b>1&&b<5)return few;if(b===1)return one;return many;};
const SEGMENTS={all:'Все',sleep:'Давно не покупали',regular:'Постоянные',new:'Новые'};
const CLIENTS=[
	{id:1,name:'Анна Петрова',who:'день рождения мужа',in:3,last:'Пионы, 15 шт',sum:4900,seg:'regular',orders:8},
	{id:2,name:'Михаил Орлов',who:'годовщина свадьбы',in:5,last:'Розы, 25 шт',sum:6800,seg:'regular',orders:5},
	{id:3,name:'Светлана Ким',who:'8 марта маме',in:8,last:'Тюльпаны, 21 шт',sum:3500,seg:'new',orders:1},
	{id:4,name:'Дмитрий Зайцев',who:'день рождения дочери',in:10,last:'Хризантемы',sum:2800,seg:'sleep',orders:2},
	{id:5,name:'Ольга Смирнова',who:'юбилей свекрови',in:12,last:'Букет микс',sum:5500,seg:'regular',orders:11},
	{id:6,name:'Артём Лебедев',who:'14 февраля',in:14,last:'Монобукет розы',sum:7200,seg:'new',orders:1},
	{id:7,name:'Лейла Ахмедова',who:'день рождения подруги',in:18,last:'Пионы, 15 шт',sum:4900,seg:'sleep',orders:3},
];

export function initCRM(container,toastFn){
	const listEl=container.querySelector('[data-crm-list]');
	const segEl=container.querySelector('[data-crm-segments]');
	const pushEl=container.querySelector('[data-crm-push]');
	const sendBtn=container.querySelector('[data-crm-send]');
	const summaryEl=container.querySelector('[data-crm-summary]');
	const phoneNotification=container.querySelector('[data-phone-notification]');
	const phoneHint=container.querySelector('[data-phone-hint]');
	const phoneDate=container.querySelector('.push-phone__date');
	if(phoneDate)phoneDate.textContent=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
	if(!listEl)return;
	let range=14,seg='all',tpl='remind',sel=1;
	const sent=new Set();
	const visible=()=>CLIENTS.filter(c=>c.in<=range&&(seg==='all'||c.seg===seg)).sort((a,b)=>a.in-b.in);
	const pushFor=c=>{
		const first=c.name.split(' ')[0],date=fmtDay(addDays(new Date(),c.in)),days=`${c.in} ${plural(c.in,['день','дня','дней'])}`;
		if(tpl==='repeat')return{title:`Повторить «${c.last}»?`,text:`${first}, тот же букет. ${rub(c.sum)}, доставим ${date}.`};
		if(tpl==='promo')return{title:`−10% к поводу: ${c.who}`,text:`${first}, промокод ПОВОД10 до ${date}.`};
		return{title:`Через ${days}: ${c.who}`,text:`${first}, в прошлый раз — «${c.last}». Соберём такой же?`};
	};
	const renderPush=()=>{
		const c=CLIENTS.find(x=>x.id===sel);
		if(!c){pushEl.textContent='Выберите клиента';if(phoneNotification)phoneNotification.replaceChildren();if(phoneHint)phoneHint.textContent='В этом сегменте нет клиентов с поводами';sendBtn.disabled=true;sendBtn.textContent='Отправить демо-push';return;}
		const p=pushFor(c);
		pushEl.innerHTML=`<p class="push-preview__recipient">Получатель: <b>${c.name}</b></p><p>${p.text}</p>`;
		if(phoneNotification){
			phoneNotification.innerHTML=`<div class="push"><div class="push__app"><span class="push__icon"><svg aria-hidden="true" width="22" height="22"><use href="#logo-mark"/></svg></span><b>Аленький цветочек</b><span class="push__now">сейчас</span></div><div class="push__title">${p.title}</div><div class="push__text">${p.text}</div></div>`;
		}
		if(phoneHint)phoneHint.textContent=sent.has(c.id)?'Демо: уведомление доставлено ✓':'Так клиент увидит ваше уведомление';
		sendBtn.disabled=sent.has(c.id);
		sendBtn.textContent=sent.has(c.id)?'Демо-push доставлен ✓':`Отправить демо-push: ${c.name.split(' ')[0]}`;
	};
	const render=()=>{
		const list=visible();
		if(!list.some(c=>c.id===sel))sel=list[0]?.id??null;
		listEl.innerHTML=list.length?list.map(c=>{
			const d=addDays(new Date(),c.in);
			return `<button class="client" type="button" data-client="${c.id}" aria-pressed="${c.id===sel}"><span class="client__date"><b>${d.getDate()}</b>${MONTHS_GEN[d.getMonth()].slice(0,3)}</span><span><span class="client__name">${c.name}</span><br><span class="client__info">${c.who} · ${c.orders} ${plural(c.orders,['заказ','заказа','заказов'])}</span></span><span class="client__status${sent.has(c.id)?' is-sent':''}">${sent.has(c.id)?'✓':`${c.in} дн.`}</span></button>`;
		}).join(''):`<div style="padding:24px;text-align:center;font-size:14px;color:var(--g-od-tertiary)">Поводов нет</div>`;
		const pot=list.reduce((s,c)=>s+c.sum,0);
		if(summaryEl)summaryEl.textContent=list.length?`${list.length} клиентов · ${rub(pot)}`:'';
		const inRange=CLIENTS.filter(c=>c.in<=range);
		segEl.innerHTML=Object.entries(SEGMENTS).map(([k,v])=>`<button class="chip" type="button" data-seg="${k}" aria-pressed="${k===seg}">${v}<span class="chip__count">${k==='all'?inRange.length:inRange.filter(c=>c.seg===k).length}</span></button>`).join('');
		renderPush();
	};
	container.querySelector('[data-crm-range]')?.addEventListener('click',e=>{const b=e.target.closest('[data-value]');if(!b)return;range=Number(b.dataset.value);container.querySelectorAll('[data-crm-range] button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.value===String(range))));render();});
	segEl?.addEventListener('click',e=>{const b=e.target.closest('[data-seg]');if(!b)return;seg=b.dataset.seg;render();});
	container.querySelector('[data-crm-template]')?.addEventListener('click',e=>{const b=e.target.closest('[data-value]');if(!b)return;tpl=b.dataset.value;container.querySelectorAll('[data-crm-template] button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.value===tpl)));renderPush();});
	listEl?.addEventListener('click',e=>{const b=e.target.closest('[data-client]');if(!b)return;sel=Number(b.dataset.client);render();});
	sendBtn?.addEventListener('click',()=>{
		if(!sel||sent.has(sel))return;
		sent.add(sel);render();
		if(phoneNotification){
			phoneNotification.classList.remove('is-arriving');
			void phoneNotification.offsetWidth;
			phoneNotification.classList.add('is-arriving');
		}
		if(toastFn)toastFn(`Демо-push доставлен: ${CLIENTS.find(c=>c.id===sel)?.name?.split(' ')[0]||''}`);
	});
	render();
}
