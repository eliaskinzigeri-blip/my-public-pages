/* WHITE SAYY — finitions de fluidité (chargé dans le cadre du site par src/routes/index.tsx) */
(function(){
  if(window.__wsPolish) return; window.__wsPolish = true;

  /* Sécurité : l'URL réelle de la mise à jour des commandes porte un tiret */
  var _f = window.fetch.bind(window);
  window.fetch = function(u, o){ return _f(typeof u === "string" ? u.replace("/api/public/admin/orders/update", "/api/public/admin/orders-update") : u, o); };

  /* Finitions visuelles : barre de défilement sombre, sélection, pas de scroll horizontal, fondu des images */
  var st = document.createElement("style");
  st.textContent =
    "html{scrollbar-width:thin;scrollbar-color:#2c2c2c #0a0a0a}" +
    "::selection{background:#f2f0eb;color:#0a0a0a}" +
    "a,button{-webkit-tap-highlight-color:transparent}" +
    "html,body{overflow-x:clip}" +
    "@keyframes wsFade{from{opacity:0}}" +
    "img.ws-wait{opacity:0}" +
    "img.ws-in{animation:wsFade .55s ease backwards}" +
    "@media (prefers-reduced-motion:reduce){img.ws-in{animation:none}img.ws-wait{opacity:1}}";
  document.head.appendChild(st);

  /* Les images apparaissent en fondu quand elles sont prêtes, jamais d'à-coup.
     Garde-fou : une image n'reste jamais invisible plus de 6 s. */
  function watch(img){
    if(img.complete || img.dataset.wsw || img.getAttribute("fetchpriority") === "high") return;
    img.dataset.wsw = "1"; img.classList.add("ws-wait");
    var done = function(ok){ img.classList.remove("ws-wait"); if(ok) img.classList.add("ws-in"); };
    img.addEventListener("load", function(){ done(true); }, {once:true});
    img.addEventListener("error", function(){ setTimeout(function(){ done(false); }, 1500); }, {once:true});
    setTimeout(function(){ done(false); }, 6000);
  }
  function scan(n){ if(n.nodeType !== 1) return; if(n.tagName === "IMG") watch(n); else if(n.querySelectorAll) n.querySelectorAll("img").forEach(watch); }
  new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(scan); }); }).observe(document.body, {childList:true, subtree:true});
  document.querySelectorAll("img").forEach(watch);
})();
