(function(){
"use strict";
const AI_SERVER="http://127.0.0.1:8780";\nconst PROJECT_KEY="abrahamG4VideoProject";
const KEY="abrahamG4AIHistory";
function el(id){return document.getElementById(id)}
function escapeHTML(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function setStatus(t,kind){const e=el("abrahamAIStatus");if(e){e.textContent=t;e.className="abraham-ai-status "+(kind||"")}}
function history(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return[]}}
function saveHistory(items){localStorage.setItem(KEY,JSON.stringify(items.slice(-12)))}
function addMessage(role,text){const box=el("abrahamAIChat");if(!box)return;const item=document.createElement("div");item.className="abraham-ai-msg "+role;item.innerHTML="<span>"+(role==="assistant"?"ABRAHAM AI":"TÚ")+"</span><p>"+escapeHTML(text).replace(/\n/g,"<br>")+"</p>";box.appendChild(item);box.scrollTop=box.scrollHeight}
function aplicarRespuestaAlProyecto(texto){
 try{
  const p=JSON.parse(localStorage.getItem(PROJECT_KEY)||"null");
  if(!p)return false;
  const lineas=String(texto||"").split(/\\n+/).map(x=>x.trim()).filter(Boolean);
  const utiles=lineas.filter(x=>x.length>25 && !/^(hook|estructura|estilo|nota|perfecto)/i.test(x));
  p.ai={ultima_respuesta:texto,actualizado_en:new Date().toISOString()};
  if(utiles.length){p.ai.sugerencias=utiles.slice(0,8);}
  localStorage.setItem(PROJECT_KEY,JSON.stringify(p));
  return true;
 }catch(e){return false}
}
function localBrain(prompt){
 const p=prompt.toLowerCase();
 let style=p.includes("top")?"top":p.includes("historia")?"historia":p.includes("teoría")||p.includes("teoria")?"teoria":"curiosidades";
 let tema=prompt.replace(/^(hazme|crea|genera|quiero|un video|un vídeo|sobre)/i,"").trim();
 if(!tema)tema="Marvel";
 const hooks={curiosidades:"Detén el scroll: hay detalles de este tema que casi nadie nota.",top:"Vamos directo al ranking: estas son las claves que tienes que conocer.",historia:"Antes de llegar al momento más importante, hay que entender cómo empezó todo.",teoria:"Hay una teoría que cambia la forma de ver esta historia, pero hay que separar pistas de hechos."};
 return "Perfecto. Prepararía un video de "+style+" sobre "+tema+".\n\nHOOK\n"+hooks[style]+"\n\nESTRUCTURA\n1. Hook de 3–5 segundos.\n2. Contexto breve para entender el tema.\n3. Tres ideas visuales con ritmo.\n4. Un cierre que invite a comentar.\n\nESTILO\nFrases cortas, narración natural, subtítulos claros y cortes visuales frecuentes.\n\nNota: esta vista local propone la estructura; cuando conectes el motor IA local, podré generar respuestas más elaboradas.";}
async function ask(prompt){
 setStatus("Pensando…","busy");
 try{const r=await fetch(AI_SERVER+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,context:{project:window.obtenerProyectoGuardado?window.obtenerProyectoGuardado():null}})});if(!r.ok)throw new Error("AI "+r.status);const d=await r.json();if(!d.text)throw new Error("Respuesta vacía");return d.text}catch(e){console.warn("ABRAHAM AI local no disponible",e);setStatus("Modo creativo local","local");return localBrain(prompt)}
}
async function send(){const input=el("abrahamAIInput");if(!input)return;const prompt=input.value.trim();if(!prompt)return;input.value="";addMessage("user",prompt);const h=history();h.push({role:"user",content:prompt});const reply=await ask(prompt);aplicarRespuestaAlProyecto(reply);addMessage("assistant",reply);h.push({role:"assistant",content:reply});saveHistory(h);setStatus("Listo","ok")}
function clearChat(){localStorage.removeItem(KEY);const box=el("abrahamAIChat");if(box)box.innerHTML="";addMessage("assistant","Listo. Dime qué quieres crear y trabajamos sobre tu idea.");setStatus("Listo","ok")}
function quick(t){const input=el("abrahamAIInput");if(input){input.value=t;input.focus()}}
function init(){const sendBtn=el("abrahamAISend"),input=el("abrahamAIInput"),clear=el("abrahamAIClear");if(!sendBtn||!input)return;sendBtn.addEventListener("click",send);clear&&clear.addEventListener("click",clearChat);input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});document.querySelectorAll("[data-ai-prompt]").forEach(b=>b.addEventListener("click",()=>quick(b.dataset.aiPrompt)));history().filter(x=>x.role==="user"||x.role==="assistant").forEach(x=>addMessage(x.role==="user"?"user":"assistant",x.content));if(!history().length)addMessage("assistant","Hola. Soy ABRAHAM AI, el asistente creativo de Marvel Hub. Puedo ayudarte a convertir una idea en guion, escenas, estilo y estructura para tu video.");setStatus("Listo","ok")}
window.abrahamAI={ask,send,clearChat};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
