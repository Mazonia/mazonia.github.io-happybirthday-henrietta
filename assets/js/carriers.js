/* carriers.js — realistic message carriers for messages.html */
(function(){
"use strict";

/* ── inject styles ── */
var CSS = `
@keyframes carrierFloat{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-7px) rotate(var(--r,0deg))}}
@keyframes msgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes scrollUnroll{0%{clip-path:inset(50% 8% 50% 8% round 4px);transform:scaleY(.1)}100%{clip-path:inset(0% 0% 0% 0% round 4px);transform:scaleY(1)}}
@keyframes sealUnwrap{0%{stroke-dashoffset:220}100%{stroke-dashoffset:0}}
@keyframes lidOpen{0%{transform:rotateX(0deg);transform-origin:top center}100%{transform:rotateX(-145deg);transform-origin:top center}}
@keyframes letterRise{0%{transform:translateY(60px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes bottleTilt{0%{transform:rotate(0deg)}40%{transform:rotate(165deg) translateY(-10px)}70%{transform:rotate(175deg)}100%{transform:rotate(165deg)}}
@keyframes noteSlide{0%{transform:translateY(0);opacity:0}100%{transform:translateY(-55px);opacity:1}}
@keyframes planeZoom{0%{transform:scale(1) rotate(0deg);opacity:1}50%{transform:scale(0.3) rotate(-20deg) translate(60px,-40px);opacity:0}51%{transform:scale(0.3) rotate(10deg) translate(-60px,40px);opacity:0}100%{transform:scale(1) rotate(0deg);opacity:1}}
.carrier-wrap{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.55rem;animation:carrierFloat 4s ease-in-out infinite;}
.carrier-wrap:hover .carrier-svg{filter:drop-shadow(0 12px 28px rgba(250,204,21,.35));transform:scale(1.07);}
.carrier-svg{transition:transform .3s cubic-bezier(.34,1.56,.64,1),filter .3s;}
.carrier-from{font-family:'Caveat',cursive;font-size:.88rem;color:rgba(255,255,255,.65);letter-spacing:.03em;text-align:center;}
.msg-reveal{display:none;position:fixed;inset:0;z-index:500;align-items:center;justify-content:center;padding:1.5rem;background:rgba(3,5,14,.85);backdrop-filter:blur(14px);}
.msg-reveal.active{display:flex;}
@keyframes msgCardIn{from{opacity:0;transform:scale(.93) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
.msg-card{max-width:460px;width:100%;border-radius:24px;padding:2rem 2.4rem;position:relative;border:1px solid rgba(255,255,255,.13);box-shadow:0 32px 80px rgba(0,0,0,.65);animation:msgCardIn .38s cubic-bezier(.34,1.2,.64,1) both;}
.msg-card-close{position:absolute;top:.9rem;right:.9rem;background:none;border:none;color:rgba(255,255,255,.45);cursor:pointer;font-size:1.5rem;line-height:1;transition:color .2s;}
.msg-card-close:hover{color:#fff;}
.msg-body{font-family:'Caveat',cursive;font-size:1.4rem;line-height:1.55;color:rgba(255,255,255,.92);margin:.8rem 0;}
.msg-author{font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:rgba(250,204,21,.8);margin-top:1rem;border-top:1px solid rgba(255,255,255,.08);padding-top:.6rem;}
/* anim containers inside modal */
.anim-scene{width:100%;display:flex;justify-content:center;margin-bottom:1rem;min-height:80px;}
`;
var st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);

/* ── SVG helpers ── */
function bottle(col){
  return `<svg class="carrier-svg" width="70" height="118" viewBox="0 0 70 118" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="2" width="20" height="13" rx="3.5" fill="rgba(220,185,80,.9)"/>
    <rect x="23" y="13" width="24" height="6" rx="2" fill="rgba(180,140,50,.9)"/>
    <path d="M18,19 Q8,36 8,56 L8,96 Q8,110 35,110 Q62,110 62,96 L62,56 Q62,36 52,19 Z" fill="${col}" opacity=".9"/>
    <path d="M18,19 Q8,36 8,56 L8,78 Q22,70 35,73 Q48,70 62,78 L62,56 Q62,36 52,19 Z" fill="rgba(255,255,255,.07)"/>
    <ellipse cx="35" cy="58" rx="14" ry="4" fill="rgba(255,255,255,.06)"/>
    <rect x="29" y="50" width="12" height="20" rx="3" fill="rgba(255,248,220,.93)"/>
    <line x1="32" y1="56" x2="38" y2="56" stroke="rgba(120,80,10,.4)" stroke-width="1"/>
    <line x1="32" y1="60" x2="38" y2="60" stroke="rgba(120,80,10,.4)" stroke-width="1"/>
    <line x1="32" y1="64" x2="38" y2="64" stroke="rgba(120,80,10,.4)" stroke-width="1"/>
  </svg>`;
}

function vintageEnv(col){
  return `<svg class="carrier-svg" width="115" height="82" viewBox="0 0 115 82" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="109" height="76" rx="7" fill="${col}" opacity=".93"/>
    <!-- flap -->
    <path d="M3,3 Q57,3 112,3 L57,44 Z" fill="rgba(0,0,0,.15)"/>
    <path d="M3,3 L57,44 L112,3" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.5"/>
    <!-- body lines -->
    <path d="M3,79 L44,42 M112,79 L71,42" stroke="rgba(255,255,255,.13)" stroke-width="1.2"/>
    <!-- wax seal with thread -->
    <circle cx="57" cy="46" r="11" fill="rgba(180,20,20,.9)" stroke="rgba(140,10,10,.6)" stroke-width="1.5"/>
    <text x="57" y="50" text-anchor="middle" font-size="10" fill="rgba(255,215,150,.95)" font-family="serif">✦</text>
    <!-- thread spool visual -->
    <path d="M57,57 Q68,60 74,68" stroke="rgba(220,180,60,.7)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M57,57 Q46,60 40,68" stroke="rgba(220,180,60,.7)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- address area -->
    <rect x="12" y="28" width="28" height="18" rx="3" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
  </svg>`;
}

function modernEnv(col){
  return `<svg class="carrier-svg" width="115" height="78" viewBox="0 0 115 78" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="111" height="74" rx="9" fill="${col}" opacity=".93"/>
    <path d="M2,2 L57,42 L113,2" stroke="rgba(255,255,255,.28)" stroke-width="1.5" fill="none"/>
    <path d="M2,76 L44,40 M113,76 L71,40" stroke="rgba(255,255,255,.14)" stroke-width="1.2"/>
    <rect x="34" y="16" width="42" height="5" rx="2.5" fill="rgba(255,255,255,.32)"/>
    <rect x="34" y="26" width="28" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
    <!-- small stamp -->
    <rect x="90" y="8" width="16" height="20" rx="2" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
    <text x="98" y="22" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.7)" font-family="serif">✉</text>
  </svg>`;
}

function paperPlane(col){
  return `<svg class="carrier-svg" width="110" height="88" viewBox="0 0 110 88" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,44 L104,8 L78,44 L104,80 Z" fill="${col}" opacity=".93"/>
    <path d="M6,44 L78,44 L104,80 Z" fill="rgba(0,0,0,.18)"/>
    <path d="M78,44 L104,8" stroke="rgba(255,255,255,.28)" stroke-width="1.5" fill="none"/>
    <path d="M40,44 L52,62" stroke="rgba(255,255,255,.2)" stroke-width="1" fill="none"/>
    <!-- fold crease -->
    <line x1="6" y1="44" x2="78" y2="44" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
  </svg>`;
}

function scroll(col){
  return `<svg class="carrier-svg" width="88" height="118" viewBox="0 0 88 118" xmlns="http://www.w3.org/2000/svg">
    <!-- top curl -->
    <ellipse cx="44" cy="14" rx="34" ry="12" fill="rgba(210,175,100,.85)"/>
    <ellipse cx="44" cy="14" rx="34" ry="8" fill="${col}" opacity=".95"/>
    <!-- body -->
    <rect x="10" y="14" width="68" height="90" fill="${col}" opacity=".95"/>
    <line x1="20" y1="38" x2="68" y2="38" stroke="rgba(100,65,10,.28)" stroke-width="1.2"/>
    <line x1="20" y1="50" x2="68" y2="50" stroke="rgba(100,65,10,.22)" stroke-width="1.2"/>
    <line x1="20" y1="62" x2="62" y2="62" stroke="rgba(100,65,10,.18)" stroke-width="1.2"/>
    <!-- bottom curl -->
    <ellipse cx="44" cy="104" rx="34" ry="12" fill="rgba(210,175,100,.85)"/>
    <ellipse cx="44" cy="104" rx="34" ry="8" fill="${col}" opacity=".95"/>
    <!-- red ribbon -->
    <rect x="38" y="8" width="12" height="102" rx="2" fill="rgba(200,30,30,.5)"/>
  </svg>`;
}

var TYPES   = [bottle, vintageEnv, modernEnv, paperPlane, scroll];
var COLORS  = ["rgba(25,80,115,.92)","rgba(80,35,15,.95)","rgba(15,55,95,.92)","rgba(40,110,70,.88)","rgba(95,35,75,.92)","rgba(18,45,85,.93)"];
var TILTS   = ["-4deg","3deg","-6deg","4deg","1deg","-3deg","5deg"];

/* ── modal ── */
var modal = document.createElement("div");
modal.className = "msg-reveal";
modal.innerHTML = '<div class="msg-card" id="msg-inner"></div>';
document.body.appendChild(modal);
modal.addEventListener("click",function(e){if(e.target===modal)close();});
document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});

