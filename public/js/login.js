'use strict';

(function () {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const alertBox = document.getElementById('alert');

  function showTab(which) {
    alertBox.classList.add('hidden');
    if (which === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
    }
  }

  tabLogin.addEventListener('click', () => showTab('login'));
  tabRegister.addEventListener('click', () => showTab('register'));

  function showError(message) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('login-submit');
    submitBtn.disabled = true;
    try {
      await Api.post('/api/auth/login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      });
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('register-submit');
    submitBtn.disabled = true;
    try {
      await Api.post('/api/auth/register', {
        companyName: document.getElementById('reg-company').value,
        fullName: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
      });
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // If already signed in, skip straight to the dashboard.
  Api.get('/api/auth/me').then(() => {
    window.location.href = '/dashboard.html';
  }).catch(() => { /* not signed in — stay on this page */ });
})();
