(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");

  // Mobiel menu
  if (toggle && header && nav) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Menu openen");
      }
    });
  }

  // Schaduw op de header bij scrollen
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Jaartal in de footer
  var year = document.getElementById("year");
  if (year) {
    year.textContent = "© " + new Date().getFullYear() + " Geurt's huttentocht";
  }

  // Kaarten (Leaflet) — lazy initialiseren zodra de sectie in beeld komt
  var routes = window.ROUTES || {};
  function initMaps() {
    if (!window.L || !routes.lechtal || !routes.verwall) return;
    [
      { id: "map-lechtal", route: routes.lechtal },
      { id: "map-verwall", route: routes.verwall }
    ].forEach(function (def) {
      var el = document.getElementById(def.id);
      if (!el || el.dataset.ready) return;
      el.dataset.ready = "1";
      var route = def.route;
      var map = window.L.map(el, { scrollWheelZoom: false });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
      }).addTo(map);

      // Hoofdroute + waypoints
      var mainLayer = window.L.layerGroup();
      var line = window.L.polyline(route.points, {
        color: route.color, weight: 4, opacity: 0.9
      }).addTo(mainLayer);
      route.waypoints.forEach(function (w) {
        window.L.circleMarker([w.lat, w.lng], {
          radius: 5, color: "#fff", weight: 2, fillColor: route.color, fillOpacity: 1
        }).addTo(mainLayer).bindPopup(w.name);
      });
      mainLayer.addTo(map);

      // Vlucht-/uitwijkroutes (gestippeld)
      var escLayer = window.L.layerGroup();
      (route.escapes || []).forEach(function (e) {
        window.L.polyline(e.points, {
          color: "#6b7b72", weight: 3, opacity: 0.9, dashArray: "6 7"
        }).addTo(escLayer).bindPopup(e.name);
      });
      escLayer.addTo(map);

      // Inzoomen op het geheel
      var bounds = line.getBounds();
      (route.escapes || []).forEach(function (e) { bounds.extend(window.L.latLngBounds(e.points)); });
      map.fitBounds(bounds, { padding: [26, 26] });

      window.L.control.layers(null, {
        "Hoofdroute": mainLayer,
        "Vluchtroutes": escLayer
      }, { collapsed: window.innerWidth < 700, position: "topright" }).addTo(map);

      window.setTimeout(function () { map.invalidateSize(); }, 250);
    });
  }

  var kaart = document.getElementById("kaart");
  if (kaart && window.L && routes.lechtal) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { initMaps(); io.disconnect(); }
      }, { rootMargin: "250px" });
      io.observe(kaart);
    } else {
      initMaps();
    }
  }
})();
