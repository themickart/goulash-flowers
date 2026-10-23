/* Карта Екатеринбурга — виджет маршрутов (стиль goulash-landing-main) */
const CYAN='#00ffff',GREEN='#b1ec52';
const KITCHEN={x:943,y:762};
const VIEW={x1:300,y1:200,x2:1700,y2:1300};

const DELS=[
  {x:680,y:520,time:32},{x:1180,y:480,time:28},{x:1380,y:700,time:41},
  {x:1200,y:980,time:35},{x:760,y:1060,time:45},{x:560,y:760,time:24},
  {x:840,y:380,time:29},{x:1480,y:520,time:38},{x:1080,y:1180,time:52},
  {x:480,y:620,time:36},{x:700,y:280,time:55},{x:1320,y:1080,time:48},
  {x:320,y:880,time:61},{x:1600,y:880,time:44},
];

const CRS_AUTO=[
  {c:CYAN,     pts:[0,6,10,1]},
  {c:GREEN,    pts:[2,7,13,3,11]},
  {c:'#00e5ff',pts:[4,8,9,12,5]},
];
const CRS_MAN=[
  {c:'#ff6b35',pts:[0,3,6]},
  {c:'#ff9f00',pts:[1,4,7]},
  {c:'#ff4f93',pts:[2,5]},
  {c:'#c9a2ff',pts:[8,9]},
];

let _D=null;
async function loadMap(){
  if(_D)return _D;
  const r=await fetch('./data/ekb-map.json');
  _D=await r.json();
  return _D;
}

function m2c(mx,my,W,H){
  const vw=VIEW.x2-VIEW.x1,vh=VIEW.y2-VIEW.y1;
  return{x:((mx-VIEW.x1)/vw)*W,y:((my-VIEW.y1)/vh)*H};
}

function drawBase(ctx,D,W,H){
  const vw=VIEW.x2-VIEW.x1,vh=VIEW.y2-VIEW.y1;
  const sx=W/vw,sy=H/vh;
  ctx.fillStyle='#0d0f12';ctx.fillRect(0,0,W,H);
  function poly(list,a,lw,color){
    ctx.strokeStyle=color||'#fff';ctx.lineWidth=lw;ctx.globalAlpha=a;ctx.beginPath();
    for(const s of list){for(let i=0;i<s.length;i+=2){const px=(s[i]-VIEW.x1)*sx,py=(s[i+1]-VIEW.y1)*sy;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}}
    ctx.stroke();
  }
  poly(D.roads[2]||[],0.07,0.5);poly(D.roads[1]||[],0.16,0.9);poly(D.roads[0]||[],0.35,1.4);
  ctx.shadowColor=CYAN;ctx.shadowBlur=7;
  poly(D.roads[0]||[],0.75,1.5,CYAN);poly(D.roads[1]||[],0.45,0.8,CYAN);
  ctx.shadowBlur=0;ctx.globalAlpha=1;
}

let _aT=0,_aH=null;

export async function initEkbMap(widgetEl){
  const wrap=widgetEl.querySelector('[data-ekb-map]');
  const canvas=widgetEl.querySelector('[data-ekb-canvas]');
  const statusEl=widgetEl.querySelector('[data-ekb-status]');
  const modeEl=widgetEl.querySelector('[data-ekb-mode]');
  const kpO=widgetEl.querySelector('[data-ekb-kpi="orders"]');
  const kpC=widgetEl.querySelector('[data-ekb-kpi="couriers"]');
  const kpA=widgetEl.querySelector('[data-ekb-kpi="avg"]');
  if(!canvas)return;
  let mode='auto';
  if(statusEl)statusEl.textContent='Загрузка карты…';
  let D;

  function crs(){return mode==='auto'?CRS_AUTO:CRS_MAN;}
  function dels(){return mode==='auto'?DELS:DELS.slice(0,10);}

  function upd(){
    const d=dels(),c=crs();
    const avg=Math.round(d.reduce((s,x)=>s+x.time,0)/d.length * (mode==='auto'?1:1.45));
    if(kpO)kpO.textContent=d.length;
    if(kpC)kpC.textContent=c.length;
    if(kpA)kpA.textContent=avg+' мин';
    if(statusEl)statusEl.textContent=mode==='auto'?'✓ Маршруты оптимизированы · демо смены':'Ручное распределение · демо смены';
  }

  function draw(){
    if(!D)return;
    const rect=wrap.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1,W=rect.width,H=rect.height;
    if(!W||!H)return;
    canvas.width=W*dpr;canvas.height=H*dpr;
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    drawBase(ctx,D,W,H);
    const t=(_aT%180)/180;
    const d=dels(),c=crs();
    c.forEach((cr,ci)=>{
      const pts=cr.pts.filter(i=>i<d.length);
      if(!pts.length)return;
      const path=[KITCHEN,...pts.map(i=>d[i]),KITCHEN];
      ctx.strokeStyle=cr.c;ctx.lineWidth=2;ctx.setLineDash([6,5]);
      ctx.lineDashOffset=-t*11-ci*4;ctx.globalAlpha=0.75;
      ctx.shadowColor=cr.c;ctx.shadowBlur=8;
      ctx.beginPath();
      path.forEach((p,i)=>{const q=m2c(p.x,p.y,W,H);i===0?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);});
      ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.globalAlpha=1;
      pts.forEach((pi,k)=>{
        const p=d[pi],q=m2c(p.x,p.y,W,H);
        const done=t>(k+1)/(pts.length+1);
        ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);
        ctx.fillStyle=done?GREEN:cr.c;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      });
    });
    // депо
    const kit=m2c(KITCHEN.x,KITCHEN.y,W,H);
    ctx.beginPath();ctx.arc(kit.x,kit.y,8,0,Math.PI*2);ctx.fillStyle='#222';ctx.fill();
    ctx.strokeStyle=CYAN;ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath();ctx.arc(kit.x,kit.y,8+Math.sin(_aT*.07)*4,0,Math.PI*2);
    ctx.strokeStyle=CYAN;ctx.globalAlpha=.3;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
  }

  function start(){if(_aH)return;const l=()=>{_aT++;draw();_aH=requestAnimationFrame(l);};_aH=requestAnimationFrame(l);}
  function stop(){if(_aH){cancelAnimationFrame(_aH);_aH=null;}}

  modeEl?.addEventListener('click',e=>{
    const b=e.target.closest('[data-value]');if(!b)return;
    mode=b.dataset.value;
    modeEl.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.value===mode)));
    if(statusEl)statusEl.textContent=mode==='auto'?'✓ Маршруты оптимизированы':'⚠ Ручное распределение';
    upd();
  });

  new ResizeObserver(()=>draw()).observe(wrap);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  upd();
  try{D=await loadMap();}catch(e){if(statusEl)statusEl.textContent='Не удалось загрузить карту. Показатели демо доступны.';return;}
  start();
}
