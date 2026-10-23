/* ==========================================================================
   Виджет «Карта курьеров» — canvas
   ========================================================================== */
const DEPOT = { x: 0.5, y: 0.5 };
const DEL_N = [
	{x:.18,y:.22},{x:.72,y:.15},{x:.85,y:.45},{x:.65,y:.78},
	{x:.3,y:.82},{x:.12,y:.6},{x:.55,y:.3},{x:.4,y:.55},
	{x:.78,y:.65},{x:.25,y:.42},{x:.62,y:.52},{x:.88,y:.28},
];
const DEL_P = [...DEL_N,{x:.48,y:.15},{x:.15,y:.85},{x:.9,y:.8},{x:.33,y:.28},{x:.7,y:.42},{x:.55,y:.72}];
const C_AUTO=['#00ffff','#b1ec52','#00e5ff','#64ffda'];
const C_MAN=['#ff6b35','#ff9f00','#ff6b35','#e85d04'];

function buildRoutes(deliveries,mode){
	const n=deliveries.length;
	const nc=Math.min(4,Math.ceil(n/(mode==='auto'?3:2)));
	const routes=[];
	for(let i=0;i<nc;i++) routes.push({points:[],color:(mode==='auto'?C_AUTO:C_MAN)[i%4]});
	deliveries.forEach((d,idx)=>{
		if(mode==='auto'){
			const a=Math.atan2(d.y-.5,d.x-.5)+Math.PI;
			const s=Math.floor(a/(2*Math.PI/nc))%nc;
			routes[s].points.push(d);
		} else routes[idx%nc].points.push(d);
	});
	return routes;
}

function calcKpi(routes,mode){
	let total=0,maxR=0;
	for(const r of routes){
		let d=0,prev=DEPOT;
		for(const p of r.points){d+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}
		d+=Math.hypot(DEPOT.x-prev.x,DEPOT.y-prev.y);
		total+=d;maxR=Math.max(maxR,d);
	}
	const f=mode==='auto'?.78:1;
	return{avg:`${Math.round(maxR*120*f)} мин`,late:`${mode==='auto'?0:Math.round(routes.length*1.5)}`,km:`${Math.round(total*25*f)} км`};
}

let _aT=0,_aH=null;

export function initMap(widgetEl){
	const canvas=widgetEl.querySelector('[data-map-canvas]');
	if(!canvas)return;
	const dayEl=widgetEl.querySelector('[data-map-day]');
	const modeEl=widgetEl.querySelector('[data-map-mode]');
	const couriersEl=widgetEl.querySelector('[data-map-couriers]');
	const kpiAvg=widgetEl.querySelector('[data-map-kpi="avg"]');
	const kpiLate=widgetEl.querySelector('[data-map-kpi="late"]');
	const kpiKm=widgetEl.querySelector('[data-map-kpi="km"]');
	let day='normal',mode='auto';

	function draw(){
		const dels=day==='peak'?DEL_P:DEL_N;
		const routes=buildRoutes(dels,mode);
		const kpi=calcKpi(routes,mode);
		const rect=canvas.getBoundingClientRect();
		if(!rect.width)return;
		const dpr=window.devicePixelRatio||1;
		canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
		const ctx=canvas.getContext('2d');
		ctx.scale(dpr,dpr);
		const W=rect.width,H=rect.height;
		const px=n=>n*W,py=n=>n*H;
		ctx.fillStyle='#f5f0e8';ctx.fillRect(0,0,W,H);
		ctx.strokeStyle='#e8e0d0';ctx.lineWidth=1.5;
		for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,H*(.1+i*.115));ctx.lineTo(W,H*(.1+i*.115+.03));ctx.stroke();}
		for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(W*(.1+i*.16),0);ctx.lineTo(W*(.12+i*.16),H);ctx.stroke();}
		const t=(_aT%120)/120;
		routes.forEach(r=>{
			if(!r.points.length)return;
			const path=[DEPOT,...r.points,DEPOT];
			ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=3;ctx.setLineDash([]);
			ctx.beginPath();path.forEach((p,i)=>i===0?ctx.moveTo(px(p.x),py(p.y)):ctx.lineTo(px(p.x),py(p.y)));ctx.stroke();
			ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.lineDashOffset=-t*9;ctx.globalAlpha=.8;
			ctx.beginPath();path.forEach((p,i)=>i===0?ctx.moveTo(px(p.x),py(p.y)):ctx.lineTo(px(p.x),py(p.y)));ctx.stroke();
			ctx.setLineDash([]);ctx.globalAlpha=1;
			r.points.forEach((p,i)=>{
				const done=t>(i+1)/(r.points.length+1);
				ctx.beginPath();ctx.arc(px(p.x),py(p.y),5,0,Math.PI*2);
				ctx.fillStyle=done?'#b1ec52':r.color;ctx.fill();
				ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
			});
		});
		ctx.beginPath();ctx.arc(px(DEPOT.x),py(DEPOT.y),8,0,Math.PI*2);
		ctx.fillStyle='#222';ctx.fill();ctx.strokeStyle='#00ffff';ctx.lineWidth=2;ctx.stroke();
		if(kpiAvg)kpiAvg.textContent=kpi.avg;
		if(kpiLate)kpiLate.textContent=kpi.late;
		if(kpiKm)kpiKm.textContent=kpi.km;
		if(couriersEl)couriersEl.innerHTML=routes.map((r,i)=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555;padding:2px 8px;background:#fff;border-radius:4px"><span style="width:8px;height:8px;border-radius:50%;background:${r.color};display:inline-block"></span>К${i+1}: ${r.points.length} адр.</div>`).join('');
	}

	function upd(el,v){el?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===v)));}

	dayEl?.addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;day=b.dataset.value;upd(dayEl,day);draw();});
	modeEl?.addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;mode=b.dataset.value;upd(modeEl,mode);draw();});

	if(!_aH){
		const loop=()=>{_aT++;draw();_aH=requestAnimationFrame(loop);};
		_aH=requestAnimationFrame(loop);
	}
	new ResizeObserver(()=>draw()).observe(canvas.parentElement||canvas);
	draw();
}
