/* ==========================================================
   customers.js
   Customer list with order stats, add / edit / delete,
   and a detail view showing each customer's past orders.
   ========================================================== */

const custState = { all: [], search: '', editingId: null };

document.addEventListener('DOMContentLoaded', () => {
  renderShell('customers', 'Customers', 'Everyone who has ever ordered');
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-primary" onclick="openCustomerModal()">${icon('plus')} Add Customer</button>`;
  renderCustShell();
  loadCustomers();
});

function renderCustShell() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <div class="field" style="flex:1;min-width:220px;">
          <label>Search</label>
          <div class="search-box">${icon('search')}<input type="text" id="custSearch" placeholder="Search name or phone…"></div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total Amount</th><th>Payment</th><th>Last Order</th><th>Actions</th></tr>
          </thead>
          <tbody id="custBody">${loadingRow(8)}</tbody>
        </table>
      </div>
    </div>

    <div class="modal-backdrop" id="custModal">
      <div class="modal">
        <div class="modal-head"><h3 id="custModalTitle">Add Customer</h3><button class="modal-close-icon" onclick="closeModal('custModal')">${icon('close')}</button></div>
        <form id="custForm">
          <div class="modal-body">
            <div class="form-group"><label class="f-label">Name *</label><input type="text" id="cName"></div>
            <div class="form-row">
              <div class="form-group"><label class="f-label">Phone *</label><input type="tel" id="cPhone"></div>
              <div class="form-group"><label class="f-label">Email</label><input type="email" id="cEmail"></div>
            </div>
            <div class="form-group"><label class="f-label">Address</label><input type="text" id="cAddress"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" onclick="closeModal('custModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Customer</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" id="custDetailModal">
      <div class="modal modal-wide">
        <div class="modal-head"><h3>Customer History</h3><button class="modal-close-icon" onclick="closeModal('custDetailModal')">${icon('close')}</button></div>
        <div class="modal-body" id="custDetailBody"></div>
      </div>
    </div>
  `;
  document.getElementById('custSearch').oninput = debounce(e => { custState.search = e.target.value.trim().toLowerCase(); render(); }, 250);
  document.getElementById('custForm').onsubmit = saveCustomer;
}

async function loadCustomers() {
  document.getElementById('custBody').innerHTML = loadingRow(8);
  try {
    const { data, error } = await window.db
      .from('customers')
      .select('*, orders(id, total_amount, order_date, status, payment_status)')
      .order('name');
    if (error) throw error;
    custState.all = data || [];
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('custBody').innerHTML = `<tr><td colspan="8">${errorState('Unable to load customers. Please try again.')}</td></tr>`;
    toast('Failed to load customers', 'error');
  }
}

function render() {
  const rows = custState.all.filter(c => {
    if (!custState.search) return true;
    return (c.name || '').toLowerCase().includes(custState.search) || (c.phone || '').includes(custState.search);
  });
  const body = document.getElementById('custBody');
  if (!rows.length) { body.innerHTML = `<tr><td colspan="8">${emptyState('No customers found')}</td></tr>`; return; }

  body.innerHTML = rows.map(c => {
    const orders = c.orders || [];
    const totalSpent = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const fullyPaid = orders.length > 0 && orders.every(o => o.payment_status === 'Fully Paid');
    const lastOrder = orders.length ? orders.reduce((a, b) => (a.order_date > b.order_date ? a : b)) : null;
    return `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.phone || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>${orders.length}</td>
        <td>${money(totalSpent)}</td>
        <td>${fullyPaid ? '<span class="badge avail">Fully Paid</span>' : '<span class="badge unavail">Unpaid</span>'}</td>
        <td>${lastOrder ? formatDateDisplay(lastOrder.order_date) : '—'}</td>
        <td class="td-actions">
          <button class="btn btn-sm btn-icon" title="View history" onclick="viewCustomer('${c.id}')">${icon('eye')}</button>
          <button class="btn btn-sm btn-icon" title="Edit" onclick="openCustomerModal('${c.id}')">${icon('edit')}</button>
          <button class="btn btn-sm btn-icon" title="Delete" onclick="deleteCustomer('${c.id}')">${icon('trash')}</button>
        </td>
      </tr>`;
  }).join('');
}

function openCustomerModal(id) {
  custState.editingId = id || null;
  const c = id ? custState.all.find(x => x.id === id) : null;
  document.getElementById('custModalTitle').textContent = c ? 'Edit Customer' : 'Add Customer';
  document.getElementById('cName').value = c?.name || '';
  document.getElementById('cPhone').value = c?.phone || '';
  document.getElementById('cEmail').value = c?.email || '';
  document.getElementById('cAddress').value = c?.address || '';
  clearAllFieldErrors(document.getElementById('custForm'));
  openModal('custModal');
}

async function saveCustomer(e) {
  e.preventDefault();
  clearAllFieldErrors(e.target);
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  let hasError = false;
  if (!name) { showFieldError(document.getElementById('cName'), 'Please enter customer name.'); hasError = true; }
  if (!phone) { showFieldError(document.getElementById('cPhone'), 'Please enter phone number.'); hasError = true; }
  if (hasError) return;

  const payload = {
    name, phone,
    email: document.getElementById('cEmail').value.trim(),
    address: document.getElementById('cAddress').value.trim(),
  };
  try {
    if (custState.editingId) {
      const { error } = await window.db.from('customers').update(payload).eq('id', custState.editingId);
      if (error) throw error;
      toast('Customer updated', 'success');
    } else {
      const { error } = await window.db.from('customers').insert(payload);
      if (error) throw error;
      toast('Customer added', 'success');
    }
    closeModal('custModal');
    loadCustomers();
  } catch (err) {
    console.error(err);
    toast('Could not save customer', 'error');
  }
}

function viewCustomer(id) {
  const c = custState.all.find(x => x.id === id);
  if (!c) return;
  const orders = [...(c.orders || [])].sort((a, b) => b.order_date.localeCompare(a.order_date));
  document.getElementById('custDetailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Contact</h4>
        <div class="kv"><span class="k">Name</span><span class="v">${escapeHtml(c.name)}</span></div>
        <div class="kv"><span class="k">Phone</span><span class="v">${escapeHtml(c.phone || '—')}</span></div>
        <div class="kv"><span class="k">Email</span><span class="v">${escapeHtml(c.email || '—')}</span></div>
        <div class="kv"><span class="k">Address</span><span class="v">${escapeHtml(c.address || '—')}</span></div>
      </div>
      <div class="detail-block">
        <h4>Stats</h4>
        <div class="kv"><span class="k">Total Orders</span><span class="v">${orders.length}</span></div>
        <div class="kv"><span class="k">Total Spent</span><span class="v">${money(orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0))}</span></div>
      </div>
    </div>
    <h4 class="mt-16" style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--accent-dark);">Order History</h4>
    <div class="table-wrap mt-8">
      <table>
        <thead><tr><th>Order ID</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td class="order-id">ORD-${o.id.slice(0, 8).toUpperCase()}</td>
              <td>${formatDateDisplay(o.order_date)}</td>
              <td>${statusBadge(o.status)}</td>
              <td>${money(o.total_amount)}</td>
              <td><a class="btn btn-sm" href="order-details.html?id=${o.id}">View</a></td>
            </tr>`).join('') || `<tr><td colspan="5">${emptyState('No orders yet')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  openModal('custDetailModal');
}

async function deleteCustomer(id) {
  const ok = await confirmDialog('Delete this customer? Their past orders will remain but will no longer be linked to this profile.');
  if (!ok) return;
  try {
    const { error } = await window.db.from('customers').delete().eq('id', id);
    if (error) throw error;
    toast('Customer deleted', 'success');
    loadCustomers();
  } catch (err) {
    console.error(err);
    toast('Could not delete customer', 'error');
  }
}
