let products = [];

async function loadProducts() {
  const { data, error } = await _supabase.from('products').select('*');
  if (error) return alert("خطأ في جلب البيانات: " + error.message);
  products = data || [];
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('inventoryBody');
  tbody.innerHTML = '';

  products.forEach(p => {
    const isLow = p.quantity <= p.min_quantity;
    tbody.innerHTML += `
      <tr style="${isLow ? 'background-color: #ffe6e6;' : ''}">
        <td><input type="checkbox" class="prod-select" value="${p.id}"></td>
        <td><img src="${p.image_url || 'https://via.placeholder.com/50'}" width="40" height="40"></td>
        <td>${p.sku}</td>
        <td>${p.name_ar}</td>
        <td>${p.name_en}</td>
        <td>${p.brand}</td>
        <td>${p.quantity} ${isLow ? '⚠️' : ''}</td>
        <td>${p.items_per_box}</td>
        <td>${p.is_disabled ? 'معطل' : 'نشط'}</td>
        <td>
          <button class="btn" onclick="openEditModal(${p.id})">تعديل</button>
          <button class="btn ${p.is_disabled ? 'btn-success' : 'btn-warning'}" onclick="toggleStatus(${p.id}, ${p.is_disabled})">
            ${p.is_disabled ? 'تفعيل' : 'تعطيل'}
          </button>
        </td>
      </tr>
    `;
  });
}

function downloadTemplate() {
  const template = [
    { sku: "SKU101", image_url: "https://via.placeholder.com/100", name_ar: "منتج 1", name_en: "Product 1", brand: "Rudy", quantity: 50, min_quantity: 5, items_per_box: 12 }
  ];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "Products_Template.xlsx");
}

async function handleExcelUpload(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = async (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let duplicates = [];
    let validRows = [];

    // التحقق من التكرار
    for (let r of rows) {
      const existsLocally = validRows.some(x => x.sku === r.sku);
      const existsInDB = products.some(x => x.sku === String(r.sku));

      if (existsLocally || existsInDB) {
        duplicates.push(r.sku);
      } else {
        validRows.push({
          sku: String(r.sku),
          image_url: r.image_url || '',
          name_ar: r.name_ar,
          name_en: r.name_en,
          brand: r.brand,
          quantity: r.quantity || 0,
          min_quantity: r.min_quantity || 5,
          items_per_box: r.items_per_box || 1
        });
      }
    }

    if (duplicates.length > 0) {
      alert(`⚠️ عذراً، تم تجاهل المنتجات المكررة التالية لتكرار رمز SKU:\n${duplicates.join(', ')}`);
    }

    if (validRows.length > 0) {
      const { error } = await _supabase.from('products').insert(validRows);
      if (error) alert("خطأ أثناء إدخال البيانات: " + error.message);
      else {
        alert("تم رفع المنتجات بنجاح!");
        loadProducts();
      }
    }
  };
  reader.readAsArrayBuffer(file);
}

function openEditModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editProdId').value = p.id;
  document.getElementById('editImage').value = p.image_url;
  document.getElementById('editSku').value = p.sku;
  document.getElementById('editNameAr').value = p.name_ar;
  document.getElementById('editNameEn').value = p.name_en;
  document.getElementById('editBrand').value = p.brand;
  document.getElementById('editQty').value = p.quantity;
  document.getElementById('editMinQty').value = p.min_quantity;
  document.getElementById('editBoxCap').value = p.items_per_box;
  document.getElementById('editModal').style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function saveProductEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const updated = {
    image_url: document.getElementById('editImage').value,
    name_ar: document.getElementById('editNameAr').value,
    name_en: document.getElementById('editNameEn').value,
    brand: document.getElementById('editBrand').value,
    quantity: parseInt(document.getElementById('editQty').value),
    min_quantity: parseInt(document.getElementById('editMinQty').value),
    items_per_box: parseInt(document.getElementById('editBoxCap').value)
  };

  const { error } = await _supabase.from('products').update(updated).eq('id', id);
  if (error) alert("خطأ في التعديل: " + error.message);
  else {
    closeModal('editModal');
    loadProducts();
  }
}

async function toggleStatus(id, currentStatus) {
  await _supabase.from('products').update({ is_disabled: !currentStatus }).eq('id', id);
  loadProducts();
}

async function deleteSelected() {
  const ids = Array.from(document.querySelectorAll('.prod-select:checked')).map(cb => cb.value);
  if (ids.length === 0) return alert("الرجاء تحديد منتجات لحذفها");
  if (confirm("هل أنت تأكد من حذف المنتجات المحددة؟")) {
    await _supabase.from('products').delete().in('id', ids);
    loadProducts();
  }
}

function toggleSelectAll(master) {
  document.querySelectorAll('.prod-select').forEach(cb => cb.checked = master.checked);
}

function exportSelected() {
  const ids = Array.from(document.querySelectorAll('.prod-select:checked')).map(cb => parseInt(cb.value));
  const listToExport = ids.length > 0 ? products.filter(p => ids.includes(p.id)) : products;
  
  const ws = XLSX.utils.json_to_sheet(listToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "Exported_Products.xlsx");
}

document.addEventListener('DOMContentLoaded', loadProducts);
