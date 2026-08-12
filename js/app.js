// قاموس الترجمة الشامل للنظام
const translations = {
  ar: {
    system_title: "مخزن مستقبل الأطعمة",
    nav_home: "الرئيسية",
    nav_inventory: "المخزون",
    nav_supply: "طلبات التغذية",
    nav_settings: "الإعدادات",
    logout: "تسجيل الخروج",
    welcome: "مرحباً بك في نظام إدارة المخزن",
    welcome_sub: "اختر من القائمة العلوية للانتقال للقسم المطلوب.",
    login_title: "تسجيل الدخول للنظام",
    email: "البريد الإلكتروني",
    password: "كلمة السر",
    login_btn: "دخول",
    add_user: "إضافة مستخدم جديد",
    save: "حفظ",
    cancel: "إلغاء",
    invalid_login: "البريد الإلكتروني أو كلمة السر غير صحيحة"
  },
  en: {
    system_title: "Future Foods Storage",
    nav_home: "Home",
    nav_inventory: "Inventory",
    nav_supply: "Supply Requests",
    nav_settings: "Settings",
    logout: "Logout",
    welcome: "Welcome to Storage Management System",
    welcome_sub: "Select from the top menu to navigate.",
    login_title: "System Login",
    email: "Email",
    password: "Password",
    login_btn: "Login",
    add_user: "Add New User",
    save: "Save",
    cancel: "Cancel",
    invalid_login: "Invalid email or password"
  }
};

let currentLang = localStorage.getItem('app_lang') || 'ar';
let currentUser = JSON.parse(localStorage.getItem('app_user'));

// حارس الجلسة Session Guard
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
  document.body.className = currentLang === 'en' ? 'ltr' : '';

  // تطبيق الترجمات على جميع العناصر المرمزة بـ data-i18n
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      elem.innerText = translations[currentLang][key];
    }
  });

  const userDisp = document.getElementById('currentUserDisplay');
  if (userDisp && currentUser) {
    userDisp.innerText = `${currentUser.name} (${currentUser.brand_permission || currentUser.brand})`;
  }
}

function toggleLanguage() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('app_lang', currentLang);
  initHeader();
}

function logout() {
  localStorage.removeItem('app_user');
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', initHeader);
