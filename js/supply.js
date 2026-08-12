let availableProducts = [];
let cart = [];
let ordersList = [];

// جلب اسم الموظف الفعلي بدلاً من المسمى الوظيفي
function getEmployeeName() {
  if (typeof currentUser !== 'undefined' && currentUser) {
    return currentUser.name || currentUser.full_name || currentUser.user_name || currentUser.email || 'Admin';
  }
  return 'Admin';
}

// 1. فتح نافذة الطلب وجلب المنتجات المتاحة
async function openSupplyModal() {
  const { data, error } = await _supabase
    .from('products')
    .select('*')
    .eq('is_disabled', false);

  if (error) {
    alert("خطأ في جلب المنتجات: " + error.message);
    return;
  }

  const userBrand = currentUser.brand_permission || currentUser.brand || '';

  availableProducts = (data || []).filter(p => {
    if (
      userBrand.includes('&') || 
      userBrand.includes('Rudy Pizzeria & B-Marlin') || 
      !userBrand
    ) {
      return true;
    }
    return p.brand && p.brand.trim().toLowerCase() === userBrand.trim().toLowerCase();
  });

  renderProductsGrid(availableProducts);
  openModal('supplyModal');
}

// 2. عرض شبكة المنتجات مع تعطيل الزر للمنتجات المضافة للسلة
function renderProductsGrid(prods) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (prods.length === 0) {
    grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 20px; color: var(--text-muted);">لا توجد منتجات متاحة لهذا البراند حالياً.</p>';
    return;
  }

  prods.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const isInCart = cart.some(item => item.id === p.id);
    const name = currentLang === 'ar' ? p.name_ar : p.name_en;

    // تحديد حالة الزر والشكل
    let btnDisabled = isOutOfStock || isInCart;
    let btnText = 'إضافة للسلة';
    let btnStyle = '';

    if (isOutOfStock) {
      btnText = 'مخلص';
      btnStyle = 'background: #555; cursor: not-allowed; opacity: 0.6;';
    } else if (isInCart) {
      btnText = 'تمت الإضافة ✔';
      btnStyle = 'background: #4A5568; cursor: not-allowed; opacity: 0.7;';
    }
    
    grid.innerHTML += `
      <div class="product-card">
        <img src="${p.image_url || 'https://via.placeholder.com/100'}" alt="${name}" onerror="this.src='https://via.placeholder.com/100'">
        <h5 style="margin: 8px 0; color: var(--text-color);">${name}</h5>
        <p style="font-size:0.8rem; color:var(--text-muted);">البراند: ${p.brand}</p>
        <p style="font-size:0.85rem; margin: 4px 0;">المتوفر: <strong>${p.quantity}</strong> حبة</p>
        <button class="btn" style="${btnStyle}" ${btnDisabled ? 'disabled' : ''} onclick="addToCart(${p.id})">
          ${btnText}
        </button>
      </div>
    `;
  });
}

// 3. محرك البحث الفوري عن المنتجات
function filterProducts() {
  const query = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  const filtered = availableProducts.filter(p => {
    const nameAr = (p.name_ar || '').toLowerCase();
    const nameEn = (p.name_en || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    return nameAr.includes(query) || nameEn.includes(query) || sku.includes(query);
  });
  renderProductsGrid(filtered);
}

// 4. إضافة منتج للسلة وتحديث الزر
function addToCart(prodId) {
  const prod = availableProducts.find(p => p.id === prodId);
  if (!prod) return;

  const inCart = cart.find(item => item.id === prodId);

  if (!inCart) {
    cart.push({ ...prod, reqQty: 1 });
  }
  
  updateCartBadge();
  renderProductsGrid(availableProducts); // إعادة رسم القائمة ليتغير لون الزر لرمادي
}

// 5. تحديث عداد السلة والشكل
function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) badge.innerText = cart.length;
  renderCart();
}

// 6. عرض قائمة السلة مع التحكم الصارم بالكميات
function renderCart() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:15px; color:var(--text-muted);">السلة فارغة</p>';
    return;
  }

  cart.forEach((item, index) => {
    const name = currentLang === 'ar' ? item.name_ar : item.name_en;
    container.innerHTML += `
      <div style="border-bottom:1px solid var(--border-color); padding:10px 0; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="flex:1;">
          <strong>${name}</strong><br>
          <small style="color:var(--text-muted);">الكرتون به: ${item.items_per_box} حبة | المتوفر: ${item.quantity}</small>
        </div>
        <input type="number" min="1" max="${item.quantity}" value="${item.reqQty}" oninput="changeCartQty(${index}, this.value)" style="width:70px; padding:5px; background:var(--input-bg); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;">
        <button class="btn btn-danger" style="padding:4px 8px;" onclick="removeFromCart(${index})">✕</button>
      </div>
    `;
  });
}

function changeCartQty(index, val) { 
  let qty = parseInt(val);
  const max = cart[index].quantity;

  if (isNaN(qty) || qty < 1) {
    qty = 1; // حماية من الصفر والأعداد السالبة
  } else if (qty > max) {
    alert(`عذراً، الكمية المتاحة في المخزون هي ${max} فقط!`);
    qty = max; // منع تجاوز المتاح
  }
  
  cart[index].reqQty = qty;
  renderCart();
}

function removeFromCart(index) { 
  cart.splice(index, 1); 
  updateCartBadge(); 
  renderProductsGrid(availableProducts); // إعادة تفعيل زر الإضافة للمنتج المنسحب
}

