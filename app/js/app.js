/* ============================================
   AccesiRuta — Main App Controller
   Hash-based routing, geolocation, PWA install
   ============================================ */

const App = (function () {
  'use strict';

  // Screen IDs mapped to hash routes
  const SCREENS = {
    '#inicio': 'screen-home',
    '#mapa': 'screen-map',
    '#reportar': 'screen-report',
    '#sos': 'screen-sos',
    '#perfil': 'screen-profile',
    '#ruta': 'screen-route',
  };

  const NAV_TABS = ['#inicio', '#mapa', '#reportar', '#sos', '#perfil'];

  let currentScreen = null;
  let userPosition = null;
  let deferredInstallPrompt = null;

  /* --- Initialize --- */
  function init() {
    // Register service worker
    registerServiceWorker();

    // Set up navigation
    setupNavigation();

    // Set up hash routing
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // Get user location
    requestGeolocation();

    // PWA install prompt
    setupInstallPrompt();

    // Initialize modules
    if (typeof Reports !== 'undefined') Reports.init();
    if (typeof SOS !== 'undefined') SOS.init();
    if (typeof Profile !== 'undefined') Profile.init();

    // Load font size preference
    loadFontSize();

    // Populate home screen
    populateHome();

    console.log('AccesiRuta inicializada');
  }

  /* --- Service Worker --- */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js')
        .then(function (reg) {
          console.log('Service Worker registrado:', reg.scope);
        })
        .catch(function (err) {
          console.warn('Error registrando SW:', err);
        });
    }
  }

  /* --- Navigation --- */
  function setupNavigation() {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var target = item.getAttribute('data-screen');
        if (target) {
          window.location.hash = target;
        }
      });
    });
  }

  function handleRoute() {
    var hash = window.location.hash || '#inicio';
    var screenId = SCREENS[hash];

    if (!screenId) {
      hash = '#inicio';
      screenId = SCREENS[hash];
    }

    showScreen(screenId, hash);
  }

  function showScreen(screenId, hash) {
    // Hide all screens
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (s) {
      s.classList.remove('active', 'screen-transition');
    });

    // Show target
    var target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active', 'screen-transition');
      currentScreen = screenId;
    }

    // Update nav active state
    updateNavActive(hash);

    // Screen-specific hooks
    if (screenId === 'screen-map' && typeof MapModule !== 'undefined') {
      MapModule.onShow();
    }
    if (screenId === 'screen-home') {
      populateHome();
    }
    if (screenId === 'screen-profile' && typeof Profile !== 'undefined') {
      Profile.refresh();
    }
  }

  function updateNavActive(hash) {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var screen = item.getAttribute('data-screen');
      if (screen === hash) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  /* --- Geolocation --- */
  function requestGeolocation() {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no disponible');
      userPosition = { lat: 40.4168, lng: -3.7038 }; // Madrid fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log('Ubicación obtenida:', userPosition);
        // Update map if open
        if (typeof MapModule !== 'undefined') {
          MapModule.setUserPosition(userPosition);
        }
      },
      function (err) {
        console.warn('Error obteniendo ubicación:', err.message);
        userPosition = { lat: 40.4168, lng: -3.7038 };
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    // Watch position
    navigator.geolocation.watchPosition(
      function (pos) {
        userPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (typeof MapModule !== 'undefined') {
          MapModule.setUserPosition(userPosition);
        }
      },
      function () {},
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 }
    );
  }

  function getUserPosition() {
    return userPosition || { lat: 40.4168, lng: -3.7038 };
  }

  /* --- PWA Install --- */
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      showInstallBanner();
    });
  }

  function showInstallBanner() {
    var banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.add('show');
    }
  }

  function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function (result) {
      console.log('Instalación:', result.outcome);
      deferredInstallPrompt = null;
      var banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('show');
    });
  }

  function dismissInstallBanner() {
    var banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show');
  }

  /* --- Font Size --- */
  function loadFontSize() {
    var size = localStorage.getItem('accesiruta_fontsize') || 'normal';
    applyFontSize(size);
  }

  function applyFontSize(size) {
    document.body.classList.remove('font-size-large', 'font-size-xlarge');
    if (size === 'large') document.body.classList.add('font-size-large');
    if (size === 'xlarge') document.body.classList.add('font-size-xlarge');
    localStorage.setItem('accesiruta_fontsize', size);
  }

  function getFontSize() {
    return localStorage.getItem('accesiruta_fontsize') || 'normal';
  }

  /* --- Toast --- */
  function showToast(message, duration) {
    duration = duration || 3000;
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, duration);
  }

  /* --- Home Screen --- */
  function populateHome() {
    var recentContainer = document.getElementById('home-recent-reports');
    if (!recentContainer || typeof Reports === 'undefined') return;

    var reports = Reports.getAll();
    // Show last 3 reports
    var recent = reports.slice(-3).reverse();

    if (recent.length === 0) {
      recentContainer.innerHTML =
        '<p style="color:var(--gray-400);font-size:14px;text-align:center;padding:20px 0;">Aún no hay reportes. ¡Sé el primero!</p>';
      return;
    }

    var typeIcons = {
      rampa: '♿',
      escaleras: '🪜',
      banco: '🪑',
      pendiente: '⛰️',
      obstaculo: '🚧',
    };
    var typeBgs = {
      rampa: 'background:var(--sky-100)',
      escaleras: 'background:var(--yellow-100)',
      banco: 'background:var(--green-100)',
      pendiente: 'background:var(--red-100)',
      obstaculo: 'background:var(--orange-100)',
    };
    var typeNames = {
      rampa: 'Rampa',
      escaleras: 'Escaleras',
      banco: 'Banco/Descanso',
      pendiente: 'Pendiente',
      obstaculo: 'Obstáculo',
    };

    var html = '';
    recent.forEach(function (r) {
      var icon = typeIcons[r.type] || '📍';
      var bg = typeBgs[r.type] || 'background:var(--gray-100)';
      var name = typeNames[r.type] || r.type;
      var stars = '';
      for (var i = 0; i < 5; i++) {
        stars += i < r.rating ? '★' : '☆';
      }
      var timeAgo = getTimeAgo(r.timestamp);
      html +=
        '<div class="report-card" role="article">' +
        '<div class="rc-icon" style="' + bg + '">' + icon + '</div>' +
        '<div class="rc-info">' +
        '<div class="rc-type">' + escapeHtml(name) + '</div>' +
        '<div class="rc-detail">' + escapeHtml(r.comment || 'Sin comentario') + ' · ' + timeAgo + '</div>' +
        '</div>' +
        '<div class="rc-rating">' + stars + '</div>' +
        '</div>';
    });

    recentContainer.innerHTML = html;

    // Update home stats
    var countEl = document.getElementById('home-report-count');
    if (countEl) countEl.textContent = reports.length;
  }

  /* --- Helpers --- */
  function getTimeAgo(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return mins + ' min';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    var days = Math.floor(hours / 24);
    return days + 'd';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* --- Public API --- */
  return {
    init: init,
    navigate: navigate,
    getUserPosition: getUserPosition,
    showToast: showToast,
    installApp: installApp,
    dismissInstallBanner: dismissInstallBanner,
    applyFontSize: applyFontSize,
    getFontSize: getFontSize,
    escapeHtml: escapeHtml,
    getTimeAgo: getTimeAgo,
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
