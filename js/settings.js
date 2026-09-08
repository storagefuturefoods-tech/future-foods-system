let usersList = [];
let settingsCurrentUser = {};

// التحقق مما إذا كان المستخدم الحقيقي هو Super Admin / System Admin
function isSuperAdminUser() {
  const email = (settingsCurrentUser.email || '').toLowerCase().trim();
  const role = (settingsCurrentUser.role || '').toLowerCase().trim();
  return email === 'storage.futurefoods@gmail.com' || role === 'admin';
}

async function initSettings() {
  try {
    settingsCurrentUser = JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    settingsCurrentUser = {};
  }
  await loadUsers();
}

async function loadUsers() {
  const tbody = document.getElementById('usersBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading users...</td></tr>';
  }

  const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }

  usersList = data || [];
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const isSuper = isSuperAdminUser();

  // إخفاء زر إضافة مستخدم جديد إذا لم يكن النظام أدمن
  const addBtn = document.querySelector('button[onclick*="openModal"]');
  if (addBtn) {
    addBtn.style.display = isSuper ? 'inline-block' : 'none';
  }

  if (usersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#aaa;">No users found.</td></tr>';
    return;
  }

  usersList.forEach(u => {
    let roleBadge = u.role === 'admin' 
      ? '<span style="color:#e53e3e; font-weight:bold;"><i class="fa-solid fa-user-shield"></i> System Admin</span>'
      : '<span style="color:#3182ce;"><i class="fa-solid fa-user"></i> Standard User</span>';

    let brandDisplay = u.brand_permission || 'All Branches';
    const isSelf = settingsCurrentUser.id && u.id === settingsCurrentUser.id;

    let actionsTd = '';

    if (isSuper) {
      actionsTd = `
        <button class="btn" style="padding:4px 10px; font-size:0.85rem; margin-right:4px;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-pen-to-square"></i> Edit Permissions</button>
        <button class="btn btn-danger" style="padding:4px 10px; font-size:0.85rem;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      `;
    } else if (isSelf) {
      actionsTd = `<button class="btn" style="padding:4px 10px; font-size:0.85rem;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-key"></i> Change Password</button>`;
    } else {
      actionsTd = `<span style="color:var(--text-muted, #888); font-size:0.85rem;">No Actions</span>`;
    }

    tbody.innerHTML += `
      <tr>
        <td>${u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${roleBadge}</td>
        <td><strong>${brandDisplay}</strong></td>
        <td>${actionsTd}</td>
      </tr>
    `;
  });
}

function setToggleState(elementId, state) {
  const el = document.getElementById(elementId);
  if (el) el.checked = Boolean(state);
}

// 1. فتح نافذة إضافة مستخدم جديد (متاحة للـ Admin فقط)
function openModal() {
  if (!isSuperAdminUser()) return alert("Permission denied.");

  const modal = document.getElementById('userModal');
  if (!modal) return;

  // إعادة ضبط العناصر
  if (document.getElementById('uId')) document.getElementById('uId').value = '';
  if (document.getElementById('uName')) document.getElementById('uName').value = '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = '';
  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = true; // كلمة السر إلزامية للجديد
    document.getElementById('uPass').placeholder = "Enter password";
  }

  // إظهار الحقول المتقدمة للأدمن
  toggleAdminOnlyFields(true);

  setToggleState('uCanEditInventory', false);
  setToggleState('uCanAddProducts', false);
  setToggleState('uCanDeleteProducts', false);
  setToggleState('uCanUploadExcel', false);
  setToggleState('uCanOrder', false);
  setToggleState('uCanReceive', false);
  setToggleState('uCanApproveRequests', false);

  modal.style.display = 'flex';
}

