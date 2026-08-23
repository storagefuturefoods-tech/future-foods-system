let products = [];
let filteredProducts = [];
let invCurrentUser = {};

// Safe currentUser retrieval
function getInvCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    return {};
  }
}

// Check if user is Admin or Store Manager
function isInvAdminOrManager() {
  const u = getInvCurrentUser();
  const role = (u.role || '').toLowerCase();
  const email = (u.email || '').toLowerCase();
  
  return role === 'admin' || role === 'store_manager' || email === 'storage.futurefoods@gmail.com';
}

// 1. Fetch products & filter based on user permission
async function loadProducts() {
  invCurrentUser = getInvCurrentUser();

  const { data, error } = await _supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    alert("Error fetching products: " + error.message);
    return;
  }

  const rawProducts = data || [];

  // Filter products by brand permission
  const userBrandPermission = invCurrentUser.brand_permission || invCurrentUser.brand || 'All';
  products = filterProductsByBrandPermission(rawProducts, userBrandPermission);
  filteredProducts = [...products];

  renderTable();
  applyUserPermissions();
}

// 2. Flexible brand permission filter
function filterProductsByBrandPermission(allProducts, userBrandPermission) {
  const userBrand = (userBrandPermission || 'All').trim().toLowerCase();

  if (
    userBrand === 'all' || 
    userBrand === '' || 
    userBrand.includes('&') || 
    userBrand.includes('pizzeria') || 
    (userBrand.includes('marlin') && userBrand.includes('rudy'))
  ) {
    return allProducts;
  }

  return allProducts.filter(p => {
    const pBrand = (p.brand || '').trim().toLowerCase();
    return (
      pBrand === userBrand || 
      pBrand === 'all' || 
      pBrand.includes('&') || 
      pBrand.includes('shared')
    );
  });
}

// 3. Search Handler (Filter by SKU, Name Ar, Name En)
function handleSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  if (!query) {
    filteredProducts = [...products];
  } else {
    filteredProducts = products.filter(p => {
      const sku = (p.sku || '').toLowerCase();
      const nameAr = (p.name_ar || '').toLowerCase();
      const nameEn = (p.name_en || '').toLowerCase();

      return sku.includes(query) || nameAr.includes(query) || nameEn.includes(query);
    });
  }

  renderTable();
}

// 4. Open Image Preview Modal
function openImagePreview(url) {
  const imgElem = document.getElementById('previewImageSrc');
  if (imgElem) imgElem.src = url;
  const modal = document.getElementById('imagePreviewModal');
  if (modal) modal.style.display = 'flex';
}

// 5. Render inventory table
function renderTable() {
  const tbody = document.getElementById('inventoryBody');
  const countElem = document.getElementById('displayedCount');

  if (!tbody) return;
  tbody.innerHTML = '';

  // Update displayed count counter
  if (countElem) countElem.innerText = filteredProducts.length;

  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#888;">No products found.</td></tr>';
    return;
  }

  const isUserAdmin = isInvAdminOrManager();

  filteredProducts.forEach(p => {
    const isLow = p.quantity <= (p.min_quantity || 0);
    const imgUrl = p.image_url || 'https://via.placeholder.com/50';
    
    const actionsCell = isUserAdmin ? `
      <td>
        <button class="btn btn-edit-action" onclick="openEditModal(${p.id})">Edit</button>
        <button class="btn btn-status-action ${p.is_disabled ? 'btn-success' : 'btn-warning'}" onclick="toggleStatus(${p.id}, ${p.is_disabled})">
          ${p.is_disabled ? 'Enable' : 'Disable'}
        </button>
      </td>
    ` : `<td><span style="color:var(--text-muted); font-size:0.8rem;">View Only</span></td>`;

    tbody.innerHTML += `
      <tr style="${isLow ? 'background-color: rgba(255, 0, 0, 0.1);' : ''}">
        <td><input type="checkbox" class="prod-select" value="${p.id}"></td>
        <td>
          <img src="${imgUrl}" width="40" height="40" 
               style="object-fit:cover; border-radius:4px; cursor:pointer;" 
               onerror="this.src='https://via.placeholder.com/40'" 
               onclick="openImagePreview('${imgUrl}')" 
               title="Click to view image">
        </td>
        <td>${p.sku || '-'}</td>
        <td>${p.name_ar || '-'}</td>
        <td>${p.name_en || '-'}</td>
        <td>${p.brand || '-'}</td>
        <td><span style="background:var(--input-bg, #eee); padding:2px 6px; border-radius:4px; font-size:0.85rem;">${p.category || '-'}</span></td>
        <td>${p.quantity} ${isLow ? '⚠️' : ''}</td>
        <td>${p.items_per_box || 1}</td>
        <td>${p.is_disabled ? 'Disabled' : 'Active'}</td>
        ${actionsCell}
      </tr>
    `;
  });
}

// 6. Apply UI restrictions for regular users
function applyUserPermissions() {
  if (!isInvAdminOrManager()) {
    const uploadBtn = document.querySelector('button[onclick*="excelInput"]');
    const deleteBtn = document.querySelector('button[onclick*="deleteSelected"]');
    const fileInput = document.getElementById('excelInput');

    if (uploadBtn) uploadBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (fileInput) fileInput.style.display = 'none';
  }
}

