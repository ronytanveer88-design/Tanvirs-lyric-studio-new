(function(){
var cv=$('preview'),ctx=cv.getContext('2d');
var audio=$('audio'),bgVid=$('bgVideo');
var bgImg=null;
var rendering=false,cancelled=false,stopping=false,rec=null,chunks=[];
var actx=null,dest=null,srcNode=null;
var dims={'16:9':[1280,720],'9:16':[720,1280],'1:1':[960,960]};
var drops=[],rw=0,rh=0,lastNow=0;

/* ---------- বৃষ্টি ---------- */
function initRain(w,h){
  drops=[];rw=w;rh=h;
  var n=Math.floor(w/7);
  for(var i=0;i<n;i++){
    drops.push({x:Math.random()*w,y:Math.random()*h,l:12+Math.random()*22,v:700+Math.random()*700});
  }
}
function drawRain(w,h,sc,dt){
  if(!drops.length||rw!==w||rh!==h)initRain(w,h);
  ctx.strokeStyle='rgba(170,200,255,0.35)';
  ctx.lineWidth=Math.max(1,sc*1.3);
  ctx.beginPath();
  for(var i=0;i<drops.length;i++){
    var d=drops[i];
    d.y+=d.v*sc*dt;
    if(d.y>h){d.y=-d.l*sc;d.x=Math.random()*w;}
    ctx.moveTo(d.x,d.y);
    ctx.lineTo(d.x-d.l*sc*0.15,d.y+d.l*sc);
  }
  ctx.stroke();
}

/* ---------- সাহায্যকারী ---------- */
function cover(src,sw,sh,w,h){
  var r=Math.max(w/sw,h/sh),dw=sw*r,dh=sh*r;
  ctx.drawImage(src,(w-dw)/2,(h-dh)/2,dw,dh);
}
function wrap(text,maxW){
  var words=text.split(' '),out=[],cur='';
  words.forEach(function(wd){
    var test=cur?cur+' '+wd:wd;
    if(ctx.measureText(test).width>maxW&&cur){out.push(cur);cur=wd;}else{cur=test;}
  });
  if(cur)out.push(cur);
  return out;
}

/* ---------- একটাই আঁকার কোড (প্রিভিউ আর ভিডিও দুটোই এটা ব্যবহার করে) ---------- */
function drawFrame(t){
  var w=cv.width,h=cv.height,sc=Math.min(w,h)/720;
  var now=performance.now();
  var dt=Math.min(0.05,Math.max(0,(now-lastNow)/1000));
  lastNow=now;

  var drawn=false;
  if(S.bg==='media'){
    if(S.bgIsVideo&&bgVid.readyState>=2&&bgVid.videoWidth){
      cover(bgVid,bgVid.videoWidth,bgVid.videoHeight,w,h);drawn=true;
    }else if(!S.bgIsVideo&&bgImg&&bgImg.complete&&bgImg.naturalWidth){
      cover(bgImg,bgImg.naturalWidth,bgImg.naturalHeight,w,h);drawn=true;
    }
  }
  if(!drawn){
    var g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#070b14');g.addColorStop(1,'#111b2e');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    if(S.bg==='rain')drawRain(w,h,sc,dt);
  }else if(S.dim>0){
    ctx.fillStyle='rgba(0,0,0,'+(S.dim/100)+')';
    ctx.fillRect(0,0,w,h);
  }

  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.75)';
  ctx.shadowBlur=10*sc;

  if(!S.lines.length){
    if(!rendering){
      ctx.font='600 '+(30*sc)+'px "Noto Sans Bengali",sans-serif';
      ctx.fillStyle='rgba(255,255,255,0.5)';
      ctx.fillText('লিরিক নিশ্চিত করলে এখানে দেখা যাবে',w/2,h/2);
    }
    ctx.shadowBlur=0;
    return;
  }

  var li=lineAt(t);
  var maxW=w*0.86;
  var curH=0;

  if(li>=0){
    var size=S.fontSize*sc;
    ctx.font='700 '+size+'px "Noto Sans Bengali",sans-serif';
    var rows=wrap(S.lines[li],maxW);
    var lh=size*1.35;
    curH=rows.length*lh;
    var a=Math.min(1,Math.max(0,(t-S.times[li])/0.25));
    ctx.globalAlpha=a;
    ctx.fillStyle=S.color;
    var y0=h*0.5-curH/2+lh/2;
    for(var i=0;i<rows.length;i++)ctx.fillText(rows[i],w/2,y0+i*lh);
    ctx.globalAlpha=1;
  }

  var nxt=S.lines[li+1];
  if(nxt){
    var ns=S.fontSize*sc*0.55;
    ctx.font='600 '+ns+'px "Noto Sans Bengali",sans-serif';
    var nrows=wrap(nxt,maxW);
    var nlh=ns*1.35;
    ctx.globalAlpha=0.5;
    ctx.fillStyle=S.color;
    var ny=(li>=0)?(h*0.5+curH/2+nlh*0.9):(h*0.5-(nrows.length*nlh)/2+nlh/2);
    for(var j=0;j<nrows.length;j++)ctx.fillText(nrows[j],w/2,ny+j*nlh);
    ctx.globalAlpha=1;
  }
  ctx.shadowBlur=0;
}

window.redraw=function(){
  if(rendering)return;
  drawFrame(audio.currentTime||0);
};
window.applyRatio=function(){
  if(rendering)return;
  var d=dims[S.ratio];
  if(cv.width!==d[0]||cv.height!==d[1]){cv.width=d[0];cv.height=d[1];}
  redraw();
};

/* ---------- ডিজাইন ট্যাবের বোতাম ---------- */
function bindSeg(id,attr,fn){
  var btns=$(id).querySelectorAll('button');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(){
      if(rendering){toast('ভিডিও তৈরির সময় বদলানো যাবে না');return;}
      for(var k=0;k<btns.length;k++)btns[k].classList.remove('on');
      this.classList.add('on');
      fn(this.getAttribute(attr));
    });
  }
}
bindSeg('ratioSeg','data-r',function(v){S.ratio=v;applyRatio();});
bindSeg('bgSeg','data-bg',function(v){
  S.bg=v;
  $('mediaBox').hidden=(v!=='media');
  redraw();
});
$('fontSize').addEventListener('input',function(){S.fontSize=+this.value;redraw();});
$('textColor').addEventListener('input',function(){S.color=this.value;redraw();});
$('dim').addEventListener('input',function(){S.dim=+this.value;redraw();});

