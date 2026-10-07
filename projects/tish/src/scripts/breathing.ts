import { breathingPhase } from '../data/care';
const root=document.querySelector<HTMLElement>('.breathing');
if(root){
  const button=document.querySelector<HTMLButtonElement>('#breath-start')!;
  button.disabled=false;
  const reset=document.querySelector<HTMLButtonElement>('#breath-reset')!;
  const instruction=document.querySelector<HTMLElement>('#breath-instruction')!;
  const time=document.querySelector<HTMLElement>('#breath-time')!;
  const progress=document.querySelector<HTMLProgressElement>('#breath-progress')!;
  let elapsed=0;let accumulated=0;let startedAt=0;let running=false;let interval:ReturnType<typeof setInterval>|undefined;let lastPhase='';
  function render(){
    const {remaining,phase}=breathingPhase(elapsed);
    progress.value=Math.min(60,elapsed);time.textContent=`${remaining} сек`;
    if(phase!==lastPhase){
      lastPhase=phase;root!.dataset.phase=phase;
      instruction.textContent=phase==='inhale'?'Мягкий вдох':phase==='exhale'?'Спокойный выдох':'Спасибо за эту минуту';
    }
    if(phase==='done'){
      running=false;clearInterval(interval);root!.dataset.state='done';button.textContent='Ещё одна минута →';time.textContent='Можно остаться ещё';
    }
  }
  function pause(){
    if(!running)return;
    elapsed=Math.min(60,accumulated+(performance.now()-startedAt)/1000);running=false;clearInterval(interval);
    root!.dataset.state='paused';instruction.textContent='Пауза — в вашем ритме';button.textContent='Продолжить →';
  }
  button.addEventListener('click',()=>{
    if(running){pause();return;}
    if(elapsed>=60){elapsed=0;lastPhase='';}
    running=true;accumulated=elapsed;startedAt=performance.now();root.dataset.state='running';reset.hidden=false;button.textContent='Приостановить';lastPhase='';render();
    interval=setInterval(()=>{elapsed=accumulated+(performance.now()-startedAt)/1000;render();},100);
  });
  reset.addEventListener('click',()=>{clearInterval(interval);running=false;elapsed=0;lastPhase='';root.dataset.state='idle';delete root.dataset.phase;progress.value=0;time.textContent='60 секунд';instruction.textContent='Побудьте с собой';button.textContent='Начать паузу →';reset.hidden=true;button.focus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',()=>clearInterval(interval));
}
