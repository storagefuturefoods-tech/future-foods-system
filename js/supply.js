let availableProducts = [];
let selectedQuantities = {}; // { productId: qty }
let ordersList = [];

// Get current user
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    return {};
  }
}

// Check Role
function isAdminOrManager() {
  const u = getCurrentUser();
  const role = u.role || '';
  const email = (u.email || '').toLowerCase();
  return role === 'admin' || role === 'store_manager' || email === 'storage.futurefoods@gmail.com';
}

function getEmployeeName() {
  const currentUser = getCurrentUser();
  return currentUser.name || currentUser.full_name || currentUser.user_name || currentUser.email || 'Admin';
}

function previewImage(src, altText) {
  let modal = document.getElementById('imgPreviewModal');
  let img = document.getElementById('previewImageSrc');
  if (modal && img) {
    img.src = src;
    img.alt = altText || 'Product Image';
    modal.style.display = 'flex';
  }
}

function closeImagePreview() {
  const modal = document.getElementById('imgPreviewModal');
  if (modal) modal.style.display = 'none';
}

// Open supply modal
async function openSupplyModal() {
  selectedQuantities = {};
  updateSelectedSummary();

  const { data, error } = await _supabase
    .from('products')
    .select('*')
    .eq('is_disabled', false);

  if (error) {
    alert("Error fetching products: " + error.message);
    return;
  }

  const currentUser = getCurrentUser();
  const userBrand = (currentUser.brand_permission || currentUser.brand || 'All').trim().toLowerCase();

  availableProducts = (data || []).filter(p => {
    if (
      userBrand === 'all' || 
      userBrand === '' || 
      userBrand.includes('&') || 
      userBrand.includes('pizzeria') || 
      (userBrand.includes('marlin') && userBrand.includes('rudy'))
    ) {
      return true;
    }

    const prodBrand = (p.brand || '').trim().toLowerCase();
    return (
      prodBrand === userBrand || 
      prodBrand === 'all' || 
      prodBrand.includes('&') || 
      prodBrand.includes('shared')
    );
  });

  populateCategoriesDropdown(availableProducts);
  renderProductsGrid(availableProducts);
  openModal('supplyModal');
}

function populateCategoriesDropdown(products) {
  const catSelect = document.getElementById('categoryFilter');
  if (!catSelect) return;

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  catSelect.innerHTML = '<option value="ALL">All Categories</option>';
  categories.forEach(cat => {
    catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

// Render Products Grid
function renderProductsGrid(prods) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (prods.length === 0) {
    grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 20px; color: var(--text-muted);">No products found.</p>';
    return;
  }

  prods.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const name = p.name_en || p.name_ar;
    const imgUrl = p.image_url || 'https://via.placeholder.com/100';
    const boxCap = p.items_per_box || 1;
    const currentQty = selectedQuantities[p.id] || 0;
    const isSelected = currentQty > 0;

    grid.innerHTML += `
      <div class="product-card ${isSelected ? 'selected' : ''}" id="pcard-${p.id}" style="padding: 8px; border: 1px solid var(--border-color, #444); border-radius: 6px; text-align: center; background: var(--card-bg, #1e1e1e);">
        <img 
          src="${imgUrl}" 
          alt="${name}" 
          style="width: 100%; height: 75px; object-fit: cover; border-radius: 4px; cursor: pointer;"
          onclick="previewImage('${imgUrl}', '${name}')"
          onerror="this.src='https://via.placeholder.com/100'"
        >
        <h6 style="margin: 4px 0 2px 0; color: var(--text-color); font-size: 0.72rem; line-height: 1.1; font-weight: 600; height: 26px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${name}">${name}</h6>
        
        <div style="font-size: 0.62rem; color: var(--text-muted); margin: 2px 0;">
          Stock: <strong style="color:${isOutOfStock ? '#e53e3e' : 'inherit'}">${p.quantity}</strong> | Box: <strong>${boxCap} Pcs</strong>
        </div>

        ${isOutOfStock ? `
          <div style="font-size: 0.65rem; color: #e53e3e; font-weight: bold; margin-top: 6px;">Out of Stock</div>
        ` : `
          <div class="qty-control">
            <button class="qty-btn" onclick="updateItemQty(${p.id}, -1)">-</button>
            <input type="number" class="qty-input" id="pinput-${p.id}" value="${currentQty}" min="0" max="${p.quantity}" onchange="manualSetQty(${p.id}, this.value)">
            <button class="qty-btn" onclick="updateItemQty(${p.id}, 1)">+</button>
          </div>
        `}
      </div>
    `;
  });
}