// 2. فتح نافذة التعديل (للأدمن للتعديل الكامل / وللمستخدم العادي لتغيير كلمته فقط)
function openEditUser(id) {
  const u = usersList.find(x => x.id === id);
  if (!u) return;

  const isSuper = isSuperAdminUser();

  if (document.getElementById('uId')) document.getElementById('uId').value = u.id;
  if (document.getElementById('uName')) document.getElementById('uName').value = u.name || '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = u.email || '';
  if (document.getElementById('uRole')) document.getElementById('uRole').value = u.role || 'user';
  if (document.getElementById('uBrand')) document.getElementById('uBrand').value = u.brand_permission || 'All';

  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = false; // اختيارية في التعديل
    document.getElementById('uPass').placeholder = "Leave blank to keep current password";
  }

  // ضبط أزرار التبديل
  setToggleState('uCanEditInventory', u.can_edit_inventory);
  setToggleState('uCanAddProducts', u.can_add_products);
  setToggleState('uCanDeleteProducts', u.can_delete_products);
  setToggleState('uCanUploadExcel', u.can_upload_excel);
  setToggleState('uCanOrder', u.can_procure_order);
  setToggleState('uCanReceive', u.can_receive_stock);
  setToggleState('uCanApproveRequests', u.can_approve_requests);

  // إخفاء الصلاحيات إجباري للمستخدم العادي
  toggleAdminOnlyFields(isSuper);

  const modal = document.getElementById('userModal');
  if (modal) modal.style.display = 'flex';
}

// التحكم بإظهار/إخفاء الحقول الحساسة
function toggleAdminOnlyFields(show) {
  const adminElements = document.querySelectorAll('.admin-only-field');
  adminElements.forEach(el => {
    el.style.display = show ? 'block' : 'none';
  });

  const modalTitle = document.getElementById('modalUserTitle');
  if (modalTitle) {
    modalTitle.innerText = show ? 'User Permissions & Details' : 'Change Password';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId || 'userModal');
  if (modal) modal.style.display = 'none';
}

// 3. حفظ بيانات المستخدم
async function saveUser(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('uId')?.value;
  const pass = document.getElementById('uPass')?.value;
  const isSuper = isSuperAdminUser();

  // التحقق من كلمة السر عند إضافة مستخدم جديد لأول مرة
  if (!id && (!pass || pass.trim() === '')) {
    return alert("Password is required for new users!");
  }

  let payload = {};

  if (isSuper) {
    // إذا كان أدمن: يحفظ كافة الصلاحيات والبيانات
    payload = {
      name: document.getElementById('uName')?.value || '',
      email: document.getElementById('uEmail')?.value || '',
      role: document.getElementById('uRole')?.value || 'user',
      brand_permission: document.getElementById('uBrand')?.value || 'All',
      can_edit_inventory: document.getElementById('uCanEditInventory')?.checked || false,
      can_add_products: document.getElementById('uCanAddProducts')?.checked || false,
      can_delete_products: document.getElementById('uCanDeleteProducts')?.checked || false,
      can_upload_excel: document.getElementById('uCanUploadExcel')?.checked || false,
      can_procure_order: document.getElementById('uCanOrder')?.checked || false,
      can_receive_stock: document.getElementById('uCanReceive')?.checked || false,
      can_approve_requests: document.getElementById('uCanApproveRequests')?.checked || false
    };
  } else {
    // إذا كان مستخدم عادي: يتم تحديث الاسم وكلمة السر فقط دون لمس الصلاحيات
    payload = {
      name: document.getElementById('uName')?.value || ''
    };
  }

  // إضافة كلمة السر فقط إذا كُتبت
  if (pass && pass.trim() !== '') {
    payload.password = pass.trim();
  }

  let error;
  if (id) {
    ({ error } = await _supabase.from('users').update(payload).eq('id', id));
  } else {
    ({ error } = await _supabase.from('users').insert([payload]));
  }

  if (error) {
    alert("Error saving user: " + error.message);
  } else {
    alert("Saved successfully!");
    closeModal('userModal');
    loadUsers();
  }
}

async function deleteUser(id) {
  if (!isSuperAdminUser()) return alert("Permission denied.");
  if (!confirm("Are you sure you want to delete this user?")) return;
  const { error } = await _supabase.from('users').delete().eq('id', id);
  if (error) alert("Error deleting user: " + error.message);
  else loadUsers();
}

document.addEventListener('DOMContentLoaded', initSettings);
