/* ============================================================
   CFP PHPeste 2026 — Form handler
   ============================================================ */

(function () {
  'use strict';

  var API_BASE = 'http://localhost:8080';
  var API_URL = API_BASE + '/api/submissions';
  var STATUS_URL = API_BASE + '/api/status';

  var form = document.getElementById('cfp-form');
  var successMsg = document.getElementById('success-msg');
  var headerCard = document.querySelector('.card--header');
  var statusClosed = document.getElementById('status-closed');
  var statusError = document.getElementById('status-error');
  var statusMessage = document.getElementById('status-message');

  // Hamburger menu
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded',
        hamburger.classList.contains('active') ? 'true' : 'false');
    });
  }

  // Check API status before showing form
  checkStatus();

  function checkStatus() {
    fetch(STATUS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('status check failed');
        return res.json();
      })
      .then(function (data) {
        if (data.accepting) {
          form.hidden = false;
        } else {
          headerCard.hidden = true;
          statusClosed.hidden = false;
          if (data.message) {
            statusMessage.textContent = data.message;
          }
        }
      })
      .catch(function () {
        headerCard.hidden = true;
        statusError.hidden = false;
      });
  }

  // File input display
  document.getElementById('foto').addEventListener('change', function () {
    var name = this.files[0] ? this.files[0].name : '';
    document.getElementById('foto-name').textContent = name;
  });

  document.getElementById('material').addEventListener('change', function () {
    var name = this.files[0] ? this.files[0].name : '';
    document.getElementById('material-name').textContent = name;
  });

  // Clear file names on form reset
  form.addEventListener('reset', function () {
    setTimeout(function () {
      document.getElementById('foto-name').textContent = '';
      document.getElementById('material-name').textContent = '';
      clearErrors();
    }, 0);
  });

  // Validation patterns
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var handleRegex = /^@[a-zA-Z0-9_]{5,32}$/;

  function isValidContact(value) {
    // Telegram handle
    if (handleRegex.test(value)) return true;
    // Phone number: extract digits, check length (10-13)
    var digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  }

  // Validation
  function validate() {
    var valid = true;
    clearErrors();

    var rules = [
      { id: 'nome', msg: 'Este campo é obrigatório.' },
      {
        id: 'email',
        msg: 'Informe um e-mail válido.',
        check: function (v) { return emailRegex.test(v); }
      },
      {
        id: 'telefone',
        msg: 'Informe um número com DDD (ex: 98991234567) ou um handler do Telegram (ex: @usuario)',
        check: function (v) { return isValidContact(v); }
      },
      { id: 'cracha', msg: 'Este campo é obrigatório.' },
      { id: 'bio', msg: 'Este campo é obrigatório.' },
      { id: 'tipo_atividade', msg: 'Selecione uma opção.' },
      { id: 'titulo', msg: 'Este campo é obrigatório.' },
      { id: 'resumo', msg: 'Este campo é obrigatório.' },
      { id: 'trilha', msg: 'Selecione uma opção.' },
    ];

    rules.forEach(function (rule) {
      var el = document.getElementById(rule.id);
      var value = el.value.trim();

      var isInvalid = !value;
      if (value && rule.check) {
        isInvalid = !rule.check(value);
      }

      if (isInvalid) {
        showError(rule.id, rule.msg);
        valid = false;
      }
    });

    // Validate foto size (max 1MB)
    var fotoFile = document.getElementById('foto').files[0];
    if (fotoFile && fotoFile.size > 1 * 1024 * 1024) {
      showError('foto', 'O arquivo deve ter no máximo 1 MB.');
      valid = false;
    }

    // Validate material size (max 20MB)
    var materialFile = document.getElementById('material').files[0];
    if (materialFile && materialFile.size > 20 * 1024 * 1024) {
      showError('material', 'O arquivo deve ter no máximo 20 MB.');
      valid = false;
    }

    return valid;
  }

  function showError(fieldId, message) {
    var errEl = document.querySelector('.error-msg[data-for="' + fieldId + '"]');
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.add('visible');
    }
    var card = document.getElementById(fieldId).closest('.card');
    if (card) {
      card.classList.add('has-error');
    }
  }

  function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(function (el) {
      el.textContent = '';
      el.classList.remove('visible');
    });
    document.querySelectorAll('.card.has-error').forEach(function (el) {
      el.classList.remove('has-error');
    });
  }

  // Submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validate()) {
      var firstError = document.querySelector('.card.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    var submitBtn = form.querySelector('.btn-primary');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    var formData = new FormData(form);

    fetch(API_URL, {
      method: 'POST',
      body: formData,
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.error || 'Erro ao enviar formulário.');
          });
        }
        return res.json();
      })
      .then(function () {
        form.hidden = true;
        headerCard.hidden = true;
        successMsg.hidden = false;
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (err) {
        alert(err.message || 'Erro ao enviar. Tente novamente.');
      })
      .finally(function () {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      });
  });
})();