function filterProducts() {
  const query = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  const selectedCat = document.getElementById('categoryFilter')?.value || 'ALL';

  const filtered = availableProducts.filter(p => {
    const nameAr = (p.name_ar || '').toLowerCase();
    const nameEn = (p.name_en || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    
    const matchesSearch = nameAr.includes(query) || nameEn.includes(query) || sku.includes(query);
    const matchesCategory = selectedCat === 'ALL' || p.category === selectedCat;

    return matchesSearch && matchesCategory;
  });

  renderProductsGrid(filtered);
}

function updateItemQty(prodId, change) {
  const prod = availableProducts.find(p => p.id === prodId);
  if (!prod) return;

  let current = selectedQuantities[prodId] || 0;
  let updated = current + change;

  if (updated < 0) updated = 0;
  if (updated > prod.quantity) {
    alert(`Max available stock is ${prod.quantity}`);
    updated = prod.quantity;
  }

  if (updated === 0) {
    delete selectedQuantities[prodId];
  } else {
    selectedQuantities[prodId] = updated;
  }

  const inputEl = document.getElementById(`pinput-${prodId}`);
  if (inputEl) inputEl.value = updated;

  const cardEl = document.getElementById(`pcard-${prodId}`);
  if (cardEl) {
    if (updated > 0) cardEl.classList.add('selected');
    else cardEl.classList.remove('selected');
  }

  updateSelectedSummary();
}

function manualSetQty(prodId, value) {
  const prod = availableProducts.find(p => p.id === prodId);
  if (!prod) return;

  let val = parseInt(value) || 0;
  if (val < 0) val = 0;
  if (val > prod.quantity) {
    alert(`Max available stock is ${prod.quantity}`);
    val = prod.quantity;
  }

  if (val === 0) delete selectedQuantities[prodId];
  else selectedQuantities[prodId] = val;

  const inputEl = document.getElementById(`pinput-${prodId}`);
  if (inputEl) inputEl.value = val;

  const cardEl = document.getElementById(`pcard-${prodId}`);
  if (cardEl) {
    if (val > 0) cardEl.classList.add('selected');
    else cardEl.classList.remove('selected');
  }

  updateSelectedSummary();
}

function updateSelectedSummary() {
  const count = Object.keys(selectedQuantities).length;
  const countEl = document.getElementById('selectedCount');
  if (countEl) countEl.innerText = count;
}

// -------------------------------------------------------------
// Open Independent Preview Modal
// -------------------------------------------------------------
function openOrderPreview() {
  const selectedIds = Object.keys(selectedQuantities);
  if (selectedIds.length === 0) {
    return alert("Please select at least one product by increasing its quantity!");
  }

  const previewList = document.getElementById('previewItemsList');
  if (!previewList) return;

  previewList.innerHTML = '';

  selectedIds.forEach(id => {
    const p = availableProducts.find(item => item.id == id);
    const qty = selectedQuantities[id];
    const imgUrl = p.image_url || 'https://via.placeholder.com/50';
    const name = p.name_en || p.name_ar;

    previewList.innerHTML += `
      <div class="preview-card-item">
        <img src="${imgUrl}" alt="${name}" onerror="this.src='https://via.placeholder.com/50'">
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 0.9rem; color: var(--text-color);">${name}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Quantity: <strong style="color: var(--primary-color, #2e7d32); font-size:0.95rem;">${qty} Pcs</strong>
          </div>
        </div>
      </div>
    `;
  });

  const notes = (document.getElementById('orderNotes')?.value || '').trim();
  const notesBox = document.getElementById('previewNotesBox');
  const notesText = document.getElementById('previewNotesText');

  if (notes) {
    notesText.innerText = notes;
    notesBox.style.display = 'block';
  } else {
    notesBox.style.display = 'none';
  }

  closeModal('supplyModal');
  openModal('orderPreviewModal');
}

function closePreviewAndReturn() {
  closeModal('orderPreviewModal');
  openModal('supplyModal');
}

// -------------------------------------------------------------
// Confirm and Submit Order (تخصم من المخزون فوراً)
// -------------------------------------------------------------
async function confirmAndSubmitOrder() {
  const selectedIds = Object.keys(selectedQuantities);
  if (selectedIds.length === 0) return alert("No items selected.");

  const btn = document.getElementById('confirmOrderBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Submitting...';
  }

  const currentUser = getCurrentUser();
  const orderNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const notes = document.getElementById('orderNotes')?.value || '';
  const empName = getEmployeeName();

  const { data: newOrder, error } = await _supabase
    .from('orders')
    .insert([{
      order_number: orderNum,
      user_name: empName,
      user_email: currentUser ? currentUser.email : '',
      brand: currentUser ? (currentUser.brand_permission || currentUser.brand) : '',
      total_items: selectedIds.length,
      notes: notes,
      status: 'New'
    }])
    .select()
    .single();

  if (error) {
    if (btn) { btn.disabled = false; btn.innerText = 'Confirm Request'; }
    return alert("Failed to submit request: " + error.message);
  }

  const orderItems = selectedIds.map(id => {
    const p = availableProducts.find(item => item.id == id);
    const qty = selectedQuantities[id];
    return {
      order_id: newOrder.id,
      product_sku: p.sku,
      product_name: p.name_en || p.name_ar,
      image_url: p.image_url,
      quantity_pieces: qty,
      box_capacity: p.items_per_box
    };
  });

  await _supabase.from('order_items').insert(orderItems);

  // خصم الكميات المحددة من جدول المنتجات في المخزون
  for (const id of selectedIds) {
    const prod = availableProducts.find(p => p.id == id);
    const requestedQty = selectedQuantities[id];
    if (prod) {
      const newStock = Math.max(0, (prod.quantity || 0) - requestedQty);
      await _supabase
        .from('products')
        .update({ quantity: newStock })
        .eq('id', prod.id);
    }
  }

  await _supabase.from('order_logs').insert([{
    order_id: newOrder.id,
    status_change: 'Order Created (New)',
    action_by: empName
  }]);

  alert("Supply Request submitted successfully! Order ID: " + orderNum);

  if (btn) {
    btn.disabled = false;
    btn.innerText = 'Confirm Request';
  }

  selectedQuantities = {};
  const notesEl = document.getElementById('orderNotes');
  if (notesEl) notesEl.value = '';

  closeModal('orderPreviewModal');
  loadOrders();
}

// Fetch orders list
async function loadOrders() {
  const filter = document.getElementById('statusFilter')?.value || 'ALL';
  const searchQuery = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();

  let query = _supabase.from('orders').select('*').order('id', { ascending: false });
  
  if (filter !== 'ALL' && filter !== 'الكل') {
    query = query.eq('status', filter);
  }

  if (searchQuery) {
    query = query.or(`order_number.ilike.%${searchQuery}%,user_name.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) return alert("Error fetching orders: " + error.message);

  ordersList = data || [];
  const tbody = document.getElementById('ordersBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (ordersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; color:var(--text-muted); text-align:center;">No supply requests found.</td></tr>';
    return;
  }

  const canEditStatus = isAdminOrManager();

  ordersList.forEach(o => {
    const statusCell = canEditStatus ? `
      <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:4px; background:var(--input-bg); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;">
        <option value="New" ${o.status==='New' || o.status==='جديد' ?'selected':''}>New</option>
        <option value="In Preparation" ${o.status==='In Preparation' || o.status==='جاري التجهيز' ?'selected':''}>In Preparation</option>
        <option value="Ready" ${o.status==='Ready' || o.status==='جاهز' ?'selected':''}>Ready</option>
        <option value="Completed" ${o.status==='Completed' || o.status==='مكتمل' ?'selected':''}>Completed</option>
        <option value="Cancelled" ${o.status==='Cancelled' || o.status==='ملغي' ?'selected':''}>Cancelled</option>
      </select>
    ` : `<span style="font-weight:bold; padding: 4px 8px; border-radius:4px; background:rgba(255,255,255,0.1);">${o.status}</span>`;

    tbody.innerHTML += `
      <tr>
        <td><input type="checkbox" class="order-select" value="${o.id}"></td>
        <td><a href="#" style="color:var(--primary-color); font-weight:bold;" onclick="viewOrderDetails(${o.id}); return false;">${o.order_number}</a></td>
        <td>${o.user_name || '-'}</td>
        <td>${o.brand || '-'}</td>
        <td>${o.total_items}</td>
        <td>${statusCell}</td>
        <td>${o.notes || '-'}</td>
        <td><button class="btn" style="padding:4px 8px;" onclick="viewOrderDetails(${o.id})">Details</button></td>
      </tr>
    `;
  });
}

// -------------------------------------------------------------
// Update Order Status (تطوير عملية الإرجاع أو الخصم حسب الحالة)
// -------------------------------------------------------------
async function updateOrderStatus(orderId, newStatus) {
  if (!isAdminOrManager()) {
    alert("Sorry, you do not have permission to change order status!");
    loadOrders();
    return;
  }

  const currentOrder = ordersList.find(o => o.id === orderId);
  const oldStatus = currentOrder ? currentOrder.status : '';

  if (oldStatus === newStatus) return;

  // جلب عناصر الطلب للتعديل
  const { data: items, error: itemsErr } = await _supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (!itemsErr && items && items.length > 0) {
    const isNowCancelled = newStatus === 'Cancelled' || newStatus === 'ملغي';
    const wasCancelled = oldStatus === 'Cancelled' || oldStatus === 'ملغي';

    // 1. عند تحويل الطلب إلى ملغي: إرجاع الكمية للمخزون
    if (isNowCancelled && !wasCancelled) {
      for (const item of items) {
        if (item.product_sku) {
          const { data: pData } = await _supabase
            .from('products')
            .select('id, quantity')
            .eq('sku', item.product_sku)
            .single();

          if (pData) {
            await _supabase
              .from('products')
              .update({ quantity: (pData.quantity || 0) + item.quantity_pieces })
              .eq('id', pData.id);
          }
        }
      }
    } 
    // 2. عند تغيير الحالة من ملغي إلى حالة أخرى: اعادة خصم الكمية من المخزون
    else if (!isNowCancelled && wasCancelled) {
      for (const item of items) {
        if (item.product_sku) {
          const { data: pData } = await _supabase
            .from('products')
            .select('id, quantity')
            .eq('sku', item.product_sku)
            .single();

          if (pData) {
            const newQty = Math.max(0, (pData.quantity || 0) - item.quantity_pieces);
            await _supabase
              .from('products')
              .update({ quantity: newQty })
              .eq('id', pData.id);
          }
        }
      }
    }
  }

  const empName = getEmployeeName();
  await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  await _supabase.from('order_logs').insert([{
    order_id: orderId,
    status_change: `Status changed to (${newStatus})`,
    action_by: empName
  }]);
  
  loadOrders();
}

async function viewOrderDetails(orderId) {
  const { data: items } = await _supabase.from('order_items').select('*').eq('order_id', orderId);
  const { data: logs } = await _supabase.from('order_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: true });

  const numElem = document.getElementById('modalOrderNum');
  const currentOrder = ordersList.find(o => o.id === orderId);
  if (numElem && currentOrder) {
    numElem.innerText = `(${currentOrder.order_number})`;
  }

  const content = document.getElementById('orderDetailsContent');
  if (content) {
    const itemsHtml = (items || []).map(i => {
      const boxes = (i.quantity_pieces / (i.box_capacity || 1)).toFixed(1);
      const imgUrl = i.image_url || 'https://via.placeholder.com/50';
      
      return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--border-color, #333);">
          <img src="${imgUrl}" alt="${i.product_name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color, #444); background: #222;" onerror="this.src='https://via.placeholder.com/48'">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 0.95rem; color: var(--text-color, #fff);">${i.product_name}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted, #aaa); margin-top: 2px;">
              Quantity: <span style="color:var(--primary-color, #4CAF50); font-weight:bold;">${i.quantity_pieces}</span> Pcs 
              <span style="opacity: 0.8;">(${boxes} Boxes)</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h6 style="margin-bottom: 10px; color: var(--primary-color, #4CAF50); font-size: 0.9rem;">📦 Order Items:</h6>
        ${itemsHtml || '<p style="color:var(--text-muted);">No items found</p>'}
      </div>
    `;
  }

  const timeline = document.getElementById('orderTimeline');
  if (timeline) {
    const logsHtml = (logs || []).map(l => {
      const d = new Date(l.created_at);
      const formattedDate = d.toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      return `
        <li style="margin-bottom: 8px; font-size: 0.85rem; color: var(--text-color, #ddd); list-style-type: disc;">
          <span style="font-weight: bold;">${l.status_change}</span>
          <span style="color: var(--text-muted, #aaa);"> by: </span>
          <span style="color: #64B5F6;">${l.action_by}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted, #888); margin-top: 2px;">🕒 ${formattedDate}</div>
        </li>
      `;
    }).join('');

    timeline.innerHTML = `
      <hr style="border: 0; border-top: 1px solid var(--border-color, #444); margin: 20px 0 15px 0;">
      <h6 style="margin-bottom: 10px; color: #FFB74D; font-size: 0.9rem;">📜 Audit Log:</h6>
      <ul style="padding-left: 20px; margin: 0;">
        ${logsHtml || '<li style="color:var(--text-muted);">No action logs recorded</li>'}
      </ul>
    `;
  }

  openModal('orderDetailsModal');
}

function formatDateForExcel(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

async function exportOrders() {
  const ids = Array.from(document.querySelectorAll('.order-select:checked')).map(cb => parseInt(cb.value));
  const selectedOrders = ids.length > 0 ? ordersList.filter(o => ids.includes(o.id)) : ordersList;

  if (selectedOrders.length === 0) return alert("No orders to export");

  try {
    const targetIds = selectedOrders.map(o => o.id);
    const { data: items } = await _supabase.from('order_items').select('*').in('order_id', targetIds);
    const { data: logs } = await _supabase.from('order_logs').select('order_id, created_at').in('order_id', targetIds).order('created_at', { ascending: false });

    const lastUpdateMap = {};
    (logs || []).forEach(l => {
      if (!lastUpdateMap[l.order_id]) lastUpdateMap[l.order_id] = l.created_at;
    });

    const { data: allProds } = await _supabase.from('products').select('sku, name_ar, name_en');
    const prodMap = {};
    (allProds || []).forEach(p => { if (p.sku) prodMap[p.sku] = p; });

    const rows = [];
    selectedOrders.forEach(o => {
      const orderItems = (items || []).filter(i => i.order_id === o.id);
      const orderDateFormatted = formatDateForExcel(o.created_at);
      const lastUpdateFormatted = formatDateForExcel(lastUpdateMap[o.id] || o.updated_at || o.created_at);

      if (orderItems.length > 0) {
        orderItems.forEach(i => {
          const sku = i.product_sku || '-';
          const matchedProd = prodMap[sku] || {};
          rows.push({
            "Order Number": o.order_number || '-',
            "Requested By": o.user_name || '-',
            "SKU": sku,
            "Product Name (Ar)": matchedProd.name_ar || i.product_name || '-',
            "Product Name (En)": matchedProd.name_en || i.product_name || '-',
            "Quantity (Pcs)": i.quantity_pieces || 0,
            "Status": o.status || '-',
            "Order Date": orderDateFormatted,
            "Last Update": lastUpdateFormatted
          });
        });
      } else {
        rows.push({
          "Order Number": o.order_number || '-',
          "Requested By": o.user_name || '-',
          "SKU": '-',
          "Product Name (Ar)": 'No items',
          "Product Name (En)": 'No items',
          "Quantity (Pcs)": 0,
          "Status": o.status || '-',
          "Order Date": orderDateFormatted,
          "Last Update": lastUpdateFormatted
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders Detailed");
    XLSX.writeFile(wb, "Supply_Orders_Detailed_Export.xlsx");
  } catch (e) {
    console.error("Export error:", e);
    alert("An error occurred during export.");
  }
}

function toggleSelectAllOrders(master) {
  document.querySelectorAll('.order-select').forEach(cb => cb.checked = master.checked);
}

function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex'; 
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.style.display = 'none'; 
}

document.addEventListener('DOMContentLoaded', loadOrders);
