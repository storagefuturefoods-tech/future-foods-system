// إدارة اللغة واليوزر الحالي في LocalStorage للتنقل السلس
let currentLang = localStorage.getItem('app_lang') || 'ar';
let currentUser = JSON.parse(localStorage.getItem('app_user')) || {
  name: "مدير النظام",
  email: "storage.futurefoods@gmail.com",
  brand: "Rudy Pizzeria & B-Marlin"
};

function initHeader() {
  document.body.className = currentLang === 'en' ? 'ltr' : '';
  
  const userDisp = document.getElementById('currentUserDisplay');
  if(userDisp) {
    userDisp.innerText = `${currentUser.name} (${currentUser.brand})`;
  }
}

function toggleLanguage() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('app_lang', currentLang);
  location.reload();
}

function logout() {
  alert(currentLang === 'ar' ? 'تم تسجيل الخروج' : 'Logged out');
  localStorage.removeItem('app_user');
  location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', initHeader);
