/* ============================================
   AccesiRuta — Reports Module
   localStorage-based accessibility report system
   ============================================ */

var Reports = (function () {
  'use strict';

  var STORAGE_KEY = 'accesiruta_reports';
  var selectedType = null;
  var selectedRating = 0;

  var TYPE_LABELS = {
    rampa: 'Rampa accesible',
    escaleras: 'Escaleras',
    banco: 'Banco / Zona de descanso',
    pendiente: 'Pendiente pronunciada',
    obstaculo: 'Obstáculo en la vía',
  };

  /* --- Init --- */
  function init() {
    setupTypeButtons();
    setupStarRating();
    setupSubmit();
  }

  /* --- Type Selection --- */
  function setupTypeButtons() {
    var btns = document.querySelectorAll('.report-type-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedType = btn.getAttribute('data-type');
      });
    });
  }

  /* --- Star Rating --- */
  function setupStarRating() {
    var stars = document.querySelectorAll('.star-btn');
    var label = document.getElementById('rating-label');

    var ratingTexts = {
      1: 'Muy mala accesibilidad',
      2: 'Mala accesibilidad',
      3: 'Accesibilidad regular',
      4: 'Buena accesibilidad',
      5: 'Excelente accesibilidad',
    };

    stars.forEach(function (star) {
      star.addEventListener('click', function () {
        selectedRating = parseInt(star.getAttribute('data-value'));
        stars.forEach(function (s) {
          var val = parseInt(s.getAttribute('data-value'));
          if (val <= selectedRating) {
            s.classList.add('filled');
            s.textContent = '★';
          } else {
            s.classList.remove('filled');
            s.textContent = '☆';
          }
        });
        if (label) {
          label.textContent = ratingTexts[selectedRating] || '';
        }
      });
    });
  }

  /* --- Submit --- */
  function setupSubmit() {
    var form = document.getElementById('report-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitReport();
    });
  }

  function submitReport() {
    if (!selectedType) {
      App.showToast('Selecciona un tipo de reporte');
      return;
    }
    if (selectedRating === 0) {
      App.showToast('Selecciona una valoración');
      return;
    }

    var comment = document.getElementById('report-comment');
    var commentText = comment ? comment.value.trim() : '';
    var pos = App.getUserPosition();

    var report = {
      id: generateId(),
      type: selectedType,
      rating: selectedRating,
      comment: commentText,
      lat: pos.lat,
      lng: pos.lng,
      timestamp: Date.now(),
    };

    saveReport(report);

    // Show success
    var formSection = document.getElementById('report-form-section');
    var successSection = document.getElementById('report-success');
    if (formSection) formSection.style.display = 'none';
    if (successSection) successSection.style.display = 'flex';

    // Update profile stats
    if (typeof Profile !== 'undefined') Profile.addPoints(10);

    App.showToast('¡Reporte guardado! +10 puntos');

    // Reset form after delay
    setTimeout(function () {
      resetForm();
      if (formSection) formSection.style.display = 'block';
      if (successSection) successSection.style.display = 'none';
    }, 3000);
  }

  function resetForm() {
    selectedType = null;
    selectedRating = 0;

    var btns = document.querySelectorAll('.report-type-btn');
    btns.forEach(function (b) { b.classList.remove('selected'); });

    var stars = document.querySelectorAll('.star-btn');
    stars.forEach(function (s) {
      s.classList.remove('filled');
      s.textContent = '☆';
    });

    var label = document.getElementById('rating-label');
    if (label) label.textContent = 'Toca una estrella para valorar';

    var comment = document.getElementById('report-comment');
    if (comment) comment.value = '';
  }

  /* --- Storage --- */
  function getAll() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReport(report) {
    var reports = getAll();
    reports.push(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }

  function getByProximity(lat, lng, radiusKm) {
    radiusKm = radiusKm || 5;
    var all = getAll();
    return all.filter(function (r) {
      var dist = haversineDistance(lat, lng, r.lat, r.lng);
      return dist <= radiusKm;
    });
  }

  function getCount() {
    return getAll().length;
  }

  /* --- Helpers --- */
  function generateId() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  function haversineDistance(lat1, lng1, lat2, lng2) {
    var R = 6371; // Earth radius in km
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /* --- Public API --- */
  return {
    init: init,
    getAll: getAll,
    getCount: getCount,
    getByProximity: getByProximity,
    saveReport: saveReport,
  };
})();
