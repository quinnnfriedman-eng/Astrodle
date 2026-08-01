
const astronauts=[
{name:"Neil Armstrong",nationality:"USA",gender:"Male",firstFlight:1966,missions:2,agency:"NASA"},
{name:"Buzz Aldrin",nationality:"USA",gender:"Male",firstFlight:1966,missions:2,agency:"NASA"},
{name:"Sally Ride",nationality:"USA",gender:"Female",firstFlight:1983,missions:2,agency:"NASA"},
{name:"Chris Hadfield",nationality:"Canada",gender:"Male",firstFlight:1995,missions:3,agency:"CSA"},
{name:"Samantha Cristoforetti",nationality:"Italy",gender:"Female",firstFlight:2014,missions:2,agency:"ESA"},
{name:"Yuri Gagarin",nationality:"USSR",gender:"Male",firstFlight:1961,missions:1,agency:"Soviet Space Program"},
{name:"Peggy Whitson",nationality:"USA",gender:"Female",firstFlight:2002,missions:5,agency:"NASA"},
{name:"Tim Peake",nationality:"United Kingdom",gender:"Male",firstFlight:2015,missions:1,agency:"ESA"},
];

const answer=astronauts[new Date().getDate()%astronauts.length];

const list=document.getElementById("names");
astronauts.forEach(a=>{
 let o=document.createElement("option");
 o.value=a.name;
 list.appendChild(o);
});

function cell(value,good){
 return `<td class="${good?'green':'red'}">${value}</td>`;
}

function compareNum(val,target){
 if(val===target) return `<td class="green">${val}</td>`;
 return `<td>${val} <span class="arrow">${val<target?'↑':'↓'}</span></td>`;
}

window.submitGuess=function(){
 const name=document.getElementById("guess").value;
 const g=astronauts.find(a=>a.name===name);
 if(!g){alert("Choose an astronaut from the list.");return;}
 const row=document.createElement("tr");
 row.innerHTML=
 `<td>${g.name}</td>`+
 cell(g.nationality,g.nationality===answer.nationality)+
 cell(g.gender,g.gender===answer.gender)+
 compareNum(g.firstFlight,answer.firstFlight)+
 compareNum(g.missions,answer.missions)+
 cell(g.agency,g.agency===answer.agency);
 document.querySelector("#board tbody").appendChild(row);
 if(g.name===answer.name){
   setTimeout(()=>alert("🎉 Correct! The astronaut was "+answer.name),100);
 }
 document.getElementById("guess").value="";
}
