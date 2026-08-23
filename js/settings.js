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

  // زر إضافة مستخدم جديد يظهر للأدمن فقط
  const addBtn = document.querySelector('button[onclick*="openModal"]');
  if (addBtn) {
    addBtn.style.display = isSuperAdmin ? 'inline-block' : 'none';
  }

  // عمود الإجراءات متاح للجميع الآن
  const actionsHeader = document.querySelector('table th:last-child');
  if (actionsHeader) {
    actionsHeader.style.display = '';
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

    // فحص هل هذا السطر يخص المستخدم الحالي المسجل دخوله أم لا
    const isSelf = settingsCurrentUser.id && u.id === settingsCurrentUser.id;

    let actionsTd = '<td>';
    if (isSuperAdmin) {
      actionsTd += `<button class="btn" style="padding:4px 10px; font-size:0.85rem; margin-left:4px;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-pen-to-square"></i> Edit</button>`;
      actionsTd += `<button class="btn btn-danger" style="padding:4px 10px; font-size:0.85rem;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Delete</button>`;
    } else if (isSelf) {
      // إذا كان مستخدماًعادياً، يظهر له زر التعديل الخاص بحسابه فقط لتغيير كلمة المرور
      actionsTd += `<button class="btn" style="padding:4px 10px; font-size:0.85rem;" onclick="openEditUser(${u.id})"><i class="fa-solid fa-key"></i> Change Password</button>`;
    } else {
      actionsTd += `<span style="color:#777; font-size:0.85rem;">-</span>`;
    }
    actionsTd += '</td>';

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
  
  // إظهار كافة الحقول عند الإضافة
  toggleFormFields(true);

  if (document.getElementById('uId')) document.getElementById('uId').value = '';
  if (document.getElementById('uName')) document.getElementById('uName').value = '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = '';
  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = true;
  }
  if (document.getElementById('passGroup')) document.getElementById('passGroup').style.display = 'block';
  
  const passLabel = document.querySelector('#passGroup label');
  if (passLabel) passLabel.innerText = "Temporary Password";

  if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New User';

  modal.style.display = 'flex';
}

function openEditUser(id) {
  const u = usersList.find(x => x.id === id);
  if (!u) return;

  const isSuperAdmin = !settingsCurrentUser.email || 
                       settingsCurrentUser.email === 'storage.futurefoods@gmail.com' || 
                       settingsCurrentUser.role === 'admin';

  if (document.getElementById('uId')) document.getElementById('uId').value = u.id;
  if (document.getElementById('uName')) document.getElementById('uName').value = u.name || '';
  if (document.getElementById('uEmail')) document.getElementById('uEmail').value = u.email || '';
  if (document.getElementById('uRole')) document.getElementById('uRole').value = u.role || 'chef';
  if (document.getElementById('uBrand')) document.getElementById('uBrand').value = u.brand_permission || 'All';

  if (document.getElementById('uPass')) {
    document.getElementById('uPass').value = '';
    document.getElementById('uPass').required = !isSuperAdmin; // مطلوبة إذا كان المستخدم يغير كلمة سر حسابه
  }

  if (isSuperAdmin) {
    // الأدمن يستطيع تعديل البيانات العامة (إخفاء حقل كلمة المرور)
    toggleFormFields(true);
    if (document.getElementById('passGroup')) document.getElementById('passGroup').style.display = 'none';
    if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit User Details';
  } else {
    // المستخدم العادي: إخفاء البيانات العامة وإظهار حقل كلمة المرور الجديدة فقط
    toggleFormFields(false);
    if (document.getElementById('passGroup')) document.getElementById('passGroup').style.display = 'block';
    
    const passLabel = document.querySelector('#passGroup label');
    if (passLabel) passLabel.innerText = "New Password";

    if (document.getElementById('modalTitle')) document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-key"></i> Change Password';
  }
  
  const modal = document.getElementById('userModal');
  if (modal) modal.style.display = 'flex';
}

// دالة مساعدة لإظهار/إخفاء بقية الخانات غير كلمة المرور
function toggleFormFields(showAll) {
  const displayStyle = showAll ? 'block' : 'none';
  const nameGroup = document.getElementById('uName')?.closest('.form-group');
  const emailGroup = document.getElementById('uEmail')?.closest('.form-group');
  const roleGroup = document.getElementById('uRole')?.closest('.form-group');
  const brandGroup = document.getElementById('uBrand')?.closest('.form-group');

  if (nameGroup) nameGroup.style.display = displayStyle;
  if (emailGroup) emailGroup.style.display = displayStyle;
  if (roleGroup) roleGroup.style.display = displayStyle;
  if (brandGroup) brandGroup.style.display = displayStyle;
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

  const isSuperAdmin = !settingsCurrentUser.email || 
                       settingsCurrentUser.email === 'storage.futurefoods@gmail.com' || 
                       settingsCurrentUser.role === 'admin';

  if (id) {
    let updateData = {};

    if (isSuperAdmin) {
      // الأدمن يحدد البيانات الأكاديمية/الصلاحيات
      updateData = { name, email, role, brand_permission };
    } else {
      // المستخدم العادي يحدّث كلمة المرور فقط
      if (pass) updateData.password = pass;
    }

    const { error } = await _supabase.from('users').update(updateData).eq('id', id);

    if (error) alert("Error updating user: " + error.message);
    else {
      alert(isSuperAdmin ? "User updated successfully!" : "Password changed successfully!");
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
