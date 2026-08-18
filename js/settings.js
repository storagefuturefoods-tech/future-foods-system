let usersList = [];
let currentUser = {};

async function initSettings() {
  console.log("بداية تحميل صفحة الإعدادات...");
  
  // 1. جلب المستخدم الحالي
  try {
    currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    currentUser = {};
  }

  // 2. جلب وتعبئة جدول المستخدمين
  await loadUsers();
}

async function loadUsers() {
  // جلب كافة بيانات الجدول مباشرة
  const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: true });

  if (error) {
    console.error("خطأ Supabase:", error);
    alert("حدث خطأ في جلب البيانات: " + error.message);
    return;
  }

  console.log("البيانات المسترجعة من Supabase:", data);
  usersList = data || [];
  renderUsersTable();
}

function renderUsersTable() {
  // البحث عن عنصر tbody الخاص بالجدول
  let tbody = document.getElementById('usersBody');
  
  // إذا لم يجد id="usersBody"، يبحث عن أول tbody في الجدول مباشرة
  if (!tbody) {
    tbody = document.querySelector('table tbody');
  }

  if (!tbody) {
    console.error("لم يتم العثور على عنصر tbody في الصفحة!");
    return;
  }

  tbody.innerHTML = '';

  // التحقق من الصلاحيات للإظهار والتعديل
  const isSuperAdmin = !currentUser.email || 
                       currentUser.email === 'storage.futurefoods@gmail.com' || 
                       currentUser.role === 'admin';

  // زر الإضافة
  const addBtn = document.querySelector('button[onclick*="userModal"]') || document.querySelector('button[onclick*="openModal"]');
  if (addBtn) {
    addBtn.style.display = isSuperAdmin ? 'inline-block' : 'none';
  }

  // رأس عمود الإجراءات
  const actionsHeader = document.querySelector('table th:last-child');
  if (actionsHeader && actionsHeader.innerText.includes('إجراءات')) {
    actionsHeader.style.display = isSuperAdmin ? '' : 'none';
  }

  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">لا يوجد مستخدمون حتى الآن</td></tr>`;
    return;
  }

  usersList.forEach(u => {
    let roleBadge = '';
    if (u.role === 'admin') roleBadge = '<span style="color:#e53e3e; font-weight:bold;">مدير النظام</span>';
    else if (u.role === 'store_manager') roleBadge = '<span style="color:#dd6b20; font-weight:bold;">مدير مخزن</span>';
    else roleBadge = '<span style="color:#3182ce;">شيف / فرع</span>';

    let brandDisplay = u.brand_permission || 'غير محدد';
    if (u.brand_permission === 'All') brandDisplay = 'كل الفروع';
    else if (u.brand_permission === 'Rudy') brandDisplay = 'Rudy (+ المشترك)';
    else if (u.brand_permission === 'B-marlin') brandDisplay = 'B-marlin (+ المشترك)';

    const actionsTd = isSuperAdmin ? `
      <td>
        <button class="btn" style="padding:4px 10px; font-size:0.85rem; margin-left:4px;" onclick="openEditUser(${u.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:4px 10px; font-size:0.85rem;" onclick="deleteUser(${u.id})">حذف</button>
      </td>
    ` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name || '-'}</td>
      <td>${u.email || '-'}</td>
      <td>${roleBadge}</td>
      <td><strong>${brandDisplay}</strong></td>
      ${actionsTd}
    `;
    tbody.appendChild(tr);
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId || 'userModal');
  if (!modal) return;
  
  if (document.getElementById('uId')) document.getElementById('uId').value = '';
  if (document.getElementById('uName')) document.getElementById('uName').value = '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = '';
  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = true;
  }
  if (document.getElementById('passGroup')) document.getElementById('passGroup').style.display = 'block';
  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerText = 'إضافة مستخدم جديد';

  modal.style.display = 'flex';
}

function openEditUser(id) {
  const u = usersList.find(x => x.id === id);
  if (!u) return;

  if (document.getElementById('uId')) document.getElementById('uId').value = u.id;
  if (document.getElementById('uName')) document.getElementById('uName').value = u.name || '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = u.email || '';
  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = false;
  }
  if (document.getElementById('passGroup')) document.getElementById('passGroup').style.display = 'none';
  if (document.getElementById('uRole')) document.getElementById('uRole').value = u.role || 'chef';
  if (document.getElementById('uBrand')) document.getElementById('uBrand').value = u.brand_permission || 'All';

  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerText = 'تعديل بيانات المستخدم';
  
  const modal = document.getElementById('userModal');
  if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId || 'userModal');
  if (modal) modal.style.display = 'none';
}

async function saveUser(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('uId')?.value;
  const name = document.getElementById('uName')?.value;
  const email = document.getElementById('uEmail')?.value;
  const pass = document.getElementById('uPass')?.value;
  const role = document.getElementById('uRole')?.value;
  const brand_permission = document.getElementById('uBrand')?.value;

  if (id) {
    const { error } = await _supabase.from('users').update({
      name,
      email,
      role,
      brand_permission
    }).eq('id', id);

    if (error) alert("خطأ في التعديل: " + error.message);
    else {
      alert("تم تحديث المستخدم بنجاح!");
      closeModal('userModal');
      loadUsers();
    }
  } else {
    const { error } = await _supabase.from('users').insert([{
      name,
      email,
      password: pass,
      role,
      brand_permission
    }]);

    if (error) alert("خطأ في إضافة المستخدم: " + error.message);
    else {
      alert("تمت إضافة المستخدم بنجاح!");
      closeModal('userModal');
      loadUsers();
    }
  }
}

async function deleteUser(id) {
  if (!confirm("هل أنت تأكد من حذف هذا المستخدم؟")) return;
  const { error } = await _supabase.from('users').delete().eq('id', id);
  if (error) alert("حدث خطأ أثناء الحذف: " + error.message);
  else loadUsers();
}

// التشغيل المباشر عند استدعاء الملف أو تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
