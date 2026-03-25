/* ============================================
   AccesiRuta — Map Module
   Leaflet + OpenStreetMap integration with accessibility markers
   ============================================ */

var MapModule = (function () {
  'use strict';

  var map = null;
  var markers = [];
  var userMarker = null;
  var userCircle = null;
  var userPosition = null;
  var mapInitialized = false;

  // Marker color config per report type
  var MARKER_CONFIG = {
    rampa: { color: '#0EA5E9', emoji: '♿', label: 'Rampa' },
    escaleras: { color: '#EAB308', emoji: '🪜', label: 'Escaleras' },
    banco: { color: '#22C55E', emoji: '🪑', label: 'Banco' },
    pendiente: { color: '#EF4444', emoji: '⛰️', label: 'Pendiente' },
    obstaculo: { color: '#F97316', emoji: '🚧', label: 'Obstáculo' },
  };

  function createMarkerIcon(color, emoji) {
    return L.divIcon({
      className: 'custom-marker',
      html: '<div style="background:' + color + ';width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + emoji + '</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -24],
    });
  }

  /* --- Initialize Map --- */
  function initMap() {
    if (mapInitialized) return;
    if (typeof L === 'undefined') {
      showOfflineMessage();
      return;
    }

    var pos = userPosition || { lat: 40.4168, lng: -3.7038 };
    var mapEl = document.getElementById('google-map');
    if (!mapEl) return;

    // Clear any offline message
    var offlineEl = document.getElementById('map-offline');
    if (offlineEl) offlineEl.style.display = 'none';
    mapEl.style.display = 'block';

    map = L.map(mapEl, {
      center: [pos.lat, pos.lng],
      zoom: 16,
      zoomControl: false,
    });

    // Add zoom control to right side
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Add user location marker
    addUserMarker(pos);

    mapInitialized = true;

    // Load existing reports
    loadReportMarkers();

    // Add some demo markers if no reports exist
    var reports = typeof Reports !== 'undefined' ? Reports.getAll() : [];
    if (reports.length === 0) {
      addDemoMarkers(pos);
    }
  }

  /* --- Demo Markers for first-time experience --- */
  function addDemoMarkers(center) {
    var demoData = [
      { type: 'rampa', lat: center.lat + 0.002, lng: center.lng + 0.001, rating: 5, comment: 'Rampa en buen estado, inclinación adecuada' },
      { type: 'escaleras', lat: center.lat - 0.001, lng: center.lng + 0.003, rating: 2, comment: 'Escaleras sin barandilla, precaución' },
      { type: 'banco', lat: center.lat + 0.001, lng: center.lng - 0.002, rating: 4, comment: 'Banco con respaldo, zona sombreada' },
      { type: 'pendiente', lat: center.lat - 0.002, lng: center.lng - 0.001, rating: 3, comment: 'Cuesta moderada, 200m de longitud' },
      { type: 'rampa', lat: center.lat + 0.003, lng: center.lng - 0.003, rating: 4, comment: 'Entrada accesible al parque' },
      { type: 'obstaculo', lat: center.lat - 0.003, lng: center.lng + 0.002, rating: 1, comment: 'Obras en la acera, paso bloqueado' },
      { type: 'banco', lat: center.lat + 0.0005, lng: center.lng + 0.004, rating: 5, comment: 'Zona de descanso junto a la fuente' },
    ];

    demoData.forEach(function (d) {
      var config = MARKER_CONFIG[d.type];
      if (!config) return;

      var icon = createMarkerIcon(config.color, config.emoji);
      var marker = L.marker([d.lat, d.lng], { icon: icon }).addTo(map);

      var stars = '';
      for (var i = 0; i < 5; i++) {
        stars += i < d.rating ? '★' : '☆';
      }

      marker.bindPopup(
        '<div style="min-width:180px;font-family:-apple-system,sans-serif;">' +
        '<div style="font-size:18px;margin-bottom:4px;">' + config.emoji + ' <strong>' + config.label + '</strong></div>' +
        '<div style="color:#EAB308;font-size:16px;">' + stars + '</div>' +
        '<p style="font-size:13px;color:#4B5563;margin:6px 0 0;">' + d.comment + '</p>' +
        '<div style="font-size:11px;color:#9CA3AF;margin-top:6px;">Ejemplo de reporte</div>' +
        '</div>'
      );
    });
  }

  /* --- User Location Marker --- */
  function addUserMarker(pos) {
    if (!map) return;

    if (userMarker) {
      userMarker.setLatLng([pos.lat, pos.lng]);
      if (userCircle) userCircle.setLatLng([pos.lat, pos.lng]);
      return;
    }

    // Pulsing circle
    userCircle = L.circleMarker([pos.lat, pos.lng], {
      radius: 24,
      color: '#0EA5E9',
      fillColor: '#0EA5E9',
      fillOpacity: 0.15,
      weight: 1,
      opacity: 0.3,
    }).addTo(map);

    // Solid dot
    userMarker = L.circleMarker([pos.lat, pos.lng], {
      radius: 8,
      color: '#FFFFFF',
      fillColor: '#0EA5E9',
      fillOpacity: 1,
      weight: 3,
    }).addTo(map);

    userMarker.bindPopup('<strong>Tu ubicación</strong>');
  }

  /* --- Set User Position --- */
  function setUserPosition(pos) {
    userPosition = pos;
    addUserMarker(pos);
  }

  /* --- Center on User --- */
  function centerOnUser() {
    var pos = App.getUserPosition();
    if (map && pos) {
      map.setView([pos.lat, pos.lng], 16);
      setUserPosition(pos);
    }
  }

  /* --- Load Report Markers --- */
  function loadReportMarkers() {
    if (!map || typeof Reports === 'undefined') return;

    // Clear existing report markers (not user marker)
    markers.forEach(function (m) {
      map.removeLayer(m);
    });
    markers = [];

    var reports = Reports.getAll();
    reports.forEach(function (report) {
      addReportMarker(report);
    });
  }

  function addReportMarker(report) {
    if (!map) return;

    var config = MARKER_CONFIG[report.type] || {
      color: '#6B7280',
      emoji: '📍',
      label: 'Otro',
    };

    var icon = createMarkerIcon(config.color, config.emoji);
    var marker = L.marker([report.lat, report.lng], { icon: icon }).addTo(map);

    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < report.rating ? '★' : '☆';
    }
    var timeAgo = typeof App !== 'undefined' ? App.getTimeAgo(report.timestamp) : '';

    marker.bindPopup(
      '<div style="min-width:180px;font-family:-apple-system,sans-serif;">' +
      '<div style="font-size:18px;margin-bottom:4px;">' + config.emoji + ' <strong>' + config.label + '</strong></div>' +
      '<div style="color:#EAB308;font-size:16px;">' + stars + '</div>' +
      '<p style="font-size:13px;color:#4B5563;margin:6px 0 0;">' +
      (report.comment || 'Sin comentario') +
      '</p>' +
      '<div style="font-size:11px;color:#9CA3AF;margin-top:6px;">' + timeAgo + '</div>' +
      '</div>'
    );

    markers.push(marker);
  }

  /* --- On Screen Show --- */
  function onShow() {
    if (!mapInitialized) {
      initMap();
    } else {
      loadReportMarkers();
      if (map) {
        map.invalidateSize();
      }
    }
  }

  /* --- Offline Message --- */
  function showOfflineMessage() {
    var mapEl = document.getElementById('google-map');
    var offlineEl = document.getElementById('map-offline');
    if (mapEl) mapEl.style.display = 'none';
    if (offlineEl) offlineEl.style.display = 'flex';
  }

  /* --- Public API --- */
  return {
    initMap: initMap,
    onShow: onShow,
    setUserPosition: setUserPosition,
    centerOnUser: centerOnUser,
    loadReportMarkers: loadReportMarkers,
  };
})();

// Compatibility callback
function initGoogleMap() {
  console.log('Map API loaded');
}
