let currentUser = JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || 'null');

// Session Guard
function checkAuth() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  if (!currentUser && !isLoginPage) {
    window.location.href = 'login.html';
  } else if (currentUser && isLoginPage) {
    window.location.href = 'index.html';
  }
}

function initHeader() {
  checkAuth();

  // Display user name only (without brand/role permissions)
  const userDisp = document.getElementById('currentUserDisplay');
  if (userDisp && currentUser) {
    userDisp.innerText = currentUser.name || currentUser.full_name || currentUser.user_name || currentUser.email || '';
  }
}

function logout() {
  localStorage.removeItem('app_user');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', initHeader);