$('bgFile').addEventListener('change',function(e){
  var f=e.target.files[0];if(!f)return;
  if(window.bgURL)URL.revokeObjectURL(window.bgURL);
  window.bgURL=URL.createObjectURL(f);
  var isVid=(f.type&&f.type.indexOf('video')===0)||/\.(mp4|webm|mkv|mov|3gp)$/i.test(f.name);
  if(isVid){
    S.bgIsVideo=true;bgImg=null;
    bgVid.src=window.bgURL;
    var p=bgVid.play();if(p&&p.catch)p.catch(function(){});
  }else{
    S.bgIsVideo=false;
    bgVid.pause();bgVid.removeAttribute('src');bgVid.load();
    var im=new Image();
    im.onload=function(){redraw();};
    im.src=window.bgURL;
    bgImg=im;
  }
  $('bgInfo').textContent='✅ '+f.name;
});

/* ---------- ফোনে সেভ ---------- */
window.saveBlob=function(blob,name,mime,done){
  if(!window.AndroidSave){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    if(done)done(true);
    return;
  }
  var id=AndroidSave.begin(name,mime);
  if(!id){toast('সেভ শুরু করা গেল না');if(done)done(false);return;}
  var CH=786432,pos=0;
  function next(){
    if(pos>=blob.size){
      var ok=AndroidSave.finish(id);
      if(done)done(ok);
      return;
    }
    var fr=new FileReader();
    fr.onload=function(){
      var s=String(fr.result);
      var b64=s.substring(s.indexOf(',')+1);
      if(!AndroidSave.chunk(id,b64)){
        toast('ফাইল লিখতে সমস্যা হয়েছে');
        if(done)done(false);
        return;
      }
      pos+=CH;
      var pct=Math.min(100,Math.round(pos/blob.size*100));
      $('renderStatus').textContent='💾 সেভ হচ্ছে… '+pct+'%';
      setTimeout(next,0);
    };
    fr.onerror=function(){toast('ফাইল পড়তে সমস্যা হয়েছে');if(done)done(false);};
    fr.readAsDataURL(blob.slice(pos,pos+CH));
  }
  next();
};

