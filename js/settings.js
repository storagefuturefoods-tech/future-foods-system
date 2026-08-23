let usersList = [];
let settingsCurrentUser = {};

async function initSettings() {
  console.log("Initializing settings...");

  try {
    settingsCurrentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    settingsCurrentUser = {};
  }

  await loadUsers();
}

async function loadUsers() {
  const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    alert("Error fetching users: " + error.message);
    return;
  }

  usersList = data || [];
  renderUsersTable();
}

function renderUsersTable() {
  let tbody = document.getElementById('usersBody');
  if (!tbody) {
    tbody = document.querySelector('table tbody');
  }

  if (!tbody) return;
  tbody.innerHTML = '';

  const isSuperAdmin = !settingsCurrentUser.email || 
                       settingsCurrentUser.email === 'storage.futurefoods@gmail.com' || 
                       settingsCurrentUser.role === 'admin';

  const addBtn = document.querySelector('button[onclick*="openModal"]');
  if (addBtn) {
    addBtn.style.display = isSuperAdmin ? 'inline-block' : 'none';
  }

  const actionsHeader = document.querySelector('table th:last-child');
  if (actionsHeader) {
    actionsHeader.style.display = isSuperAdmin ? '' : 'none';
  }

  if (usersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#aaa;">No users found.</td></tr>';
    return;
  }

  usersList.forEach(u => {
    let roleBadge = '';
    if (u.role === 'admin') roleBadge = '<span style="color:#e53e3e; font-weight:bold;"><i class="fa-solid fa-user-shield"></i> System Admin</span>';
    else if (u.role === 'store_manager') roleBadge = '<span style="color:#dd6b20; font-weight:bold;"><i class="fa-solid fa-user-tie"></i> Store Manager</span>';
    else roleBadge = '<span style="color:#3182ce;"><i class="fa-solid fa-utensils"></i> Chef / Branch</span>';

    let brandDisplay = u.brand_permission || 'Not Specified';
    if (u.brand_permission === 'All') brandDisplay = 'All Branches';
    else if (u.brand_permission === 'Rudy') brandDisplay = 'Rudy (+ Shared)';
    else if (u.brand_permission === 'B-marlin') brandDisplay = 'B-marlin (+ Shared)';

    const actionsTd = isSuperAdmin ? `
      <td>
        <button class="btn" style="padding:4px 10px; font-size:0.85rem; margin-left:4px;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button class="btn btn-danger" style="padding:4px 10px; font-size:0.85rem;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Delete</button>
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
  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New User';

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

  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit User Details';
  
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

    if (error) alert("Error updating user: " + error.message);
    else {
      alert("User updated successfully!");
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

    if (error) alert("Error adding user: " + error.message);
    else {
      alert("User added successfully!");
      closeModal('userModal');
      loadUsers();
    }
  }
}

async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  const { error } = await _supabase.from('users').delete().eq('id', id);
  if (error) alert("Error deleting user: " + error.message);
  else loadUsers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
