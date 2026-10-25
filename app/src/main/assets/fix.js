(function(){
window.renderSyncList=function(){
  var box=document.getElementById('syncList');
  var lc=document.getElementById('listCard');
  box.innerHTML='';
  if(!S.lines.length){
    box.innerHTML='<p class="mut">আগে লিরিক নিশ্চিত করো</p>';
    return;
  }
  S.lines.forEach(function(txt,i){
    var d=document.createElement('div');
    d.className='ln'+(i===S.cur?' cur':'');
    var t=document.createElement('span');
    t.textContent=(i+1)+'. '+txt;
    var s=document.createElement('small');
    s.textContent=S.times[i]==null?'— সময় বাকি':'⏱ '+fmt(S.times[i]);
    d.appendChild(t);d.appendChild(s);
    d.addEventListener('click',function(){selectLine(i);});
    box.appendChild(d);
  });
  var c=box.children[S.cur];
  if(c&&lc){lc.scrollTop=Math.max(0,c.offsetTop-70);}
};

var oldShow=window.showTab;
window.showTab=function(n){
  oldShow(n);
  if(String(n)==='1'){setTimeout(window.renderSyncList,60);}
};

window.renderSyncList();
})();
