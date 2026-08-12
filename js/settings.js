async function loadUsers() {
  const { data, error } = await _supabase.from('system_users').select('*');
  if (error) return alert("خطأ جلب المستخدمين: " + error.message);

  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '';
  data.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role_title}</td>
        <td>${u.brand_permission}</td>
      </tr>
    `;
  });
}

async function saveUser(e) {
  e.preventDefault();
  const newUser = {
    name: document.getElementById('uName').value,
    email: document.getElementById('uEmail').value,
    password: document.getElementById('uPass').value,
    role_title: document.getElementById('uRole').value,
    brand_permission: document.getElementById('uBrand').value
  };

  const { error } = await _supabase.from('system_users').insert([newUser]);
  if (error) {
    if (error.code === '23505') alert("⚠️ البريد الإلكتروني مُدخل ومستخدَم مسبقاً!");
    else alert("خطأ أثناء الإضافة: " + error.message);
  } else {
    alert("تم إضافة المستخدم بنجاح!");
    closeModal('userModal');
    loadUsers();
  }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', loadUsers);
