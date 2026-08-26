// --- Modal Control Helper Functions ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

let allProducts = [];
let currentOrderItems = [];
let allOrdersList = [];
let activeTabFilter = 'All';

// دالة مساعدة للحصول على سعة الكرتون من العمود الصحيح في قاعدة البيانات
function getBoxCapacity(product) {
  if (!product) return 1;
  const val = parseInt(product.items_per_box || product.pcs_per_carton || product.pcs_per_box, 10);
  return isNaN(val) || val < 1 ? 1 : val;
}

window.addEventListener('DOMContentLoaded', () => {
  initProcurement();
});

async function initProcurement() {
  await fetchProducts();
  await fetchOrders();
}

async function fetchProducts() {
  const { data, error } = await _supabase.from('products').select('*').eq('is_disabled', false);
  if (data) {
    allProducts = data;
  }
}

async function fetchOrders() {
  const { data, error } = await _supabase.from('procurement_orders').select('*').order('id', { ascending: false });
  if (data) {
    allOrdersList = data;
    renderOrdersList();
  }
}

function renderOrdersList() {
  const container = document.getElementById('ordersList');
  container.innerHTML = '';

  let filtered = allOrdersList;
  if (activeTabFilter === 'Pending') {
    filtered = allOrdersList.filter(o => o.status === 'Pending');
  } else if (activeTabFilter === 'Ordered') {
    filtered = allOrdersList.filter(o => o.status === 'Ordered' || o.status === 'Partially Received');
  } else if (activeTabFilter === 'Completed') {
    filtered = allOrdersList.filter(o => o.status === 'Completed' || o.status === 'Received');
  } else if (activeTabFilter === 'Cancelled') {
    filtered = allOrdersList.filter(o => o.status === 'Cancelled');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 30px; color: var(--text-muted);">No procurement orders found for this view.</p>';
    return;
  }

  filtered.forEach(order => {
    let statusBadgeClass = 'status-pending';
    if (order.status === 'Ordered') statusBadgeClass = 'status-ordered';
    else if (order.status === 'Partially Received') statusBadgeClass = 'status-partial';
    else if (order.status === 'Completed' || order.status === 'Received') statusBadgeClass = 'status-completed';
    else if (order.status === 'Cancelled') statusBadgeClass = 'status-cancelled';

    const formattedDate = order.created_at ? new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
    const items = order.items || [];

    const hasUnorderedItems = items.some(i => !i.is_ordered && !i.received);
    const hasReceivableItems = items.some(i => i.is_ordered && !i.received);

    let itemsRowsHtml = items.map((i, idx) => {
      const isOrdered = i.is_ordered === true;
      const isReceived = i.received === true;
      const pcsPerCarton = getBoxCapacity(i);
      
      const boxesCount = i.boxes_qty || Math.ceil(i.qty / pcsPerCarton) || 1;
      const totalPcs = i.qty || (boxesCount * pcsPerCarton);

      return `
        <div class="item-row" style="${isReceived ? 'opacity:0.75; background:rgba(16, 185, 129, 0.08);' : (isOrdered ? 'border-left: 4px solid #3b82f6;' : '')}">
          
          <div style="display:flex; align-items:center; gap:12px;">
            ${(!isOrdered && !isReceived && order.status !== 'Cancelled') ? `
              <input type="checkbox" class="order-chk-${order.id}" value="${idx}" style="width:18px; height:18px; cursor:pointer;" title="Select for Ordering">
            ` : ''}

            ${(isOrdered && !isReceived && order.status !== 'Cancelled') ? `
              <input type="checkbox" class="recv-chk-${order.id}" value="${idx}" style="width:18px; height:18px; cursor:pointer;" title="Select for Receiving">
            ` : ''}

            <img src="${i.image_url || 'https://via.placeholder.com/44'}" onerror="this.src='https://via.placeholder.com/44'">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-color);">${i.name_en || i.name_ar}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">
                Box Capacity: <strong>${pcsPerCarton} Pcs/Box</strong>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:15px;">
            <div style="text-align:right;">
              <div style="font-size:0.85rem; color:var(--text-muted);">Requested: <strong style="color:var(--text-color); font-size:1rem;">${boxesCount} Boxes (${totalPcs} Pcs)</strong></div>
              ${isReceived ? `<div style="font-size:0.8rem; color:#10b981; font-weight:bold;">Received: ${i.actual_received_qty || totalPcs} Pcs</div>` : ''}
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
              ${order.status === 'Cancelled' ? '' : (
                isReceived ? `
                  <span style="color:#10b981; font-weight:bold; font-size:0.8rem;"><i class="fa-solid fa-circle-check"></i> In Stock</span>
                ` : (
                  !isOrdered ? `
                    <button class="btn" style="background:#3b82f6; padding:4px 10px; font-size:0.75rem;" onclick="markSingleItemOrdered(${order.id}, ${idx})">
                      <i class="fa-solid fa-paper-plane"></i> Order Item
                    </button>
                  ` : `
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px; border:1px solid #444;">
                      <span style="font-size:0.75rem; color:#aaa;">Recv Qty (Pcs):</span>
                      <input type="number" id="recv-qty-${order.id}-${idx}" value="${totalPcs}" min="0" class="qty-input">
                      <button class="btn" style="background:#10b981; padding:4px 8px; font-size:0.75rem;" onclick="markSingleItemReceived(${order.id}, ${idx})">
                        <i class="fa-solid fa-boxes-packing"></i> Receive & Stock
                      </button>
                    </div>
                  `
                )
              )}

              ${(!isReceived && order.status !== 'Cancelled') ? `
                <button class="btn" style="background:rgba(239, 68, 68, 0.2); color:#ef4444; border:1px solid #ef4444; padding:4px 8px; font-size:0.75rem;" title="Remove this item from order" onclick="removeSingleItemFromOrder(${order.id}, ${idx})">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML += `
      <div class="order-card">
        <div class="order-header" onclick="toggleAccordion(${order.id})">
          <div style="display:flex; align-items:center; gap:12px;">
            <i class="fa-solid fa-chevron-down" id="arrow-${order.id}" style="transition: transform 0.2s;"></i>
            <strong>Order #${order.id}</strong>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${formattedDate}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="status-badge ${statusBadgeClass}">${order.status}</span>
            ${(order.status === 'Pending' || order.status === 'Ordered') ? `
              <button class="btn" style="background:#ef4444; padding:4px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); cancelOrder(${order.id})"><i class="fa-solid fa-ban"></i> Cancel Order</button>
            ` : ''}
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); exportOrderPDF(${order.id})"><i class="fa-solid fa-file-pdf"></i> PDF</button>
          </div>
        </div>

        <div class="order-body" id="body-${order.id}">
          
          ${hasUnorderedItems && order.status !== 'Cancelled' ? `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(59, 130, 246, 0.1); padding:8px 12px; border-radius:6px; margin-bottom:10px; border:1px solid rgba(59, 130, 246, 0.3);">
              <label style="font-size:0.85rem; font-weight:bold; cursor:pointer;">
                <input type="checkbox" onchange="toggleSelectAllOrderItems(${order.id}, this.checked)"> Select All for Procurement
              </label>
              <button class="btn" style="background:#3b82f6; padding:4px 12px; font-size:0.8rem;" onclick="bulkMarkOrdered(${order.id})">
                <i class="fa-solid fa-paper-plane"></i> Mark Selected as Ordered (Procurement)
              </button>
            </div>
          ` : ''}

          ${hasReceivableItems && order.status !== 'Cancelled' ? `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16, 185, 129, 0.1); padding:8px 12px; border-radius:6px; margin-bottom:10px; border:1px solid rgba(16, 185, 129, 0.3);">
              <label style="font-size:0.85rem; font-weight:bold; cursor:pointer;">
                <input type="checkbox" onchange="toggleSelectAllRecvItems(${order.id}, this.checked)"> Select All for Warehouse Receiving
              </label>
              <button class="btn" style="background:#10b981; padding:4px 12px; font-size:0.8rem;" onclick="bulkMarkReceived(${order.id})">
                <i class="fa-solid fa-boxes-packing"></i> Bulk Receive Selected & Update Stock
              </button>
            </div>
          ` : ''}

          ${order.notes ? `<div style="font-size:0.85rem; margin-bottom:10px; padding:6px 10px; background:var(--card-bg); border-radius:4px;"><strong>Notes:</strong> ${order.notes}</div>` : ''}
          <div>${itemsRowsHtml}</div>
          <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted); text-align:right;">Requested by: ${order.created_by || 'Manager'}</div>
        </div>
      </div>
    `;
  });
}

function renderOrderItems() {
  const container = document.getElementById('orderItemsContainer');
  container.innerHTML = '';

  if (currentOrderItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No products added yet. Click "Add Product from Catalog".</p>';
    return;
  }

  currentOrderItems.forEach((item, index) => {
    const pcsPerBox = getBoxCapacity(item);
    const boxesCount = item.boxes_qty || 1;
    const totalPcs = item.custom_total_pcs !== undefined ? item.custom_total_pcs : (boxesCount * pcsPerBox);

    container.innerHTML += `
      <div class="item-row">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${item.image_url || 'https://via.placeholder.com/44'}" onerror="this.src='https://via.placeholder.com/44'">
          <div>
            <strong style="font-size:0.88rem; color:var(--text-color);">${item.name_en || item.name_ar}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">Box Capacity: <strong>${pcsPerBox} Pcs/Box</strong></div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:15px;">
          <div class="unit-group">
            <span class="unit-label">Boxes</span>
            <div class="qty-picker">
              <button class="qty-btn" onclick="updateItemBoxes(${index}, -1)">-</button>
              <input type="number" class="qty-input" value="${boxesCount}" min="1" onchange="setItemBoxesDirect(${index}, this.value)">
              <button class="qty-btn" onclick="updateItemBoxes(${index}, 1)">+</button>
            </div>
          </div>

          <div class="unit-group">
            <span class="unit-label">Total Pcs</span>
            <input type="number" class="qty-input" value="${totalPcs}" min="1" onchange="setItemTotalPcsDirect(${index}, this.value)">
          </div>

          <button class="btn" style="background:none; color:#ef4444; border:none; font-size:1.1rem; cursor:pointer;" onclick="removeProductFromOrder(${index})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
}

function updateItemBoxes(index, change) {
  if (currentOrderItems[index]) {
    let current = currentOrderItems[index].boxes_qty || 1;
    let newQty = current + change;
    if (newQty < 1) newQty = 1;

    const pcsPerBox = getBoxCapacity(currentOrderItems[index]);
    currentOrderItems[index].boxes_qty = newQty;
    currentOrderItems[index].custom_total_pcs = newQty * pcsPerBox;
    renderOrderItems();
  }
}

function setItemBoxesDirect(index, value) {
  let val = parseInt(value, 10) || 1;
  if (val < 1) val = 1;
  if (currentOrderItems[index]) {
    const pcsPerBox = getBoxCapacity(currentOrderItems[index]);
    currentOrderItems[index].boxes_qty = val;
    currentOrderItems[index].custom_total_pcs = val * pcsPerBox;
    renderOrderItems();
  }
}

function setItemTotalPcsDirect(index, value) {
  let pcs = parseInt(value, 10) || 1;
  if (pcs < 1) pcs = 1;

  if (currentOrderItems[index]) {
    const pcsPerBox = getBoxCapacity(currentOrderItems[index]);
    const calculatedBoxes = Math.ceil(pcs / pcsPerBox);

    currentOrderItems[index].custom_total_pcs = pcs;
    currentOrderItems[index].boxes_qty = calculatedBoxes < 1 ? 1 : calculatedBoxes;
    
    renderOrderItems();
  }
}

function toggleProductSelection(productId) {
  const prod = allProducts.find(p => p.id == productId);
  if (!prod) return;

  const existIndex = currentOrderItems.findIndex(i => i.id == productId);
  if (existIndex > -1) {
    currentOrderItems.splice(existIndex, 1);
  } else {
    currentOrderItems.push({
      ...prod,
      boxes_qty: 1
    });
  }
  renderCatalogProducts();
  renderOrderItems();
}

function removeProductFromOrder(index) {
  currentOrderItems.splice(index, 1);
  renderOrderItems();
}

function openCreateOrderModal() {
  currentOrderItems = [];
  document.getElementById('orderNotesInput').value = '';
  renderOrderItems();
  openModal('createOrderModal');
}

function openProductSelectorModal() {
  document.getElementById('catalogSearchInput').value = '';
  renderCatalogProducts();
  openModal('productSelectorModal');
}

function renderCatalogProducts() {
  const container = document.getElementById('catalogContainer');
  const query = (document.getElementById('catalogSearchInput').value || '').toLowerCase().trim();
  container.innerHTML = '';

  const filtered = allProducts.filter(p => {
    const nameEn = (p.name_en || '').toLowerCase();
    const nameAr = (p.name_ar || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    return nameEn.includes(query) || nameAr.includes(query) || sku.includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">No products match your search.</p>';
    return;
  }

  filtered.forEach(p => {
    const inPendingOrder = isProductInPendingOrders(p.id);
    const alreadyInList = currentOrderItems.some(item => item.id == p.id);
    const pcsPerCarton = getBoxCapacity(p);

    container.innerHTML += `
      <div class="product-select-card ${alreadyInList ? 'added' : ''} ${inPendingOrder ? 'disabled' : ''}" 
           onclick="${inPendingOrder ? '' : `toggleProductSelection(${p.id})`}">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${p.image_url || 'https://via.placeholder.com/44'}" style="width:44px; height:44px; object-fit:cover; border-radius:6px;">
          <div>
            <strong style="font-size:0.88rem; color:var(--text-color);">${p.name_en || p.name_ar}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">
              Box Capacity: <strong>${pcsPerCarton} Pcs/Box</strong> | Stock: <strong style="color:${p.quantity <= 5 ? '#ef4444' : '#10b981'}">${p.quantity}</strong>
            </div>
          </div>
        </div>
        <div>
          ${inPendingOrder ? '<span style="font-size:0.75rem; color:#ef4444;">Already Pending</span>' : (alreadyInList ? '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Selected' : '<i class="fa-solid fa-plus" style="color:#2563eb;"></i>')}
        </div>
      </div>
    `;
  });
}

function autoAddLowStockItems() {
  const lowStockList = allProducts.filter(p => p.quantity <= (p.min_quantity || p.min_limit || 5));
  let addedCount = 0;

  lowStockList.forEach(p => {
    const alreadyInCurrentModal = currentOrderItems.some(item => item.id == p.id);
    const inPendingOrder = isProductInPendingOrders(p.id);

    if (!alreadyInCurrentModal && !inPendingOrder) {
      currentOrderItems.push({
        ...p,
        boxes_qty: 2
      });
      addedCount++;
    }
  });

  if (addedCount === 0) alert('No new low-stock items to add.');
  renderOrderItems();
}

function isProductInPendingOrders(productId) {
  return allOrdersList.some(order => {
    if (order.status === 'Completed' || order.status === 'Received' || order.status === 'Cancelled') return false;
    return (order.items || []).some(item => item.id == productId && !item.received);
  });
}

async function submitSupplyOrder() {
  if (currentOrderItems.length === 0) return alert('Please add at least one product.');

  const notes = document.getElementById('orderNotesInput').value.trim();
  const formattedItems = currentOrderItems.map(item => {
    const pcsPerBox = getBoxCapacity(item);
    const boxesQty = item.boxes_qty || 1;
    const totalPcs = item.custom_total_pcs !== undefined ? item.custom_total_pcs : (boxesQty * pcsPerBox);

    return {
      id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      image_url: item.image_url,
      items_per_box: pcsPerBox,
      boxes_qty: boxesQty,
      qty: totalPcs,
      is_ordered: false,
      received: false
    };
  });

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerText = 'Submitting...';

  const { error } = await _supabase.from('procurement_orders').insert([{
    items: formattedItems,
    notes: notes,
    status: 'Pending',
    created_by: 'Manager'
  }]);

  btn.disabled = false;
  btn.innerText = 'Submit Order';

  if (error) {
    alert('Failed to submit order: ' + error.message);
  } else {
    closeModal('createOrderModal');
    await initProcurement();
  }
}

function toggleAccordion(orderId) {
  const body = document.getElementById(`body-${orderId}`);
  const arrow = document.getElementById(`arrow-${orderId}`);
  if (body) {
    body.classList.toggle('open');
    if (arrow) arrow.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function filterOrders(status, btn) {
  activeTabFilter = status;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOrdersList();
}

function toggleSelectAllOrderItems(orderId, isChecked) {
  document.querySelectorAll(`.order-chk-${orderId}`).forEach(chk => chk.checked = isChecked);
}

function toggleSelectAllRecvItems(orderId, isChecked) {
  document.querySelectorAll(`.recv-chk-${orderId}`).forEach(chk => chk.checked = isChecked);
}

async function markSingleItemOrdered(orderId, itemIndex) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order || !order.items[itemIndex]) return;

  order.items[itemIndex].is_ordered = true;
  const allOrdered = order.items.every(i => i.is_ordered || i.received);

  const { error } = await _supabase.from('procurement_orders')
    .update({ items: order.items, status: allOrdered ? 'Ordered' : order.status })
    .eq('id', orderId);

  if (!error) await initProcurement();
}

async function bulkMarkOrdered(orderId) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order) return;

  const checkedBoxes = document.querySelectorAll(`.order-chk-${orderId}:checked`);
  if (checkedBoxes.length === 0) return alert('Please select at least one item to mark as ordered.');

  checkedBoxes.forEach(chk => {
    const idx = parseInt(chk.value, 10);
    if (order.items[idx]) {
      order.items[idx].is_ordered = true;
    }
  });

  const allOrdered = order.items.every(i => i.is_ordered || i.received);

  const { error } = await _supabase.from('procurement_orders')
    .update({ items: order.items, status: allOrdered ? 'Ordered' : order.status })
    .eq('id', orderId);

  if (!error) await initProcurement();
}

async function markSingleItemReceived(orderId, itemIndex) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order || !order.items[itemIndex]) return;

  const inputEl = document.getElementById(`recv-qty-${orderId}-${itemIndex}`);
  const actualQty = inputEl ? (parseInt(inputEl.value, 10) || 0) : order.items[itemIndex].qty;

  order.items[itemIndex].received = true;
  order.items[itemIndex].actual_received_qty = actualQty;

  const itemData = order.items[itemIndex];
  const prod = allProducts.find(p => p.id == itemData.id);
  if (prod) {
    const newQty = prod.quantity + actualQty;
    await _supabase.from('products').update({ quantity: newQty }).eq('id', prod.id);
  }

  const allReceived = order.items.every(i => i.received === true);
  const newStatus = allReceived ? 'Completed' : 'Partially Received';

  const { error } = await _supabase.from('procurement_orders')
    .update({ items: order.items, status: newStatus })
    .eq('id', orderId);

  if (!error) await initProcurement();
}

async function bulkMarkReceived(orderId) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order) return;

  const checkedBoxes = document.querySelectorAll(`.recv-chk-${orderId}:checked`);
  if (checkedBoxes.length === 0) return alert('Please select at least one item to receive into stock.');

  for (let chk of checkedBoxes) {
    const idx = parseInt(chk.value, 10);
    const item = order.items[idx];
    if (item && !item.received) {
      const inputEl = document.getElementById(`recv-qty-${orderId}-${idx}`);
      const actualQty = inputEl ? (parseInt(inputEl.value, 10) || 0) : item.qty;

      item.received = true;
      item.actual_received_qty = actualQty;

      const prod = allProducts.find(p => p.id == item.id);
      if (prod) {
        const newQty = prod.quantity + actualQty;
        await _supabase.from('products').update({ quantity: newQty }).eq('id', prod.id);
      }
    }
  }

  const allReceived = order.items.every(i => i.received === true);
  const newStatus = allReceived ? 'Completed' : 'Partially Received';

  const { error } = await _supabase.from('procurement_orders')
    .update({ items: order.items, status: newStatus })
    .eq('id', orderId);

  if (!error) await initProcurement();
}

async function removeSingleItemFromOrder(orderId, itemIndex) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order || !order.items[itemIndex]) return;

  if (!confirm(`Are you sure you want to remove "${order.items[itemIndex].name_en || order.items[itemIndex].name_ar}" from this order?`)) return;

  order.items.splice(itemIndex, 1);

  if (order.items.length === 0) {
    await _supabase.from('procurement_orders').update({ status: 'Cancelled' }).eq('id', orderId);
  } else {
    const allReceived = order.items.every(i => i.received === true);
    const allOrdered = order.items.every(i => i.is_ordered || i.received);
    let newStatus = order.status;
    if (allReceived) newStatus = 'Completed';
    else if (allOrdered) newStatus = 'Ordered';

    await _supabase.from('procurement_orders').update({ items: order.items, status: newStatus }).eq('id', orderId);
  }

  await initProcurement();
}

async function cancelOrder(orderId) {
  if (!confirm(`Are you sure you want to cancel order #${orderId}?`)) return;
  const { error } = await _supabase.from('procurement_orders').update({ status: 'Cancelled' }).eq('id', orderId);
  if (!error) await initProcurement();
}

function exportOrderPDF(orderId) {
  const order = allOrdersList.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('pdfOrderId').innerText = order.id;
  document.getElementById('pdfDate').innerText = new Date(order.created_at).toLocaleDateString();
  document.getElementById('pdfStatus').innerText = order.status;
  document.getElementById('pdfNotes').innerText = order.notes || 'N/A';

  const tbody = document.getElementById('pdfTableBody');
  tbody.innerHTML = (order.items || []).map(i => {
    const pcsPerBox = getBoxCapacity(i);
    const boxes = i.boxes_qty || Math.ceil(i.qty / pcsPerBox) || 1;
    const totalPcs = i.qty || (boxes * pcsPerBox);

    return `
      <tr>
        <td><img src="${i.image_url || ''}"></td>
        <td>${pcsPerBox} Pcs/Box</td>
        <td>${i.name_en || i.name_ar}</td>
        <td>${boxes} Boxes</td>
        <td>${totalPcs} Pcs</td>
      </tr>
    `;
  }).join('');

  const element = document.getElementById('pdfRenderArea');
  element.style.display = 'block';

  html2pdf().set({
    margin: 10,
    filename: `Order_${order.id}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(element).save().then(() => {
    element.style.display = 'none';
  });
}