// 7. إرسال الطلب النهائي مع الفحص الشامل للكميات
async function submitOrder() {
  if (cart.length === 0) return alert("السلة فارغة!");

  // فحص نهائي للكميات قبل الترحيل
  for (let item of cart) {
    const prodName = currentLang === 'ar' ? item.name_ar : item.name_en;
    if (!item.reqQty || item.reqQty <= 0) {
      return alert(`خطأ: كمية المنتج (${prodName}) لا يمكن أن تكون صفر أو أقل!`);
    }
    if (item.reqQty > item.quantity) {
      return alert(`خطأ: الكمية المطلوبة للمنتج (${prodName}) أحدث من المتوفر في المخزون (${item.quantity})!`);
    }
  }

  const orderNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const notes = document.getElementById('orderNotes')?.value || '';
  const empName = getEmployeeName();

  const { data: newOrder, error } = await _supabase
    .from('orders')
    .insert([{
      order_number: orderNum,
      user_name: empName,
      user_email: currentUser.email,
      brand: currentUser.brand_permission || currentUser.brand,
      total_items: cart.length,
      notes: notes,
      status: 'جديد'
    }])
    .select()
    .single();

  if (error) return alert("فشل إنشاء الطلب: " + error.message);

  const orderItems = cart.map(c => ({
    order_id: newOrder.id,
    product_sku: c.sku,
    product_name: currentLang === 'ar' ? c.name_ar : c.name_en,
    image_url: c.image_url,
    quantity_pieces: c.reqQty,
    box_capacity: c.items_per_box
  }));

  await _supabase.from('order_items').insert(orderItems);
  await _supabase.from('order_logs').insert([{
    order_id: newOrder.id,
    status_change: 'إنشاء الطلب (جديد)',
    action_by: empName
  }]);

  alert("تم إرسال الطلب بنجاح! رقم الطلب: " + orderNum);
  cart = [];
  updateCartBadge();
  closeModal('cartModal');
  closeModal('supplyModal');
  loadOrders();
}

// 8. تحميل الطلبات وعرضها في الجدول
async function loadOrders() {
  const filter = document.getElementById('statusFilter')?.value || 'الكل';
  let query = _supabase.from('orders').select('*').order('id', { ascending: false });
  
  if (filter !== 'الكل') query = query.eq('status', filter);

  const { data, error } = await query;
  if (error) return alert("خطأ في جلب الطلبات: " + error.message);

  ordersList = data || [];
  const tbody = document.getElementById('ordersBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (ordersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; color:var(--text-muted);">لا توجد طلبات تغذية حتى الآن.</td></tr>';
    return;
  }

  ordersList.forEach(o => {
    tbody.innerHTML += `
      <tr>
        <td><input type="checkbox" class="order-select" value="${o.id}"></td>
        <td><a href="#" style="color:var(--primary-color); font-weight:bold;" onclick="viewOrderDetails(${o.id}); return false;">${o.order_number}</a></td>
        <td>${o.user_name}</td>
        <td>${o.brand}</td>
        <td>${o.total_items}</td>
        <td>
          <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:4px; background:var(--input-bg); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;">
            <option value="جديد" ${o.status==='جديد'?'selected':''}>جديد</option>
            <option value="جاري التجهيز" ${o.status==='جاري التجهيز'?'selected':''}>جاري التجهيز</option>
            <option value="جاهز" ${o.status==='جاهز'?'selected':''}>جاهز</option>
            <option value="مكتمل" ${o.status==='مكتمل'?'selected':''}>مكتمل</option>
            <option value="ملغي" ${o.status==='ملغي'?'selected':''}>ملغي</option>
          </select>
        </td>
        <td>${o.notes || '-'}</td>
        <td><button class="btn" style="padding:4px 8px;" onclick="viewOrderDetails(${o.id})">تفاصيل</button></td>
      </tr>
    `;
  });
}

// 9. تغيير حالة الطلب وتحديث السجل الزمني
async function updateOrderStatus(orderId, newStatus) {
  const empName = getEmployeeName();
  await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  await _supabase.from('order_logs').insert([{
    order_id: orderId,
    status_change: `تغيير الحالة إلى (${newStatus})`,
    action_by: empName
  }]);
  loadOrders();
}

// 10. عرض تفاصيل الطلب وسجل الأحداث بالتاريخ الميلادي الإنجليزي واسم الموظف
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
              الكمية: <span style="color:var(--primary-color, #4CAF50); font-weight:bold;">${i.quantity_pieces}</span> حبة 
              <span style="opacity: 0.8;">(${boxes} كرتون)</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h6 style="margin-bottom: 10px; color: var(--primary-color, #4CAF50); font-size: 0.9rem;">📦 منتجات الطلب:</h6>
        ${itemsHtml || '<p style="color:var(--text-muted);">لا توجد عناصر</p>'}
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
          <span style="color: var(--text-muted, #aaa);"> بواسطة: </span>
          <span style="color: #64B5F6;">${l.action_by}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted, #888); margin-top: 2px;">🕒 ${formattedDate}</div>
        </li>
      `;
    }).join('');

    timeline.innerHTML = `
      <hr style="border: 0; border-top: 1px solid var(--border-color, #444); margin: 20px 0 15px 0;">
      <h6 style="margin-bottom: 10px; color: #FFB74D; font-size: 0.9rem;">📜 سجل الإجراءات (Audit Log):</h6>
      <ul style="padding-right: 20px; margin: 0;">
        ${logsHtml || '<li style="color:var(--text-muted);">لا يوجد سجل إجراءات</li>'}
      </ul>
    `;
  }

  openModal('orderDetailsModal');
}

// 11. تصدير الطلبات
function exportOrders() {
  const ids = Array.from(document.querySelectorAll('.order-select:checked')).map(cb => parseInt(cb.value));
  const listToExport = ids.length > 0 ? ordersList.filter(o => ids.includes(o.id)) : ordersList;
  
  if(listToExport.length === 0) return alert("لا توجد طلبات لتصديرها");

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