// 7. Download Excel template
function downloadTemplate() {
  const template = [
    { 
      sku: "712211", 
      image_url: "https://via.placeholder.com/100", 
      name_ar: "بطاطس حلوة مقلية", 
      name_en: "Sweet fries", 
      brand: "Rudy", 
      category: "Vegetables", 
      quantity: 15, 
      min_quantity: 11, 
      items_per_box: 1 
    },
    { 
      sku: "712218", 
      image_url: "https://via.placeholder.com/100", 
      name_ar: "جبنة موزاريلا", 
      name_en: "Buffalo Cheese", 
      brand: "Rudy Pizzeria & B-Marlin", 
      category: "Cheese", 
      quantity: 36, 
      min_quantity: 18, 
      items_per_box: 12 
    }
  ];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products_Template");
  XLSX.writeFile(wb, "Products_Template.xlsx");
}

// 8. Handle Excel Upload
async function handleExcelUpload(e) {
  if (!isInvAdminOrManager()) {
    alert("Sorry, you do not have permission to add or edit products.");
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      let duplicates = [];
      let validRows = [];

      for (let r of rows) {
        const skuStr = String(r.sku || r.SKU || '').trim();
        if (!skuStr) continue;

        const existsLocally = validRows.some(x => x.sku === skuStr);
        const existsInDB = products.some(x => x.sku === skuStr);

        if (existsLocally || existsInDB) {
          duplicates.push(skuStr);
        } else {
          validRows.push({
            sku: skuStr,
            image_url: r.image_url || r.Image || '',
            name_ar: r.name_ar || '',
            name_en: r.name_en || '',
            brand: r.brand || r.Brand || 'Rudy Pizzeria & B-Marlin',
            category: String(r.category || r.Category || '').trim(),
            quantity: parseInt(r.quantity || 0),
            min_quantity: parseInt(r.min_quantity || 5),
            items_per_box: parseInt(r.items_per_box || r.box_capacity || 1)
          });
        }
      }

      if (duplicates.length > 0) {
        alert(`⚠️ Duplicate SKU codes ignored:\n${duplicates.join(', ')}`);
      }

      if (validRows.length > 0) {
        const { error } = await _supabase.from('products').insert(validRows);
        if (error) {
          alert("Error inserting data: " + error.message);
        } else {
          alert(`Successfully uploaded ${validRows.length} products!`);
          loadProducts();
        }
      }
    } catch (err) {
      alert("Error reading Excel file: " + err.message);
    }
    e.target.value = '';
  };
  
  reader.readAsArrayBuffer(file);
}

// 9. Open Edit Modal
function openEditModal(id) {
  if (!isInvAdminOrManager()) return alert("Sorry, you do not have permission to edit products.");

  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editProdId').value = p.id;
  document.getElementById('editImage').value = p.image_url || '';
  document.getElementById('editSku').value = p.sku || '';
  document.getElementById('editNameAr').value = p.name_ar || '';
  document.getElementById('editNameEn').value = p.name_en || '';
  document.getElementById('editBrand').value = p.brand || '';
  
  const catInput = document.getElementById('editCategory');
  if (catInput) catInput.value = p.category || '';

  document.getElementById('editQty').value = p.quantity || 0;
  document.getElementById('editMinQty').value = p.min_quantity || 0;
  document.getElementById('editBoxCap').value = p.items_per_box || 1;
  document.getElementById('editModal').style.display = 'flex';
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'none'; 
}

// 10. Save edited product
async function saveProductEdit(e) {
  e.preventDefault();
  if (!isInvAdminOrManager()) return alert("Sorry, you do not have permission to edit products.");

  const id = document.getElementById('editProdId').value;
  const catInput = document.getElementById('editCategory');

  const updated = {
    image_url: document.getElementById('editImage').value,
    name_ar: document.getElementById('editNameAr').value,
    name_en: document.getElementById('editNameEn').value,
    brand: document.getElementById('editBrand').value,
    category: catInput ? catInput.value.trim() : '',
    quantity: parseInt(document.getElementById('editQty').value),
    min_quantity: parseInt(document.getElementById('editMinQty').value),
    items_per_box: parseInt(document.getElementById('editBoxCap').value)
  };

  const { error } = await _supabase.from('products').update(updated).eq('id', id);
  if (error) {
    alert("Error updating product: " + error.message);
  } else {
    closeModal('editModal');
    loadProducts();
  }
}

// 11. Toggle active/disabled status
async function toggleStatus(id, currentStatus) {
  if (!isInvAdminOrManager()) return alert("Sorry, you do not have permission to toggle status.");
  await _supabase.from('products').update({ is_disabled: !currentStatus }).eq('id', id);
  loadProducts();
}

// 12. Delete selected products
async function deleteSelected() {
  if (!isInvAdminOrManager()) return alert("Sorry, you do not have permission to delete products.");

  const ids = Array.from(document.querySelectorAll('.prod-select:checked')).map(cb => cb.value);
  if (ids.length === 0) return alert("Please select products to delete.");
  if (confirm("Are you sure you want to delete the selected products?")) {
    await _supabase.from('products').delete().in('id', ids);
    loadProducts();
  }
}

function toggleSelectAll(master) {
  document.querySelectorAll('.prod-select').forEach(cb => cb.checked = master.checked);
}

// 13. Export products to Excel
function exportSelected() {
  const ids = Array.from(document.querySelectorAll('.prod-select:checked')).map(cb => parseInt(cb.value));
  const listToExport = ids.length > 0 ? filteredProducts.filter(p => ids.includes(p.id)) : filteredProducts;
  
  if (listToExport.length === 0) return alert("No products to export.");

  const ws = XLSX.utils.json_to_sheet(listToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "Exported_Products.xlsx");
}

document.addEventListener('DOMContentLoaded', loadProducts);