function close(){modal.classList.remove("active");}

function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function escA(s){return String(s||"").replace(/"/g,"&quot;");}

/* ── Per-type opening animation HTML ── */
function animScene(typeIdx, col){
  if(typeIdx===0){ // bottle tilt + note sliding out
    return `<div class="anim-scene" style="height:110px;position:relative;overflow:visible;">
      <div style="animation:bottleTilt 1.4s cubic-bezier(.4,0,.2,1) .1s both;display:inline-block;">${bottle(col)}</div>
      <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);animation:noteSlide 0.7s cubic-bezier(.34,1.2,.64,1) .9s both;z-index:2;">
        <div style="width:34px;height:44px;background:rgba(255,248,220,.95);border-radius:3px;box-shadow:0 4px 14px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:.5rem;color:rgba(100,65,10,.6);line-height:1.3;text-align:center;padding:2px;">✉<br/>💛</span>
        </div>
      </div>
    </div>`;
  }
  if(typeIdx===1){ // vintage: thread unwrap then lid opens
    return `<div class="anim-scene" style="height:90px;align-items:flex-end;">
      <div style="position:relative;display:inline-block;">
        ${vintageEnv(col)}
        <!-- animated thread unwrapping -->
        <svg style="position:absolute;inset:0;width:115px;height:82px;pointer-events:none;" viewBox="0 0 115 82">
          <path d="M57,57 Q68,60 74,68" stroke="rgba(220,180,60,.9)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="22" stroke-dashoffset="22" style="animation:sealUnwrap .6s ease .15s forwards;"/>
          <path d="M57,57 Q46,60 40,68" stroke="rgba(220,180,60,.9)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="22" stroke-dashoffset="22" style="animation:sealUnwrap .6s ease .35s forwards;"/>
        </svg>
        <!-- flap opens -->
        <div style="position:absolute;top:3px;left:3px;right:3px;height:44px;overflow:hidden;transform-origin:top center;">
          <div style="width:100%;height:100%;background:${col};clip-path:polygon(0 0,50% 85%,100% 0);opacity:.9;animation:lidOpen .55s cubic-bezier(.4,0,.2,1) .7s both;transform-origin:top center;"></div>
        </div>
        <!-- letter peeking -->
        <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);animation:letterRise .6s cubic-bezier(.34,1.2,.64,1) 1s both;">
          <div style="width:60px;height:38px;background:rgba(255,250,230,.97);border-radius:3px;box-shadow:0 4px 12px rgba(0,0,0,.25);padding:4px 6px;">
            <div style="height:2px;background:rgba(100,70,10,.25);border-radius:1px;margin:3px 0;"></div>
            <div style="height:2px;background:rgba(100,70,10,.2);border-radius:1px;margin:3px 0;width:70%;"></div>
            <div style="height:2px;background:rgba(100,70,10,.15);border-radius:1px;margin:3px 0;width:85%;"></div>
          </div>
        </div>
      </div>
    </div>`;
  }
  if(typeIdx===2){ // modern env: lid opens, letter comes out
    return `<div class="anim-scene" style="height:90px;align-items:flex-end;">
      <div style="position:relative;display:inline-block;">
        ${modernEnv(col)}
        <div style="position:absolute;top:2px;left:2px;right:2px;height:42px;overflow:hidden;">
          <div style="width:100%;height:100%;background:${col};clip-path:polygon(0 0,50% 90%,100% 0);opacity:.95;animation:lidOpen .5s cubic-bezier(.4,0,.2,1) .3s both;transform-origin:top center;"></div>
        </div>
        <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);animation:letterRise .55s cubic-bezier(.34,1.2,.64,1) .7s both;">
          <div style="width:64px;height:36px;background:rgba(255,252,235,.97);border-radius:3px;box-shadow:0 4px 12px rgba(0,0,0,.22);padding:4px 6px;">
            <div style="height:2px;background:rgba(80,50,10,.22);border-radius:1px;margin:3px 0;"></div>
            <div style="height:2px;background:rgba(80,50,10,.16);border-radius:1px;margin:3px 0;width:75%;"></div>
          </div>
        </div>
      </div>
    </div>`;
  }
  if(typeIdx===3){ // paper plane zoom away + back
    return `<div class="anim-scene" style="height:88px;align-items:center;">
      <div style="animation:planeZoom 1s cubic-bezier(.4,0,.2,1) .1s both;display:inline-block;">${paperPlane(col)}</div>
    </div>`;
  }
  // scroll (typeIdx===4): unroll animation
  return `<div class="anim-scene" style="height:118px;align-items:center;">
    <div style="animation:scrollUnroll .8s cubic-bezier(.34,1.2,.64,1) .1s both;display:inline-block;">${scroll(col)}</div>
  </div>`;
}

/* ── open modal ── */
function openMsg(m, typeIdx, col){
  var inner = document.getElementById("msg-inner");
  var bg = col.replace(/[\d.]+\)$/,"0.25)");
  inner.style.background = "linear-gradient(135deg,"+bg+",rgba(10,12,28,.95))";
  inner.innerHTML =
    '<button class="msg-card-close" onclick="this.closest(\'.msg-reveal\').classList.remove(\'active\')">×</button>'+
    animScene(typeIdx, col)+
    '<p class="msg-body">'+esc(m.body)+'</p>'+
    '<p class="msg-author">— '+esc(m.author)+'</p>'+
    (m.image?'<div style="margin-top:1rem;border-radius:12px;overflow:hidden;max-height:175px;"><img src="'+escA(m.image)+'" style="width:100%;object-fit:cover;" alt=""/></div>':"");
  modal.classList.add("active");
}

/* ── public builder ── */
window.buildCarriers = function(messages, rootEl){
  messages.forEach(function(m, i){
    var typeIdx = i % TYPES.length;
    var col     = COLORS[i % COLORS.length];
    var tilt    = TILTS[i % TILTS.length];
    var wrap    = document.createElement("div");
    wrap.className = "carrier-wrap";
    wrap.style.setProperty("--r", tilt);
    wrap.style.animationDelay = (i*0.15).toFixed(2)+"s";
    wrap.innerHTML =
      '<div class="carrier-svg-wrap" style="transform:rotate('+tilt+')">'+TYPES[typeIdx](col)+'</div>'+
      '<div class="carrier-from">From '+esc(m.author||"Someone 💛")+'</div>';
    wrap.addEventListener("click", function(){ openMsg(m, typeIdx, col); });
    rootEl.appendChild(wrap);
  });
};
})();
