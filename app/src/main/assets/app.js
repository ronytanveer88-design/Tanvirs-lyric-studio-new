(function(){
var $=function(id){return document.getElementById(id)};
window.$=$;
window.S={lines:[],times:[],cur:0,last:-1,hist:[],ratio:'16:9',bg:'rain',fontSize:64,color:'#ffffff',dim:35,bgImg:null,bgIsVideo:false,audioName:''};
var audio=$('audio');
var seeking=false;

window.fmt=function(t){
  if(!isFinite(t)||t<0)t=0;
  var d=Math.floor(t*10),m=Math.floor(d/600),s=Math.floor((d%600)/10);
  return m+':'+(s<10?'0':'')+s+'.'+(d%10);
};

var tt;
window.toast=function(msg){
  var e=$('toast');e.textContent=msg;e.style.display='block';
  clearTimeout(tt);tt=setTimeout(function(){e.style.display='none'},2500);
};

window.saveLocal=function(){
  try{localStorage.setItem('ls_proj',JSON.stringify({text:$('lyricsText').value,lines:S.lines,times:S.times}))}catch(e){}
};

window.lineAt=function(t){
  var idx=-1;
  for(var i=0;i<S.lines.length;i++){if(S.times[i]!=null&&S.times[i]<=t)idx=i;}
  return idx;
};

function pushHist(){
  S.hist.push({t:S.times.slice(),c:S.cur,l:S.last});
  if(S.hist.length>50)S.hist.shift();
}
function nextUnset(){
  for(var i=0;i<S.lines.length;i++){if(S.times[i]==null)return i;}
  return Math.max(0,S.lines.length-1);
}
function redrawNow(){if(window.redraw)window.redraw();}

/* ট্যাব বদল */
window.showTab=function(n){
  document.body.setAttribute('data-tab',n);
  var tabs=document.querySelectorAll('.tab'),btns=document.querySelectorAll('#nav button');
  for(var i=0;i<tabs.length;i++){tabs[i].classList.toggle('on',i==n);}
  for(var j=0;j<btns.length;j++){btns[j].classList.toggle('on',j==n);}
  if(window.applyRatio)window.applyRatio();
  redrawNow();
};
var navBtns=document.querySelectorAll('#nav button');
for(var b=0;b<navBtns.length;b++){
  navBtns[b].addEventListener('click',function(){showTab(this.getAttribute('data-t'));});
}

/* গান বাছাই */
$('audioFile').addEventListener('change',function(e){
  var f=e.target.files[0];if(!f)return;
  if(window.audioURL)URL.revokeObjectURL(window.audioURL);
  window.audioURL=URL.createObjectURL(f);
  S.audioName=f.name;
  audio.src=window.audioURL;audio.load();
  $('audioInfo').textContent='⏳ লোড হচ্ছে: '+f.name;
});
audio.addEventListener('loadedmetadata',function(){
  $('audioInfo').textContent='✅ '+S.audioName+' — '+fmt(audio.duration);
});
audio.addEventListener('error',function(){
  $('audioInfo').textContent='❌ গানটা খোলা যায়নি, অন্য ফাইল চেষ্টা করো';
});
audio.addEventListener('play',function(){$('playBtn').textContent='⏸ থামাও';});
audio.addEventListener('pause',function(){$('playBtn').textContent='▶ চালাও';});
audio.addEventListener('ended',function(){$('playBtn').textContent='▶ চালাও';});

/* লিরিক নিশ্চিত */
$('applyLyricsBtn').addEventListener('click',function(){
  var arr=$('lyricsText').value.split(/\r?\n/).map(function(s){return s.trim();}).filter(Boolean);
  if(!arr.length){toast('আগে লিরিক লেখো');return;}
  if(arr.join('\n')===S.lines.join('\n')){toast('লিরিক আগের মতোই আছে, সময়গুলো ঠিক আছে');return;}
  S.lines=arr;
  S.times=arr.map(function(){return null;});
  S.cur=0;S.last=-1;S.hist=[];
  $('lyricInfo').textContent='✅ '+arr.length+' লাইন নিশ্চিত হয়েছে';
  renderSyncList();saveLocal();redrawNow();
  toast('লিরিক নিশ্চিত! এবার "সিঙ্ক" ট্যাবে যাও');
});

/* সিঙ্ক তালিকা */
window.renderSyncList=function(){
  var box=$('syncList');box.innerHTML='';
  if(!S.lines.length){box.innerHTML='<p class="mut">আগে লিরিক নিশ্চিত করো</p>';return;}
  S.lines.forEach(function(txt,i){
    var d=document.createElement('div');
    d.className='ln'+(i===S.cur?' cur':'');
    var t=document.createElement('span');t.textContent=(i+1)+'. '+txt;
    var s=document.createElement('small');
    s.textContent=S.times[i]==null?'— সময় বাকি':'⏱ '+fmt(S.times[i]);
    d.appendChild(t);d.appendChild(s);
    d.addEventListener('click',function(){selectLine(i);});
    box.appendChild(d);
  });
  var c=box.children[S.cur];
  if(c&&c.scrollIntoView)c.scrollIntoView({block:'nearest'});
};
window.selectLine=function(i){
  S.cur=i;
  if(S.times[i]!=null){S.last=i;if(window.audioURL)audio.currentTime=S.times[i];}
  renderSyncList();redrawNow();
};

/* প্লে, সিক */
$('playBtn').addEventListener('click',function(){
  if(!window.audioURL){toast('আগে গান বাছাই করো');return;}
  if(audio.paused)audio.play();else audio.pause();
});
$('restartBtn').addEventListener('click',function(){
  if(!window.audioURL){toast('আগে গান বাছাই করো');return;}
  audio.currentTime=0;audio.play();
});
var seek=$('seek');
seek.addEventListener('pointerdown',function(){seeking=true;});
['pointerup','pointercancel','change'].forEach(function(ev){
  seek.addEventListener(ev,function(){seeking=false;});
});
seek.addEventListener('input',function(){
  if(!audio.duration)return;
  audio.currentTime=this.value/1000*audio.duration;
  redrawNow();
});

/* ট্যাপ করে সময় বসানো */
$('tapBtn').addEventListener('click',function(){
  if(!S.lines.length){toast('আগে লিরিক নিশ্চিত করো');return;}
  if(!window.audioURL){toast('আগে গান বাছাই করো');return;}
  pushHist();
  S.times[S.cur]=audio.currentTime;
  S.last=S.cur;
  if(S.cur<S.lines.length-1){S.cur++;}else{toast('🎉 সব লাইনের সময় দেওয়া শেষ!');}
  renderSyncList();saveLocal();redrawNow();
});
$('undoBtn').addEventListener('click',function(){
  if(!S.hist.length){toast('ফেরানোর মতো কিছু নেই');return;}
  var h=S.hist.pop();
  S.times=h.t;S.cur=h.c;S.last=h.l;
  renderSyncList();saveLocal();redrawNow();
});
function nudge(d){
  var i=S.last;
  if(i<0||S.times[i]==null){toast('আগে একটা লাইনের সময় দাও');return;}
  pushHist();
  S.times[i]=Math.max(0,S.times[i]+d);
  if(window.audioURL)audio.currentTime=S.times[i];
  renderSyncList();saveLocal();redrawNow();
}
$('nudgeM').addEventListener('click',function(){nudge(-0.1);});
$('nudgeP').addEventListener('click',function(){nudge(0.1);});

/* সময়ের লুপ */
function loop(){
  var t=audio.currentTime||0,dur=audio.duration||0;
  $('timeLabel').textContent=fmt(t)+' / '+fmt(dur);
  var li=lineAt(t);
  $('curLineLabel').textContent=S.lines.length?('লাইন '+(li+1)+'/'+S.lines.length):'';
  if(!seeking&&dur)seek.value=Math.round(t/dur*1000);
  if(document.body.getAttribute('data-tab')!=='0')redrawNow();
  requestAnimationFrame(loop);
}

/* আগের কাজ ফিরিয়ে আনা */
try{
  var p=JSON.parse(localStorage.getItem('ls_proj')||'null');
  if(p&&p.lines&&p.lines.length){
    $('lyricsText').value=p.text||'';
    S.lines=p.lines;
    S.times=p.times||[];
    while(S.times.length<S.lines.length)S.times.push(null);
    S.cur=nextUnset();
    $('lyricInfo').textContent='✅ আগের '+S.lines.length+' লাইন ফিরে এসেছে (গানটা আবার বাছাই করতে হবে)';
  }
}catch(e){}

renderSyncList();
showTab(0);
requestAnimationFrame(loop);

/* দ্বিতীয় অংশ লোড */
var sc=document.createElement('script');
sc.src='render.js';
document.body.appendChild(sc);
})();
