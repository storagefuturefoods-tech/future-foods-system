let usersList = [];
let currentUser = {};

async function initSettings() {
  // جلب بيانات المستخدم المسجل حالياً من localStorage
  currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  // حماية الصفحة: إذا لم يكن أدمن، لا يمكنه الوصول لزر الإضافة أو أزرار التعديل
  const isSuperAdmin = (currentUser.email === 'storage.futurefoods@gmail.com' || currentUser.role === 'admin');

  // إخفاء زر إضافة مستخدم إذا لم يكن أدمن
  const addBtn = document.querySelector('button[onclick*="userModal"]');
  if (addBtn && !isSuperAdmin) {
    addBtn.style.display = 'none';
  }

  await loadUsers();
}

async function loadUsers() {
  const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: true });
  if (error) {
    alert("خطأ في جلب المستخدمين: " + error.message);
    return;
  }
  usersList = data || [];
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const isSuperAdmin = (currentUser.email === 'storage.futurefoods@gmail.com' || currentUser.role === 'admin');

  // إخفاء رأس عمود الإجراءات إذا لم يكن المستخدم أدمن
  const actionsHeader = document.querySelector('table th:last-child');
  if (actionsHeader) {
    actionsHeader.style.display = isSuperAdmin ? '' : 'none';
  }

  usersList.forEach(u => {
    let roleBadge = '';
    if (u.role === 'admin') roleBadge = '<span style="color:#e53e3e; font-weight:bold;">مدير النظام</span>';
    else if (u.role === 'store_manager') roleBadge = '<span style="color:#dd6b20; font-weight:bold;">مدير مخزن</span>';
    else roleBadge = '<span style="color:#3182ce;">شيف / فرع</span>';

    let brandDisplay = '';
    if (u.brand_permission === 'All') brandDisplay = 'كل الفروع';
    else if (u.brand_permission === 'Rudy') brandDisplay = 'Rudy (+ المشترك)';
    else if (u.brand_permission === 'B-marlin') brandDisplay = 'B-marlin (+ المشترك)';
    else brandDisplay = u.brand_permission || 'غير محدد';

    const actionsTd = isSuperAdmin ? `
      <td>
        <button class="btn" style="padding:3px 8px; font-size:0.8rem;" onclick="openEditUser(${u.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:3px 8px; font-size:0.8rem;" onclick="deleteUser(${u.id})">حذف</button>
      </td>
    ` : '';

    tbody.innerHTML += `
      <tr>
        <td>${u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${roleBadge}</td>
        <td><strong>${brandDisplay}</strong></td>
        ${actionsTd}
      </tr>
    `;
  });
}

function openModal(modalId) {
  if (currentUser.email !== 'storage.futurefoods@gmail.com' && currentUser.role !== 'admin') {
    return alert("عذراً، لا تملك صلاحية إضافة مستخدمين.");
  }
  document.getElementById('uId').value = '';
  document.getElementById('uName').value = '';
  document.getElementById('uEmail').value = '';
  document.getElementById('uPass').value = '';
  document.getElementById('uPass').required = true;
  document.getElementById('passGroup').style.display = 'block';
  document.getElementById('modalTitle').innerText = 'إضافة مستخدم جديد';
  
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

function openEditUser(id) {
  if (currentUser.email !== 'storage.futurefoods@gmail.com' && currentUser.role !== 'admin') {
    return alert("عذراً، لا تملك صلاحية تعديل المستخدمين.");
  }
  const u = usersList.find(x => x.id === id);
  if (!u) return;

  document.getElementById('uId').value = u.id;
  document.getElementById('uName').value = u.name;
  document.getElementById('uEmail').value = u.email;
  document.getElementById('uPass').value = '';
  document.getElementById('uPass').required = false;
  document.getElementById('passGroup').style.display = 'none';
  document.getElementById('uRole').value = u.role || 'chef';
  document.getElementById('uBrand').value = u.brand_permission || 'All';

  document.getElementById('modalTitle').innerText = 'تعديل بيانات المستخدم';
  document.getElementById('userModal').style.display = 'flex';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

async function saveUser(e) {
  e.preventDefault();
  if (currentUser.email !== 'storage.futurefoods@gmail.com' && currentUser.role !== 'admin') {
    return alert("عذراً، لا تملك الصلاحية للقيام بهذا الإجراء.");
  }

  const id = document.getElementById('uId').value;
  const name = document.getElementById('uName').value;
  const email = document.getElementById('uEmail').value;
  const pass = document.getElementById('uPass').value;
  const role = document.getElementById('uRole').value;
  const brand_permission = document.getElementById('uBrand').value;

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
  if (currentUser.email !== 'storage.futurefoods@gmail.com' && currentUser.role !== 'admin') {
    return alert("عذراً، لا تملك صلاحية الحذف.");
  }
  if (!confirm("هل أنت تأكد من حذف هذا المستخدم؟")) return;
  const { error } = await _supabase.from('users').delete().eq('id', id);
  if (error) alert("حدث خطأ أثناء الحذف: " + error.message);
  else loadUsers();
}

document.addEventListener('DOMContentLoaded', initSettings);
