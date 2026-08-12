let availableProducts = [];
let cart = [];
let ordersList = [];

async function openSupplyModal() {
  const { data, error } = await _supabase.from('products').select('*').eq('is_disabled', false);
  if (error) return alert("خطأ: " + error.message);

  // تصفية حسب صلاحية براند اليوزر الحالي
  availableProducts = data.filter(p => {
    if (currentUser.brand === 'Rudy Pizzeria & B-Marlin') return true;
    return p.brand === currentUser.brand;
  });

  renderProductsGrid(availableProducts);
  openModal('supplyModal');
}

function renderProductsGrid(prods) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  prods.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const name = currentLang === 'ar' ? p.name_ar : p.name_en;
    grid.innerHTML += `
      <div class="product-card">
        <img src="${p.image_url || 'https://via.placeholder.com/100'}">
        <h5>${name}</h5>
        <p>البراند: ${p.brand}</p>
        <p>المتوفر: ${p.quantity} حبة</p>
        <button class="btn" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart(${p.id})">
          ${isOutOfStock ? 'مخلص' : 'إضافة للسلة'}
        </button>
      </div>
    `;
  });
}

function addToCart(prodId) {
  const prod = availableProducts.find(p => p.id === prodId);
  const inCart = cart.find(item => item.id === prodId);

  if (inCart) {
    if (inCart.reqQty < prod.quantity) inCart.reqQty++;
  } else {
    cart.push({ ...prod, reqQty: 1 });
  }
  updateCartBadge();
}

function updateCartBadge() {
  document.getElementById('cartCount').innerText = cart.length;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItemsList');
  container.innerHTML = '';

  cart.forEach((item, index) => {
    const name = currentLang === 'ar' ? item.name_ar : item.name_en;
    container.innerHTML += `
      <div style="border-bottom:1px solid #ccc; padding:10px 0; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${name}</strong><br>
          <small>الكرتون به: ${item.items_per_box} حبة | المتوفر: ${item.quantity}</small>
        </div>
        <input type="number" min="1" max="${item.quantity}" value="${item.reqQty}" onchange="changeCartQty(${index}, this.value)" style="width:60px;">
        <button class="btn btn-danger" onclick="removeFromCart(${index})">X</button>
      </div>
    `;
  });
}

function changeCartQty(index, val) { cart[index].reqQty = parseInt(val) || 1; }
function removeFromCart(index) { cart.splice(index, 1); updateCartBadge(); }

async function submitOrder() {
  if (cart.length === 0) return alert("السلة فارغة!");

  const orderNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const notes = document.getElementById('orderNotes').value;

  const { data: newOrder, error } = await _supabase.from('orders').insert([{
    order_number: orderNum,
    user_name: currentUser.name,
    user_email: currentUser.email,
    brand: currentUser.brand,
    total_items: cart.length,
    notes: notes,
    status: 'جديد'
  }]).select().single();

  if (error) return alert("فشل إنشاء الطلب: " + error.message);

  // إدخال عناصر الطلب وسجل التعديلات
  const orderItems = cart.map(c => ({
    order_id: newOrder.id,
    product_sku: c.sku,
    product_name: c.name_ar,
    image_url: c.image_url,
    quantity_pieces: c.reqQty,
    box_capacity: c.items_per_box
  }));

  await _supabase.from('order_items').insert(orderItems);
  await _supabase.from('order_logs').insert([{
    order_id: newOrder.id,
    status_change: 'إنشاء الطلب (جديد)',
    action_by: currentUser.name
  }]);

  alert("تم إرسال الطلب بنجاح! رقم الطلب: " + orderNum);
  cart = [];
  updateCartBadge();
  closeModal('cartModal');
  closeModal('supplyModal');
  loadOrders();
}

async function loadOrders() {
  const filter = document.getElementById('statusFilter').value;
  let query = _supabase.from('orders').select('*');
  if (filter !== 'الكل') query = query.eq('status', filter);

  const { data, error } = await query;
  if (error) return alert("خطأ جلب الطلبات: " + error.message);

  ordersList = data || [];
  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '';

  ordersList.forEach(o => {
    tbody.innerHTML += `
      <tr>
        <td><input type="checkbox" class="order-select" value="${o.id}"></td>
        <td><a href="#" onclick="viewOrderDetails(${o.id})">${o.order_number}</a></td>
        <td>${o.user_name}</td>
        <td>${o.brand}</td>
        <td>${o.total_items}</td>
        <td>
          <select onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="جديد" ${o.status==='جديد'?'selected':''}>جديد</option>
            <option value="جاري التجهيز" ${o.status==='جاري التجهيز'?'selected':''}>جاري التجهيز</option>
            <option value="جاهز" ${o.status==='جاهز'?'selected':''}>جاهز</option>
            <option value="مكتمل" ${o.status==='مكتمل'?'selected':''}>مكتمل</option>
            <option value="ملغي" ${o.status==='ملغي'?'selected':''}>ملغي</option>
          </select>
        </td>
        <td>${o.notes || '-'}</td>
        <td><button class="btn" onclick="viewOrderDetails(${o.id})">تفاصيل</button></td>
      </tr>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  await _supabase.from('order_logs').insert([{
    order_id: orderId,
    status_change: `تغيير الحالة إلى (${newStatus})`,
    action_by: currentUser.name
  }]);
  loadOrders();
}

async function viewOrderDetails(orderId) {
  const { data: items } = await _supabase.from('order_items').select('*').eq('order_id', orderId);
  const { data: logs } = await _supabase.from('order_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: true });

  const content = document.getElementById('orderDetailsContent');
  content.innerHTML = items.map(i => `
    <p>• ${i.product_name} - الكمية المطلوب: ${i.quantity_pieces} حبة (${(i.quantity_pieces / i.box_capacity).toFixed(1)} كرتون)</p>
  `).join('');

  const timeline = document.getElementById('orderTimeline');
  timeline.innerHTML = logs.map(l => `
    <li><strong>${l.status_change}</strong> بواسطة: ${l.action_by} - <small>${new Date(l.created_at).toLocaleString()}</small></li>
  `).join('');

  openModal('orderDetailsModal');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', loadOrders);
