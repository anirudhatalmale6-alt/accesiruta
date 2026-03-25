/* ============================================
   AccesiRuta — Profile & Community Module
   User profile, stats, settings, community feed
   ============================================ */

var Profile = (function () {
  'use strict';

  var PROFILE_KEY = 'accesiruta_profile';
  var POINTS_KEY = 'accesiruta_points';
  var VIEWS_KEY = 'accesiruta_views';

  /* --- Init --- */
  function init() {
    setupProfileName();
    setupFontSize();
    setupAddContact();
    refresh();
  }

  /* --- Profile Name --- */
  function setupProfileName() {
    var nameEl = document.getElementById('profile-name-display');
    var editBtn = document.getElementById('profile-name-edit');
    if (!nameEl || !editBtn) return;

    editBtn.addEventListener('click', function () {
      var current = getName();
      var newName = prompt('Tu nombre:', current);
      if (newName !== null && newName.trim() !== '') {
        saveName(newName.trim());
        refresh();
        App.showToast('Nombre actualizado');
      }
    });
  }

  function getName() {
    return localStorage.getItem(PROFILE_KEY) || 'Usuario';
  }

  function saveName(name) {
    localStorage.setItem(PROFILE_KEY, name);
  }

  /* --- Points --- */
  function getPoints() {
    return parseInt(localStorage.getItem(POINTS_KEY)) || 0;
  }

  function addPoints(amount) {
    var current = getPoints();
    localStorage.setItem(POINTS_KEY, (current + amount).toString());
  }

  /* --- Route Views --- */
  function getViews() {
    return parseInt(localStorage.getItem(VIEWS_KEY)) || 0;
  }

  function addView() {
    var current = getViews();
    localStorage.setItem(VIEWS_KEY, (current + 1).toString());
  }

  /* --- Font Size --- */
  function setupFontSize() {
    var decreaseBtn = document.getElementById('font-decrease');
    var increaseBtn = document.getElementById('font-increase');
    var fontLabel = document.getElementById('font-size-label');

    var sizes = ['normal', 'large', 'xlarge'];
    var sizeLabels = { normal: 'Normal', large: 'Grande', xlarge: 'Muy grande' };

    function updateLabel() {
      var current = App.getFontSize();
      if (fontLabel) fontLabel.textContent = sizeLabels[current] || 'Normal';
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', function () {
        var current = App.getFontSize();
        var idx = sizes.indexOf(current);
        if (idx > 0) {
          App.applyFontSize(sizes[idx - 1]);
          updateLabel();
          App.showToast('Tamaño: ' + sizeLabels[sizes[idx - 1]]);
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', function () {
        var current = App.getFontSize();
        var idx = sizes.indexOf(current);
        if (idx < sizes.length - 1) {
          App.applyFontSize(sizes[idx + 1]);
          updateLabel();
          App.showToast('Tamaño: ' + sizeLabels[sizes[idx + 1]]);
        }
      });
    }

    updateLabel();
  }

  /* --- Add Contact --- */
  function setupAddContact() {
    var addBtn = document.getElementById('add-contact-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', function () {
      var nameInput = document.getElementById('contact-name-input');
      var phoneInput = document.getElementById('contact-phone-input');
      if (!nameInput || !phoneInput) return;

      var name = nameInput.value.trim();
      var phone = phoneInput.value.trim();

      if (!name || !phone) {
        App.showToast('Introduce nombre y teléfono');
        return;
      }

      if (typeof SOS !== 'undefined') {
        SOS.addContact(name, phone);
        nameInput.value = '';
        phoneInput.value = '';
        App.showToast('Contacto añadido');
      }
    });
  }

  /* --- Refresh Profile Screen --- */
  function refresh() {
    // Name
    var nameDisplay = document.getElementById('profile-name-display');
    if (nameDisplay) nameDisplay.textContent = getName();

    // Greeting on home
    var homeGreeting = document.getElementById('home-greeting-name');
    if (homeGreeting) homeGreeting.textContent = getName();

    // Stats
    var reportCount = document.getElementById('stat-reports');
    var viewCount = document.getElementById('stat-views');
    var pointCount = document.getElementById('stat-points');

    if (reportCount && typeof Reports !== 'undefined') {
      reportCount.textContent = Reports.getCount();
    }
    if (viewCount) viewCount.textContent = getViews();
    if (pointCount) pointCount.textContent = getPoints();

    // Community feed
    renderCommunityFeed();

    // Render contacts
    if (typeof SOS !== 'undefined') {
      SOS.renderContacts();
    }
  }

  /* --- Community Feed --- */
  function renderCommunityFeed() {
    var container = document.getElementById('community-feed');
    if (!container || typeof Reports === 'undefined') return;

    var reports = Reports.getAll();
    var recent = reports.slice(-5).reverse();

    if (recent.length === 0) {
      container.innerHTML =
        '<p style="font-size:14px;color:var(--gray-400);text-align:center;padding:16px;">La comunidad aún no tiene actividad.</p>';
      return;
    }

    var typeNames = {
      rampa: 'rampa accesible',
      escaleras: 'escaleras',
      banco: 'zona de descanso',
      pendiente: 'pendiente pronunciada',
      obstaculo: 'obstáculo en la vía',
    };

    var name = getName();
    var html = '';
    recent.forEach(function (r) {
      var timeAgo = App.getTimeAgo(r.timestamp);
      var typeName = typeNames[r.type] || r.type;
      var stars = '';
      for (var i = 0; i < 5; i++) {
        stars += i < r.rating ? '★' : '☆';
      }

      html +=
        '<div class="community-item">' +
        '<div class="ci-header">' +
        '<div class="ci-avatar">👤</div>' +
        '<span class="ci-name">' + App.escapeHtml(name) + '</span>' +
        '<span class="ci-time">' + timeAgo + '</span>' +
        '</div>' +
        '<div class="ci-body">' +
        'Reportó <strong>' + App.escapeHtml(typeName) + '</strong> ' +
        '<span style="color:var(--yellow-500);">' + stars + '</span>' +
        (r.comment ? '<br>' + App.escapeHtml(r.comment) : '') +
        '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  /* --- Public API --- */
  return {
    init: init,
    refresh: refresh,
    getName: getName,
    getPoints: getPoints,
    addPoints: addPoints,
    addView: addView,
  };
})();