function buildLrc(){
  var out=[];
  S.lines.forEach(function(l,i){
    if(S.times[i]!=null){
      var t=S.times[i],m=Math.floor(t/60),s=t-m*60;
      out.push('['+(m<10?'0':'')+m+':'+(s<10?'0':'')+s.toFixed(2)+'] '+l);
    }
  });
  return out.join('\n');
}
$('saveLrcBtn').addEventListener('click',function(){
  var txt=buildLrc();
  if(!txt){toast('আগে সিঙ্ক ট্যাবে সময় দাও');return;}
  saveBlob(new Blob([txt],{type:'text/plain'}),'lyrics_'+Date.now()+'.lrc','application/octet-stream');
});
$('saveProjBtn').addEventListener('click',function(){
  if(!S.lines.length){toast('আগে লিরিক নিশ্চিত করো');return;}
  var data={
    text:$('lyricsText').value,lines:S.lines,times:S.times,audioName:S.audioName,
    settings:{ratio:S.ratio,bg:S.bg,fontSize:S.fontSize,color:S.color,dim:S.dim}
  };
  saveBlob(new Blob([JSON.stringify(data)],{type:'application/json'}),'LyricProject_'+Date.now()+'.json','application/json');
});

/* ---------- ভিডিও বানানো ---------- */
function setupAudio(){
  if(!actx){
    var AC=window.AudioContext||window.webkitAudioContext;
    actx=new AC();
    dest=actx.createMediaStreamDestination();
    srcNode=actx.createMediaElementSource(audio);
    srcNode.connect(dest);
    srcNode.connect(actx.destination);
  }
  if(actx.state==='suspended')actx.resume();
}
function pickMime(){
  var c=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(var i=0;i<c.length;i++){
    if(window.MediaRecorder&&MediaRecorder.isTypeSupported(c[i]))return c[i];
  }
  return '';
}
function resetBtn(){$('renderBtn').textContent='🎬 ভিডিও বানাও';}
function stopRec(){
  if(rec&&rec.state!=='inactive'){audio.pause();rec.stop();}
}
function rloop(){
  if(!rendering)return;
  var t=audio.currentTime,d=audio.duration||1;
  drawFrame(t);
  var pct=Math.min(100,Math.round(t/d*100));
  $('progress').style.width=pct+'%';
  $('renderStatus').textContent='🎬 ভিডিও তৈরি হচ্ছে… '+pct+'%';
  if(!stopping&&(audio.ended||t>=d-0.05)){
    stopping=true;
    setTimeout(stopRec,400);
  }
  requestAnimationFrame(rloop);
}
function onRecStop(){
  rendering=false;
  resetBtn();
  audio.pause();audio.currentTime=0;
  applyRatio();
  if(cancelled){
    $('renderStatus').textContent='বন্ধ করা হয়েছে';
    $('progress').style.width='0';
    return;
  }
  var blob=new Blob(chunks,{type:'video/webm'});
  chunks=[];
  $('renderStatus').textContent='💾 সেভ হচ্ছে…';
  saveBlob(blob,'LyricVideo_'+Date.now()+'.webm','video/webm',function(ok){
    $('renderStatus').textContent=ok?'✅ ভিডিও সেভ হয়েছে: Downloads/LyricStudio ফোল্ডারে':'❌ সেভ হয়নি, আবার চেষ্টা করো';
  });
}
function abortRender(msg){
  rendering=false;resetBtn();
  if(msg)toast(msg);
}

$('renderBtn').addEventListener('click',function(){
  if(rendering){cancelled=true;stopRec();return;}
  if(!S.lines.length){toast('আগে লিরিক নিশ্চিত করো');return;}
  if(!window.audioURL){toast('আগে গান বাছাই করো');return;}
  var any=S.times.some(function(x){return x!=null;});
  if(!any){toast('আগে সিঙ্ক ট্যাবে সময় দাও');return;}
  if(!window.MediaRecorder){toast('এই ফোনে ভিডিও বানানো সম্ভব না');return;}

  try{setupAudio();}catch(e){toast('অডিও চালু করা গেল না');return;}
  var stream=cv.captureStream(30);
  var at=dest.stream.getAudioTracks();
  if(at.length)stream.addTrack(at[0]);

  var opts={videoBitsPerSecond:5000000,audioBitsPerSecond:192000};
  var mime=pickMime();
  if(mime)opts.mimeType=mime;
  try{rec=new MediaRecorder(stream,opts);}
  catch(e){toast('রেকর্ডার চালু করা গেল না');return;}

  chunks=[];cancelled=false;stopping=false;
  rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=onRecStop;

  rendering=true;
  $('renderBtn').textContent='⛔ বন্ধ করো';
  $('progress').style.width='0';
  audio.pause();audio.currentTime=0;

  var begin=function(){
    rec.start(1000);
    lastNow=performance.now();
    requestAnimationFrame(rloop);
  };
  var p=audio.play();
  if(p&&p.then){p.then(begin).catch(function(){abortRender('গান চালানো যায়নি');});}
  else{begin();}
});

/* ---------- শুরুর অবস্থা ---------- */
applyRatio();
})();
