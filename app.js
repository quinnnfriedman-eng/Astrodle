const MAX=6;
let astronauts=[],answer=null,mode="daily",tries=0,active=-1,matches=[];
const used=new Set();
const $=id=>document.getElementById(id);
const input=$("guess"),suggestions=$("suggestions"),board=$("board"),status=$("status");
const descriptions={daily:"Everyone gets the same astronaut today.",random:"A different astronaut is selected every refresh.",practice:"Unlimited random rounds with a Next button."};

function dayIndex(n){
  const d=new Date();
  const day=Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/86400000);
  return ((day*2654435761)>>>0)%n;
}
function pick(){
  if(mode==="daily") answer=astronauts[dayIndex(astronauts.length)];
  else{
    const old=answer?.name;
    do answer=astronauts[Math.floor(Math.random()*astronauts.length)];
    while(astronauts.length>1&&answer.name===old);
  }
}
function reset(){
  tries=0;used.clear();board.innerHTML="";$("result").classList.add("hidden");
  $("nextButton").classList.add("hidden");$("randomButton").classList.add("hidden");
  input.disabled=false;$("guessButton").disabled=false;input.value="";closeList();pick();update();input.focus();
}
function update(){status.textContent=`${astronauts.length} astronauts loaded — ${MAX-tries} guesses left.`}
function closeList(){suggestions.classList.remove("open");suggestions.innerHTML="";matches=[];active=-1}
function findMatches(q){
  q=q.trim().toLowerCase();if(!q)return[];
  return astronauts.filter(a=>!used.has(a.name)&&a.name.toLowerCase().includes(q))
    .sort((a,b)=>(!a.name.toLowerCase().startsWith(q))-(!b.name.toLowerCase().startsWith(q))||a.name.localeCompare(b.name))
    .slice(0,10);
}
function drawList(){
  matches=findMatches(input.value);active=-1;suggestions.innerHTML="";
  if(!matches.length){closeList();return}
  matches.forEach((a,i)=>{
    const b=document.createElement("button");b.className="suggestion";b.type="button";
    b.innerHTML=`<strong>${a.name}</strong><small>${a.nationality} · first flight ${a.firstFlight}</small>`;
    b.onmousedown=e=>{e.preventDefault();choose(i)};suggestions.appendChild(b);
  });suggestions.classList.add("open");
}
function choose(i){if(!matches[i])return;input.value=matches[i].name;closeList();input.focus()}
function move(n){
  if(!matches.length)return;active=(active+n+matches.length)%matches.length;
  [...suggestions.children].forEach((b,i)=>b.classList.toggle("active",i===active));
}
function textCell(v,ok){return`<td class="${ok?"green":"red"}">${v}</td>`}
function numCell(v,t){return v===t?`<td class="green">${v}</td>`:`<td class="red">${v} ${v<t?"↑":"↓"}</td>`}
function finish(win){
  input.disabled=true;$("guessButton").disabled=true;closeList();
  $("result").classList.remove("hidden");$("resultTitle").textContent=win?"🎉 Correct!":"Game over";
  $("resultText").textContent=`The astronaut was ${answer.name}.`;
  if(mode==="practice")$("nextButton").classList.remove("hidden");
  if(mode==="random")$("randomButton").classList.remove("hidden");
}
function submit(){
  const g=astronauts.find(a=>a.name.toLowerCase()===input.value.trim().toLowerCase());
  if(!g){alert("Choose an astronaut from the suggestions.");return}
  if(used.has(g.name)){alert("You already guessed that astronaut.");return}
  used.add(g.name);tries++;
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${g.name}</td>`+
    textCell(g.nationality,g.nationality===answer.nationality)+
    textCell(g.gender,g.gender===answer.gender)+
    numCell(g.firstFlight,answer.firstFlight)+numCell(g.missions,answer.missions)+
    textCell(g.agency,g.agency===answer.agency);
  board.appendChild(tr);input.value="";closeList();
  if(g.name===answer.name)finish(true);else if(tries>=MAX)finish(false);else{update();input.focus()}
}
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x===b));
  $("modeText").textContent=descriptions[mode];reset();
});
input.oninput=drawList;
input.onkeydown=e=>{
  if(e.key==="ArrowDown"){e.preventDefault();move(1)}
  else if(e.key==="ArrowUp"){e.preventDefault();move(-1)}
  else if(e.key==="Enter"){e.preventDefault();active>=0?choose(active):submit()}
  else if(e.key==="Escape")closeList();
};
input.onblur=()=>setTimeout(closeList,100);
$("guessButton").onclick=submit;$("nextButton").onclick=reset;$("randomButton").onclick=reset;

fetch("astronauts.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})
.then(data=>{astronauts=data.sort((a,b)=>a.name.localeCompare(b.name));reset()})
.catch(e=>{console.error(e);status.textContent="Could not load astronauts.json. Make sure it was uploaded beside app.js."});
