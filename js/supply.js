let availableProducts = [];
let cart = [];
let ordersList = [];

// Get current user
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('app_user') || localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    return {};
  }
}

// Check if current user is Admin or Store Manager
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
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imgPreviewModal';
    modal.className = 'img-preview-modal';
    modal.onclick = closeImagePreview;
    modal.innerHTML = `
      <span style="position: absolute; top: 20px; right: 25px; color: #fff; font-size: 35px; font-weight: bold; cursor: pointer;">&times;</span>
      <img id="previewImageSrc" src="" alt="Product Preview">
    `;
    document.body.appendChild(modal);
    img = document.getElementById('previewImageSrc');
  }

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

// 1. Open supply modal and fetch products with appropriate filtering
async function openSupplyModal() {
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

// 2. Render products grid
function renderProductsGrid(prods) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (prods.length === 0) {
    grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 20px; color: var(--text-muted);">No products match your search or category filter.</p>';
    return;
  }

  prods.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const isInCart = cart.some(item => item.id === p.id);
    const name = p.name_en || p.name_ar;
    const imgUrl = p.image_url || 'https://via.placeholder.com/100';

    let btnDisabled = isOutOfStock || isInCart;
    let btnText = 'Add';
    let btnStyle = 'width: 100%; padding: 4px 2px; font-size: 0.72rem; border-radius: 4px; border: none; font-weight: bold; cursor: pointer;';

    if (isOutOfStock) {
      btnText = 'Out of Stock';
      btnStyle += ' background: #555; color: #ccc; cursor: not-allowed; opacity: 0.6;';
    } else if (isInCart) {
      btnText = 'Added ✔';
      btnStyle += ' background: #4A5568; color: #fff; cursor: not-allowed; opacity: 0.8;';
    } else {
      btnStyle += ' background: var(--primary-color, #2e7d32); color: #fff;';
    }
    
    grid.innerHTML += `
      <div class="product-card">
        <img 
          src="${imgUrl}" 
          alt="${name}" 
          title="Click to preview"
          onclick="previewImage('${imgUrl}', '${name}')"
          onerror="this.src='https://via.placeholder.com/100'"
        >
        <h6 style="margin: 4px 0 2px 0; color: var(--text-color); font-size: 0.75rem; line-height: 1.1; font-weight: 600; height: 26px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${name}">${name}</h6>
        <p style="font-size:0.65rem; color:var(--text-muted); margin: 1px 0;">${p.category || p.brand || ''}</p>
        <p style="font-size:0.7rem; margin: 2px 0 5px 0;">Available: <strong>${p.quantity}</strong></p>
        <button style="${btnStyle}" ${btnDisabled ? 'disabled' : ''} onclick="addToCart(${p.id})">
          ${btnText}
        </button>
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

function addToCart(prodId) {
  const prod = availableProducts.find(p => p.id === prodId);
  if (!prod) return;

  if (!cart.some(item => item.id === prodId)) {
    cart.push({ ...prod, reqQty: 1 });
  }
  
  updateCartBadge();
  filterProducts();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) badge.innerText = cart.length;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:15px; color:var(--text-muted);">Cart is empty</p>';
    return;
  }

  cart.forEach((item, index) => {
    const name = item.name_en || item.name_ar;
    const boxCap = item.items_per_box || 1;
    const imgUrl = item.image_url || 'https://via.placeholder.com/50';

    container.innerHTML += `
      <div style="border-bottom:1px solid var(--border-color); padding:10px 0; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <img 
          src="${imgUrl}" 
          alt="${name}" 
          style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color, #444); background: #222; flex-shrink: 0; cursor: pointer;"
          onclick="previewImage('${imgUrl}', '${name}')"
          onerror="this.src='https://via.placeholder.com/45'"
        >
        <div style="flex:1;">
          <strong style="font-size:0.9rem;">${name}</strong><br>
          <small style="color:var(--text-muted);">Available: ${item.quantity} | Box Capacity: ${boxCap} Pcs/Box</small>
        </div>
        <input 
          type="number" 
          min="1" 
          max="${item.quantity}" 
          value="${item.reqQty}" 
          oninput="changeCartQty(${index}, this.value)" 
          style="width: 75px; height: 38px; padding: 2px 5px; font-size: 16px; text-align: center; direction: ltr; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 6px; outline: none;"
        >
        <button class="btn btn-danger" style="padding: 6px 10px; height: 38px;" onclick="removeFromCart(${index})">✕</button>
      </div>
    `;
  });
}

function changeCartQty(index, val) { 
  let qty = parseInt(val);
  const max = cart[index].quantity;

  if (isNaN(qty) || qty < 1) {
    qty = 1;
  } else if (qty > max) {
    alert(`Sorry, available stock limit is ${max}!`);
    qty = max;
  }
  
  cart[index].reqQty = qty;
  renderCart();
}

function removeFromCart(index) { 
  cart.splice(index, 1); 
  updateCartBadge(); 
  filterProducts();
}

async function submitOrder() {
  if (cart.length === 0) return alert("Cart is empty!");

  for (let item of cart) {
    const prodName = item.name_en || item.name_ar;
    if (!item.reqQty || item.reqQty <= 0) {
      return alert(`Error: Quantity for product (${prodName}) cannot be zero or less!`);
    }
    if (item.reqQty > item.quantity) {
      return alert(`Error: Requested quantity for (${prodName}) exceeds available stock (${item.quantity})!`);
    }
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
      total_items: cart.length,
      notes: notes,
      status: 'New'
    }])
    .select()
    .single();

  if (error) return alert("Failed to create order: " + error.message);

  const orderItems = cart.map(c => ({
    order_id: newOrder.id,
    product_sku: c.sku,
    product_name: c.name_en || c.name_ar,
    image_url: c.image_url,
    quantity_pieces: c.reqQty,
    box_capacity: c.items_per_box
  }));

  await _supabase.from('order_items').insert(orderItems);
  await _supabase.from('order_logs').insert([{
    order_id: newOrder.id,
    status_change: 'Order Created (New)',
    action_by: empName
  }]);

  alert("Order submitted successfully! Order ID: " + orderNum);
  cart = [];
  updateCartBadge();
  closeModal('cartModal');
  closeModal('supplyModal');
  loadOrders();
}

// 3. Fetch orders and manage status permissions
async function loadOrders() {
  const filter = document.getElementById('statusFilter')?.value || 'ALL';
  let query = _supabase.from('orders').select('*').order('id', { ascending: false });
  
  if (filter !== 'ALL' && filter !== 'الكل') query = query.eq('status', filter);

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

async function updateOrderStatus(orderId, newStatus) {
  if (!isAdminOrManager()) {
    alert("Sorry, you do not have permission to change order status!");
    loadOrders();
    return;
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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
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

function exportOrders() {
  const ids = Array.from(document.querySelectorAll('.order-select:checked')).map(cb => parseInt(cb.value));
  const listToExport = ids.length > 0 ? ordersList.filter(o => ids.includes(o.id)) : ordersList;
  
  if(listToExport.length === 0) return alert("No orders to export");

  const ws = XLSX.utils.json_to_sheet(listToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "Supply_Orders_Export.xlsx");
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
