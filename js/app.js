let currentUser = JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || 'null');

// Session Guard with Database Validation
async function checkAuth() {
  const isLoginPage = window.location.pathname.endsWith('login.html');

  if (!currentUser && !isLoginPage) {
    window.location.href = 'login.html';
    return;
  } 

  if (currentUser && isLoginPage) {
    window.location.href = 'index.html';
    return;
  }

  // التحقق الفعلي من وجود المستخدم في قاعدة البيانات لحمايتك في حال تم حذفه
  if (currentUser && currentUser.email && !isLoginPage) {
    try {
      const { data, error } = await _supabase
        .from('users')
        .select('id')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (error || !data) {
        alert("Your account has been deleted or is no longer active.");
        logout();
      }
    } catch (err) {
      console.error("Auth check error:", err);
    }
  }
}

function initHeader() {
  checkAuth();

  // Display user name only
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
