/* ==========================================================
   orders.js
   Full order list: search by ID/name/phone, filter by
   date/status/time, sort, actions (view/edit/delete/print/pdf).
   ========================================================== */

const ordersState = {
  all: [],
  search: '',
  status: 'All',
  date: 'All',       // All | today | tomorrow | week | custom
  customDate: todayISO(),
  time: 'All',
  sort: 'newest',     // newest | oldest | highest | lowest
};

document.addEventListener('DOMContentLoaded', () => {
  renderShell('orders', 'Orders', 'All catering orders');
  document.getElementById('topbarActions').innerHTML =
    `<a class="btn btn-primary" href="order-details.html?new=1">${icon('plus')} New Order</a>`;
  renderOrdersShell();
  loadOrders();
});

function renderOrdersShell() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <div class="field" style="flex:1;min-width:220px;">
          <label>Search</label>
          <div class="search-box">
            ${icon('search')}
            <input type="text" id="searchInput" placeholder="Order ID, customer name or phone…">
          </div>
        </div>
        <div class="field">
          <label>Status</label>
          <select id="statusFilter">
            <option value="All">All statuses</option>
            ${STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Date</label>
          <select id="dateFilter">
            <option value="All">All dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>
        <div class="field" id="customDateField" style="display:none;">
          <label>Choose Date</label>
          <input type="date" id="customDateInput" value="${todayISO()}">
        </div>
        <div class="field">
          <label>Order Time</label>
          <select id="timeFilter"><option value="All">All times</option></select>
        </div>
        <div class="field">
          <label>Sort By</label>
          <select id="sortSelect">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Phone</th><th>Date</th><th>Time</th>
              <th>Guests</th><th>Total</th><th>Paid</th><th>Balance</th><th>Payment</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="ordersBody">${loadingRow(12)}</tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('searchInput').oninput = debounce(e => { ordersState.search = e.target.value.trim().toLowerCase(); render(); }, 250);
  document.getElementById('statusFilter').onchange = e => { ordersState.status = e.target.value; render(); };
  document.getElementById('dateFilter').onchange = e => {
    ordersState.date = e.target.value;
    document.getElementById('customDateField').style.display = ordersState.date === 'custom' ? 'flex' : 'none';
    render();
  };
  document.getElementById('customDateInput').onchange = e => { ordersState.customDate = e.target.value; render(); };
  document.getElementById('timeFilter').onchange = e => { ordersState.time = e.target.value; render(); };
  document.getElementById('sortSelect').onchange = e => { ordersState.sort = e.target.value; render(); };
}

async function loadOrders() {
  document.getElementById('ordersBody').innerHTML = loadingRow(12);
  try {
    const { data, error } = await window.db
      .from('orders')
      .select('*, customers(name, phone), payments(amount, discount)')
      .order('order_date', { ascending: false });
    if (error) throw error;
    ordersState.all = data || [];
    const times = [...new Set(ordersState.all.map(o => o.order_time))].sort();
    document.getElementById('timeFilter').innerHTML = `<option value="All">All times</option>` +
      times.map(t => `<option value="${t}">${formatTime12(t)}</option>`).join('');
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('ordersBody').innerHTML =
      `<tr><td colspan="12">${errorState('Unable to load orders. Please try again.')}</td></tr>`;
    toast('Failed to load orders', 'error');
  }
}

function matchesDate(order) {
  if (ordersState.date === 'All') return true;
  if (ordersState.date === 'today') return order.order_date === todayISO();
  if (ordersState.date === 'tomorrow') return order.order_date === addDaysISO(todayISO(), 1);
  if (ordersState.date === 'week') {
    const start = startOfWeekISO(), end = addDaysISO(start, 6);
    return order.order_date >= start && order.order_date <= end;
  }
  if (ordersState.date === 'custom') return order.order_date === ordersState.customDate;
  return true;
}

function render() {
  let rows = ordersState.all.filter(o => {
    if (ordersState.status !== 'All' && o.status !== ordersState.status) return false;
    if (ordersState.time !== 'All' && o.order_time !== ordersState.time) return false;
    if (!matchesDate(o)) return false;
    if (ordersState.search) {
      const hay = `${shortId(o.id)} ${o.customers?.name || ''} ${o.customers?.phone || ''}`.toLowerCase();
      if (!hay.includes(ordersState.search)) return false;
    }
    return true;
  });

  rows.sort((a, b) => {
    if (ordersState.sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (ordersState.sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (ordersState.sort === 'highest') return b.total_amount - a.total_amount;
    if (ordersState.sort === 'lowest') return a.total_amount - b.total_amount;
    return 0;
  });

  const body = document.getElementById('ordersBody');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="12">${emptyState('No orders found', 'Try adjusting your search or filters.')}</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(o => `
    <tr>
      <td class="order-id">${shortId(o.id)}</td>
      <td>${escapeHtml(o.customers?.name || '—')}</td>
      <td>${escapeHtml(o.customers?.phone || '—')}</td>
      <td>${formatDateDisplay(o.order_date)}</td>
      <td>${formatTime12(o.order_time)}</td>
      <td>${o.guest_count}</td>
      <td><strong>${money(o.total_amount)}</strong></td>
      <td>${money((o.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0))}</td>
      <td>${money(Math.max((Number(o.total_amount)||0)-(o.payments||[]).reduce((s,p)=>s+Number(p.amount||0)+Number(p.discount||0),0),0))}</td>
      <td>${(()=>{const paid=(o.payments||[]).reduce((s,p)=>s+Number(p.amount||0)+Number(p.discount||0),0);const bal=Math.max((Number(o.total_amount)||0)-paid,0);return bal<=0&&Number(o.total_amount)>0?'<span class="badge avail">Fully Paid</span>':paid>0?'<span class="badge" style="background:#fff4d6;color:#8a5a00;">Partially Paid</span>':'<span class="badge unavail">Unpaid</span>';})()}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="td-actions">
        <a class="btn btn-sm btn-icon" title="View" href="order-details.html?id=${o.id}">${icon('eye')}</a>
        <a class="btn btn-sm btn-icon" title="Edit" href="order-details.html?id=${o.id}&edit=1">${icon('edit')}</a>
        <a class="btn btn-sm btn-icon" title="Print Bill" href="order-details.html?id=${o.id}&print=1">${icon('print')}</a>
        <button class="btn btn-sm btn-icon" title="Delete" onclick="ordersDelete('${o.id}')">${icon('trash')}</button>
      </td>
    </tr>
  `).join('');
}

function shortId(id) { return 'ORD-' + id.slice(0, 8).toUpperCase(); }

async function ordersDelete(id) {
  const ok = await confirmDialog('Are you sure you want to delete this order?');
  if (!ok) return;
  try {
    const { error } = await window.db.from('orders').delete().eq('id', id);
    if (error) throw error;
    toast('Order deleted', 'success');
    loadOrders();
  } catch (err) {
    console.error(err);
    toast('Could not delete order', 'error');
  }
}
