let usersList = [];
let settingsCurrentUser = {};

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

  const isSuperAdmin = !settingsCurrentUser.email || 
                       settingsCurrentUser.email === 'storage.futurefoods@gmail.com' || 
                       settingsCurrentUser.role === 'admin';

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

    if (isSuperAdmin) {
      actionsTd = `
        <button class="btn" style="padding:4px 10px; font-size:0.85rem; margin-right:4px;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-pen-to-square"></i> Edit Permissions</button>
        <button class="btn btn-danger" style="padding:4px 10px; font-size:0.85rem;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      `;
    } else if (isSelf) {
      actionsTd = `<button class="btn" style="padding:4px 10px; font-size:0.85rem;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-key"></i> Change Password</button>`;
    } else {
      actionsTd = `-`;
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

// دالة مساعدة لتغيير حالة مفاتيح التبديل بأمان دون إحداث خطأ
function setToggleState(elementId, state) {
  const el = document.getElementById(elementId);
  if (el) {
    el.checked = Boolean(state);
  }
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
  
  // إعادة تعيين التبديلات بأمان
  setToggleState('uCanEditInventory', false);
  setToggleState('uCanAddProducts', false);
  setToggleState('uCanDeleteProducts', false);
  setToggleState('uCanUploadExcel', false);
  setToggleState('uCanOrder', false);
  setToggleState('uCanReceive', false);
  setToggleState('uCanApproveRequests', false);

  modal.style.display = 'flex';
}

function openEditUser(id) {
  const u = usersList.find(x => x.id === id);
  if (!u) return;

  if (document.getElementById('uId')) document.getElementById('uId').value = u.id;
  if (document.getElementById('uName')) document.getElementById('uName').value = u.name || '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = u.email || '';
  if (document.getElementById('uRole')) document.getElementById('uRole').value = u.role || 'user';
  if (document.getElementById('uBrand')) document.getElementById('uBrand').value = u.brand_permission || 'All';

  // ضبط قيم التبديلات من قاعدة البيانات بأمان
  setToggleState('uCanEditInventory', u.can_edit_inventory);
  setToggleState('uCanAddProducts', u.can_add_products);
  setToggleState('uCanDeleteProducts', u.can_delete_products);
  setToggleState('uCanUploadExcel', u.can_upload_excel);
  setToggleState('uCanOrder', u.can_procure_order);
  setToggleState('uCanReceive', u.can_receive_stock);
  setToggleState('uCanApproveRequests', u.can_approve_requests);

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

  const payload = {
    name,
    email,
    role,
    brand_permission,
    can_edit_inventory: document.getElementById('uCanEditInventory')?.checked || false,
    can_add_products: document.getElementById('uCanAddProducts')?.checked || false,
    can_delete_products: document.getElementById('uCanDeleteProducts')?.checked || false,
    can_upload_excel: document.getElementById('uCanUploadExcel')?.checked || false,
    can_procure_order: document.getElementById('uCanOrder')?.checked || false,
    can_receive_stock: document.getElementById('uCanReceive')?.checked || false,
    can_approve_requests: document.getElementById('uCanApproveRequests')?.checked || false
  };

  if (pass) payload.password = pass;

  let error;
  if (id) {
    ({ error } = await _supabase.from('users').update(payload).eq('id', id));
  } else {
    ({ error } = await _supabase.from('users').insert([payload]));
  }

  if (error) {
    alert("Error saving user: " + error.message);
  } else {
    alert("User permissions saved successfully!");
    closeModal('userModal');
    loadUsers();
  }
}

async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  const { error } = await _supabase.from('users').delete().eq('id', id);
  if (error) alert("Error deleting user: " + error.message);
  else loadUsers();
}

document.addEventListener('DOMContentLoaded', initSettings);
