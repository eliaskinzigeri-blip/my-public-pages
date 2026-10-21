/* WHITE SAYY — finitions de fluidité (chargé dans le cadre du site par src/routes/index.tsx) */
(function () {
  if (window.__wsPolish) return;
  window.__wsPolish = true;

  /* Sécurité : l'URL réelle de la mise à jour des commandes porte un tiret */
  var _f = window.fetch.bind(window);
  window.fetch = function (u, o) {
    return _f(
      typeof u === "string"
        ? u.replace("/api/public/admin/orders/update", "/api/public/admin/orders-update")
        : u,
      o,
    );
  };

  /* Finitions visuelles : barre de défilement sombre, sélection, pas de scroll horizontal */
  var st = document.createElement("style");
  st.textContent =
    "html{scrollbar-width:thin;scrollbar-color:#2c2c2c #0a0a0a}" +
    "::selection{background:#f2f0eb;color:#0a0a0a}" +
    "a,button{-webkit-tap-highlight-color:transparent}" +
    "html,body{overflow-x:clip}";
  document.head.appendChild(st);
})();
