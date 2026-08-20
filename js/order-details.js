/* ============================================================
   ORDER DETAILS / NEW ORDER
   Category -> Group -> Item food picker
   No food-item price and no quantity input.
   Quantity is saved as 1 for each selected item.
   Discount is handled only at payment time.
   ============================================================ */

/* Order details / create / edit / payment management - v2 */
const S = {
  mode:'create', id:null, order:null, customer:null, items:[], customers:[], foodItems:[], foodCategories:[], foodGroups:[],
  payments:[], originalItemIds:[]
};

document.addEventListener('DOMContentLoaded', async () => {
  S.id=qs('id'); S.mode=S.id?(qs('edit')==='1'?'edit':'view'):'create';
  renderShell(S.id?'orders':'new-order',
    S.mode==='create'?'New Order':(S.mode==='edit'?'Edit Order':'Order Details'),
    S.mode==='create'?'Create a new catering order':(S.id?shortId(S.id):''));
  document.getElementById('pageContent').innerHTML='<div class="loading-row"><span class="spinner"></span>Loading…</div>';
  await Promise.all([loadFoodItemsList(),loadCustomersList()]);
  if(S.id){await loadOrder(); if(!S.order)return;}
  S.mode==='view'?renderViewMode():renderFormMode();
  if(S.mode==='view' && qs('print')==='1') setTimeout(printBill,400);
});

function shortId(id){return 'ORD-'+id.slice(0,8).toUpperCase();}
async function loadFoodItemsList(){
  const [catRes, groupRes, itemRes] = await Promise.all([
    window.db.from('food_categories').select('*').order('display_order', {ascending:true}),
    window.db.from('food_groups').select('*').order('display_order', {ascending:true}),
    window.db.from('food_items').select('*').order('name')
  ]);
  if(catRes.error) throw catRes.error;
  if(groupRes.error) throw groupRes.error;
  if(itemRes.error) throw itemRes.error;
  S.foodCategories=catRes.data||[];
  S.foodGroups=groupRes.data||[];
  S.foodItems=itemRes.data||[];
}
async function loadCustomersList(){const {data,error}=await window.db.from('customers').select('*').order('name');if(!error)S.customers=data||[];}
async function loadOrder(){
  try{
    const {data,error}=await window.db.from('orders').select('*, customers(*), order_items(*), payments(*)').eq('id',S.id).single();
    if(error)throw error;
    S.order=data;S.customer=data.customers;S.items=data.order_items||[];S.payments=(data.payments||[]).sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date)));
    S.originalItemIds=S.items.map(i=>i.id);
  }catch(e){console.error(e);document.getElementById('pageContent').innerHTML=errorState('Order not found or failed to load.');toast('Could not load order','error');}
}
function paymentSummary(){
  const total=Number(S.order?.total_amount)||0;
  const paid=S.payments.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const disc=S.payments.reduce((s,p)=>s+(Number(p.discount)||0),0);
  return {total,paid,disc,balance:Math.max(total-paid-disc,0),effective:paid+disc};
}
function paymentStatusBadge(){
  const x=paymentSummary();
  if(x.balance<=0 && x.total>0)return '<span class="badge avail">Fully Paid</span>';
  if(x.effective>0)return '<span class="badge" style="background:#fff4d6;color:#8a5a00;">Partially Paid</span>';
  return '<span class="badge unavail">Unpaid</span>';
}

/* ---------------- VIEW ---------------- */
function renderViewMode(){
  const o=S.order,c=S.customer||{}, ps=paymentSummary();
  const done=S.items.filter(i=>i.is_completed).length,pct=S.items.length?Math.round(done/S.items.length*100):0;
  document.getElementById('topbarActions').innerHTML=`
    <select id="statusChange" class="btn-sm" style="width:auto;">${STATUS_LIST.map(x=>`<option value="${x}" ${x===o.status?'selected':''}>${x}</option>`).join('')}</select>
    <a class="btn" href="order-details.html?id=${o.id}&edit=1">${icon('edit')} Edit</a>
    <button class="btn btn-primary" onclick="openPaymentModal()">${icon('plus')} Add Payment</button>
    <button class="btn" onclick="printBill()">${icon('print')} Print Bill</button>
    <button class="btn" onclick="generatePDF()">${icon('pdf')} Payment Bill PDF</button>
    <button class="btn btn-danger" onclick="deleteOrderNow()">${icon('trash')} Delete</button>`;
  document.getElementById('statusChange').onchange=changeStatus;
  document.getElementById('pageContent').innerHTML=`
    <div class="detail-grid">
      <div class="detail-block"><h4>Order Information</h4>
        <div class="kv"><span class="k">Order ID</span><span class="v order-id">${shortId(o.id)}</span></div>
        <div class="kv"><span class="k">Order Date</span><span class="v">${formatDateDisplay(o.order_date)}</span></div>
        <div class="kv"><span class="k">Order Time</span><span class="v">${formatTime12(o.order_time)}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v">${statusBadge(o.status)}</span></div>
        <div class="kv"><span class="k">Payment</span><span class="v">${paymentStatusBadge()}</span></div>
        <div class="kv"><span class="k">Event</span><span class="v">${escapeHtml(o.event_name||'—')}</span></div>
        <div class="kv"><span class="k">Location</span><span class="v">${escapeHtml(o.event_location||'—')}</span></div>
      </div>
      <div class="detail-block"><h4>Customer Information</h4>
        <div class="kv"><span class="k">Name</span><span class="v">${escapeHtml(c.name||o.customer_name||'—')}</span></div>
        <div class="kv"><span class="k">Phone</span><span class="v">${escapeHtml(c.phone||'—')}</span></div>
        <div class="kv"><span class="k">Email</span><span class="v">${escapeHtml(c.email||'—')}</span></div>
        <div class="kv"><span class="k">Address</span><span class="v">${escapeHtml(c.address||'—')}</span></div>
      </div>
    </div>

    <div class="card mt-16"><div class="card-head"><h3>Order Amount</h3></div><div class="card-body">
      <div class="detail-grid">
        <div><div class="kv"><span class="k">Guests</span><span class="v">${o.guest_count}</span></div>
          <div class="kv"><span class="k">Per Plate</span><span class="v">${money(o.per_plate_amount)}</span></div>
          <div class="kv"><span class="k">Food Items</span><span class="v">${S.items.length} types</span></div></div>
        <div><div class="kv"><span class="k">Guests × Per Plate</span><span class="v">${money(o.subtotal)}</span></div>
          <div class="kv"><span class="k">Additional Charge</span><span class="v">+ ${money(o.additional_charge)}</span></div>
          <div class="kv"><span class="k"><strong>Order Total</strong></span><span class="v"><strong>${money(ps.total)}</strong></span></div></div>
      </div>
      <div class="summary-box mt-16">
        <div class="summary-line"><span>Total Amount</span><strong>${money(ps.total)}</strong></div>
        <div class="summary-line"><span>Total Paid</span><strong>${money(ps.paid)}</strong></div>
        <div class="summary-line"><span>Payment Discounts</span><strong>− ${money(ps.disc)}</strong></div>
        <div class="summary-line total"><span>Balance</span><strong>${money(ps.balance)}</strong></div>
      </div>
    </div></div>

    <div class="card mt-16"><div class="card-head"><h3>Food Items</h3></div><div class="card-body">
      <div class="saved-food-chips">
        ${S.items.map(i=>`<div class="saved-food-chip">${escapeHtml(i.item_name)}</div>`).join('') || emptyState('No food items')}
      </div>
    </div></div>

    <div class="detail-grid mt-16">
      <div class="card"><div class="card-head"><h3>Preparation Checklist</h3></div><div class="card-body">
        <div class="flex justify-between items-center"><span class="text-soft">${done} / ${S.items.length} Items Completed</span><strong>${pct}%</strong></div>
        <div class="progress-bar"><div class="fill" style="width:${pct}%;"></div></div>
        <div class="mt-16">${S.items.map(i=>`<div class="checklist-item ${i.is_completed?'done':''}" id="cl-${i.id}">
          <input type="checkbox" ${i.is_completed?'checked':''} onchange="toggleChecklist('${i.id}',this.checked)">
          <span class="cl-name">${escapeHtml(i.item_name)}</span></div>`).join('')}</div>
      </div></div>
      <div class="card"><div class="card-head"><h3>Payments</h3></div><div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Paid</th><th>Discount</th><th>Effective</th><th>Actions</th></tr></thead><tbody>
        ${S.payments.map(p=>`<tr><td>${formatDateDisplay(p.payment_date)}</td><td>${money(p.amount)}</td><td>${money(p.discount)}</td><td><strong>${money(Number(p.amount)+Number(p.discount))}</strong></td>
          <td><button class="btn btn-sm btn-icon" title="Edit payment" onclick="openPaymentModal('${p.id}')">${icon('edit')}</button>
          <button class="btn btn-sm btn-icon" title="Delete payment" onclick="deletePayment('${p.id}')">${icon('trash')}</button></td></tr>`).join('')||`<tr><td colspan="5">${emptyState('No payments recorded')}</td></tr>`}
        </tbody></table></div></div>
    </div>
    ${o.notes?`<div class="card mt-16"><div class="card-body"><strong>Notes:</strong> ${escapeHtml(o.notes)}</div></div>`:''}

    <div class="modal-backdrop" id="paymentModal"><div class="modal" style="max-width:520px;">
      <div class="modal-head"><h3 id="paymentModalTitle">Add Payment</h3><button class="modal-close-icon" onclick="closeModal('paymentModal')">${icon('close')}</button></div>
      <form id="paymentForm"><div class="modal-body">
        <div class="summary-box mb-16"><div class="summary-line"><span>Order Total</span><strong>${money(ps.total)}</strong></div><div class="summary-line"><span>Current Balance</span><strong>${money(ps.balance)}</strong></div></div>
        <div class="form-row"><div class="form-group"><label class="f-label">Payment Date *</label><input type="date" id="payDate" value="${todayISO()}"></div>
        <div class="form-group"><label class="f-label">Paid Amount (₹) *</label><input type="number" id="payAmount" min="0" step="0.01" value=""></div></div>
        <div class="form-group"><label class="f-label">Discount at Payment Time (₹)</label><input type="number" id="payDiscount" min="0" step="0.01" value="0"><div class="hint">Discount is allowed only here, at payment time.</div></div>
        <div class="form-group"><label class="f-label">Notes</label><textarea id="payNotes" rows="2" placeholder="Optional payment note"></textarea></div>
      </div><div class="modal-foot"><button type="button" class="btn" onclick="closeModal('paymentModal')">Cancel</button><button class="btn btn-primary" type="submit">Save Payment</button></div></form>
    </div></div>
  `;
  document.getElementById('paymentForm').onsubmit=savePayment;
}
function openPaymentModal(paymentId){
  const p=paymentId?S.payments.find(x=>x.id===paymentId):null;
  const modal=document.getElementById('paymentModal');if(!modal)return;
  document.getElementById('paymentModalTitle').textContent=p?'Edit Payment':'Add Payment';
  document.getElementById('payDate').value=p?.payment_date||todayISO();
  document.getElementById('payAmount').value=p?.amount??'';
  document.getElementById('payDiscount').value=p?.discount??0;
  document.getElementById('payNotes').value=p?.notes||'';
  modal.dataset.paymentId=p?.id||'';
  openModal('paymentModal');
}
async function savePayment(e){
  e.preventDefault();
  const date=document.getElementById('payDate').value, amount=Number(document.getElementById('payAmount').value)||0, discount=Number(document.getElementById('payDiscount').value)||0, notes=document.getElementById('payNotes').value.trim();
  const id=document.getElementById('paymentModal').dataset.paymentId||null;
  const existing=id?S.payments.find(p=>p.id===id):null;
  const otherPaid=S.payments.filter(p=>p.id!==id).reduce((s,p)=>s+Number(p.amount||0)+Number(p.discount||0),0);
  const total=Number(S.order.total_amount)||0;
  if(!date||amount<0||discount<0){toast('Enter valid payment details','error');return;}
  if(amount+discount+otherPaid>total){toast('Paid amount + discount cannot exceed the remaining balance.','error');return;}
  try{
    const payload={order_id:S.id,payment_date:date,amount,discount,notes};
    const q=id?window.db.from('payments').update(payload).eq('id',id):window.db.from('payments').insert(payload);
    const {error}=await q;if(error)throw error;
    toast(id?'Payment updated':'Payment recorded','success');closeModal('paymentModal');await loadOrder();renderViewMode();
  }catch(err){console.error(err);toast('Could not save payment','error');}
}
async function deletePayment(id){
  if(!(await confirmDialog('Delete this payment? The order balance will be recalculated.')))return;
  const {error}=await window.db.from('payments').delete().eq('id',id);
  if(error){toast('Could not delete payment','error');return;}
  toast('Payment deleted','success');await loadOrder();renderViewMode();
}

/* ---------------- CREATE / EDIT ---------------- */
function renderFormMode() {
  const o = S.order || {};
  const c = S.customer || {};

  document.getElementById('topbarActions').innerHTML = `
    <a class="btn" href="${S.mode === 'edit' ? `order-details.html?id=${S.id}` : 'orders.html'}">Cancel</a>
  `;

  S.formItems = S.items.map(item => {

  const foodItem = S.foodItems.find(
    x => String(x.id) === String(item.food_item_id)
  );

  const group = S.foodGroups.find(
    x => String(x.id) === String(
      item.group_id || foodItem?.group_id
    )
  );

  const category = S.foodCategories.find(
    x => String(x.id) === String(
      item.category_id || group?.category_id
    )
  );

  return {

    rowId: item.id,

    foodItemId: item.food_item_id,

    itemName:
      item.item_name ||
      foodItem?.name ||
      'Unknown Item',

    categoryId:
      item.category_id ||
      category?.id ||
      null,

    categoryName:
      item.category_name ||
      category?.name ||
      'Other',

    groupId:
      item.group_id ||
      group?.id ||
      null,

    groupName:
      item.group_name ||
      group?.name ||
      'Other',

    quantity: 1

  };

});

  document.getElementById('pageContent').innerHTML = `
    <form id="orderForm" class="new-order-form">

      <fieldset class="order-fieldset">
        <legend>Customer Details</legend>

        <div class="customer-form-grid">
          <div class="form-group full-width">
            <label class="f-label">Existing Customer</label>
            <select id="customerSelect">
              <option value="">— New customer —</option>
              ${S.customers.map(x => `
                <option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>
                  ${escapeHtml(x.name)}${x.phone ? ` (${escapeHtml(x.phone)})` : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="f-label">Customer Name <span>*</span></label>
            <input id="custName" type="text" value="${escapeHtml(c.name || o.customer_name || '')}" placeholder="Enter customer name" autocomplete="off">
          </div>

          <div class="form-group">
            <label class="f-label">Phone <span>*</span></label>
            <input id="custPhone" type="tel" value="${escapeHtml(c.phone || '')}" placeholder="Enter phone number" autocomplete="off">
          </div>

          <div class="form-group">
            <label class="f-label">Email</label>
            <input id="custEmail" type="email" value="${escapeHtml(c.email || '')}" placeholder="Enter email address" autocomplete="off">
          </div>

          <div class="form-group">
            <label class="f-label">Address</label>
            <input id="custAddress" type="text" value="${escapeHtml(c.address || '')}" placeholder="Enter address" autocomplete="off">
          </div>

         <div class="form-group">
  <label class="f-label">Event / Function</label>

  <select id="eventName">
    <option value="">Select Event / Function</option>

    ${[
      'Wedding',
      'Birthday',
      'Engagement',
      'Nikah',
      'Reception',
      'Corporate Event',
      'Anniversary',
      'Other'
    ].map(event => `
      <option
        value="${event}"
        ${o.event_name === event ? 'selected' : ''}
      >
        ${event}
      </option>
    `).join('')}

  </select>
</div>

          <div class="form-group">
            <label class="f-label">Event Location</label>
            <input id="eventLocation" type="text" value="${escapeHtml(o.event_location || '')}" placeholder="Enter event location" autocomplete="off">
          </div>
        </div>
      </fieldset>

      <fieldset class="order-fieldset">
        <legend>Order Details</legend>

        <div class="form-row cols-3">
          <div class="form-group">
            <label class="f-label">Order Date <span>*</span></label>
            <input type="date" id="orderDate" value="${o.order_date || todayISO()}">
          </div>

          <div class="form-group">
            <label class="f-label">Order Time <span>*</span></label>
            <input type="time" id="orderTime" value="${o.order_time || '12:00'}">
          </div>

          <div class="form-group">
            <label class="f-label">Status</label>
            <select id="orderStatus">
              ${STATUS_LIST.map(x => `<option value="${x}" ${x === (o.status || 'Pending') ? 'selected' : ''}>${x}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="f-label">Number of Guests <span>*</span></label>
            <input type="number" id="guestCount" min="1" value="${o.guest_count || ''}" oninput="recalcTotals()">
          </div>

          <div class="form-group">
            <label class="f-label">Per Plate Amount (₹) <span>*</span></label>
            <input type="number" id="perPlate" min="0" step="0.01" value="${o.per_plate_amount ?? ''}" oninput="recalcTotals()">
          </div>
        </div>

        <div class="order-hint">
          Order total = Guests × Per Plate + Additional Charge. 
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="f-label">Additional Charge (₹)</label>
            <input type="number" id="additionalInput" min="0" step="0.01" value="${o.additional_charge || 0}" oninput="recalcTotals()">
          </div>

          <div class="form-group">
            <label class="f-label">Calculated Order Total</label>
            <input id="calculatedTotal" disabled value="₹0">
          </div>
        </div>
      </fieldset>

      <fieldset class="order-fieldset">
        <legend>Food Items</legend>

        <div class="food-picker">

  <!-- Category -->
  <div class="form-group">
    <label class="f-label">Category</label>

    <select id="itemCategorySelect">
      <option value="">Select category</option>

      ${S.foodCategories.map(category => `
        <option value="${category.id}">
          ${escapeHtml(category.name)}
        </option>
      `).join('')}

    </select>
  </div>


  <!-- Group -->
  <div class="form-group">
    <label class="f-label">Group</label>

    <select id="itemGroupSelect" disabled>
      <option value="">Select group</option>
    </select>
  </div>


 <!-- Item + Add -->
<div class="form-group">
  <label class="f-label">Item</label>

  <div class="item-select-row">

    <div class="multi-select-dropdown" id="itemDropdown">

      <button
        type="button"
        class="multi-select-trigger"
        id="itemDropdownTrigger"
      >
        <span id="itemDropdownText">Select items</span>
        <span class="dropdown-arrow">▼</span>
      </button>

      <div
        class="multi-select-menu"
        id="itemDropdownMenu"
      >

        <label class="select-all-option">
          <input type="checkbox" id="selectAllItems">
          <span>Select All</span>
        </label>

        <div id="itemCheckboxList"></div>

      </div>

    </div>

    <button
      type="button"
      id="addFoodItemBtn"
      class="add-food-btn"
      disabled
      title="Add Selected Items"
    >
      +
    </button>

  </div>
</div>

</div>

       

        <div id="selectedFoodItems" class="selected-food-items"></div>
      </fieldset>

      <fieldset class="order-fieldset">
        <legend>Notes</legend>
        <textarea id="orderNotes" rows="3" placeholder="Optional order notes">${escapeHtml(o.notes || '')}</textarea>
      </fieldset>

      <div class="order-form-actions">
        <button type="submit" class="btn btn-primary">
          ${S.mode === 'edit' ? 'Save Changes' : 'Create Order'}
        </button>
        <a class="btn" href="${S.mode === 'edit' ? `order-details.html?id=${S.id}` : 'orders.html'}">Cancel</a>
      </div>

    </form>
  `;

  document.getElementById('customerSelect').onchange =
  onCustomerSelectChange;

setupFoodPicker();

renderFormFoodItems();

recalcTotals();

document.getElementById('orderForm').onsubmit =
  saveOrder;
}
function onCustomerSelectChange(e){const c=S.customers.find(x=>x.id===e.target.value);if(!c)return;document.getElementById('custName').value=c.name||'';document.getElementById('custPhone').value=c.phone||'';document.getElementById('custEmail').value=c.email||'';document.getElementById('custAddress').value=c.address||'';}
let itemSeq=0;
function setupFoodPicker() {

  const categorySelect =
    document.getElementById('itemCategorySelect');

  const groupSelect =
    document.getElementById('itemGroupSelect');

  const dropdown =
    document.getElementById('itemDropdown');

  const trigger =
    document.getElementById('itemDropdownTrigger');

  const menu =
    document.getElementById('itemDropdownMenu');

  const addButton =
    document.getElementById('addFoodItemBtn');

  const selectAll =
    document.getElementById('selectAllItems');

  if (!categorySelect || !groupSelect) {
    console.error('Food picker elements missing:', {
      categorySelect,
      groupSelect
    });
    return;
  }

  // CATEGORY
  categorySelect.addEventListener('change', function () {

    const categoryId = this.value;

    console.log('CATEGORY SELECTED:', categoryId);

    // Reset ONLY item selection
    resetItemSelection();

    // Load groups
    fillOrderGroups(categoryId);

  });


  // GROUP
  groupSelect.addEventListener('change', function () {

    const groupId = this.value;

    console.log('GROUP SELECTED:', groupId);

    fillOrderItems(groupId);

  });


  // OPEN/CLOSE ITEM DROPDOWN
  if (trigger && dropdown) {

    trigger.addEventListener('click', function (e) {

      e.stopPropagation();

      if (groupSelect.value) {
        dropdown.classList.toggle('open');
      }

    });

  }


  // CLOSE OUTSIDE
  document.addEventListener('click', function (e) {

    if (dropdown && !dropdown.contains(e.target)) {

      dropdown.classList.remove('open');

    }

  });


  // SELECT ALL
  if (selectAll) {

    selectAll.addEventListener('change', function () {

      const checkboxes =
        document.querySelectorAll(
          '#itemCheckboxList input[type="checkbox"]'
        );

      checkboxes.forEach(cb => {
        cb.checked = this.checked;
      });

      updateItemSelection();

    });

  }


  // ADD ITEMS
  if (addButton) {

    addButton.addEventListener('click', function () {

      const selected =
        Array.from(
          document.querySelectorAll(
            '#itemCheckboxList input[type="checkbox"]:checked'
          )
        ).map(cb => cb.value);

      console.log('SELECTED ITEMS:', selected);

      if (!selected.length) {
        toast('Please select at least one item', 'error');
        return;
      }

      selected.forEach(foodItemId => {

        addFoodItem(foodItemId);

      });


      // Clear selection
      document
        .querySelectorAll(
          '#itemCheckboxList input[type="checkbox"]'
        )
        .forEach(cb => {
          cb.checked = false;
        });


      if (selectAll) {
        selectAll.checked = false;
      }

      updateItemSelection();

      if (dropdown) {
        dropdown.classList.remove('open');
      }

    });

  }

}

function fillOrderGroups(categoryId) {

  const groupSelect =
    document.getElementById('itemGroupSelect');

  if (!groupSelect) {
    console.error('itemGroupSelect not found');
    return;
  }


  console.log('Loading groups for category:', categoryId);

  // Reset group
  groupSelect.innerHTML =
    '<option value="">Select group</option>';

  groupSelect.disabled = true;


  if (!categoryId) {
    console.log('No category selected');
    return;
  }


  console.log('ALL GROUPS:', S.foodGroups);


  const groups =
    S.foodGroups.filter(group => {

      console.log(
        'Checking group:',
        group.name,
        'category_id:',
        group.category_id,
        'selected:',
        categoryId
      );

      return String(group.category_id) ===
             String(categoryId);

    });


  console.log('MATCHED GROUPS:', groups);


  if (!groups.length) {

    groupSelect.innerHTML =
      '<option value="">No groups available</option>';

    groupSelect.disabled = true;

    console.warn(
      'No groups found for category:',
      categoryId
    );

    return;
  }


  groupSelect.innerHTML =
    '<option value="">Select group</option>' +
    groups.map(group => `
      <option value="${group.id}">
        ${escapeHtml(group.name)}
      </option>
    `).join('');


  groupSelect.disabled = false;

  console.log(
    'GROUP DROPDOWN ENABLED:',
    groups.length
  );

}

function fillOrderItems(groupId) {

  const list =
    document.getElementById('itemCheckboxList');

  const selectAll =
    document.getElementById('selectAllItems');

  const addButton =
    document.getElementById('addFoodItemBtn');

  const text =
    document.getElementById('itemDropdownText');


  list.innerHTML = '';

  selectAll.checked = false;

  addButton.disabled = true;

  text.textContent = 'Select items';


  if (!groupId) {

    return;

  }


  const items = S.foodItems.filter(item =>

    String(item.group_id) === String(groupId) &&

    item.is_available !== false

  );


  if (!items.length) {

    list.innerHTML = `
      <div class="no-items">
        No items available
      </div>
    `;

    return;

  }


  list.innerHTML = items.map(item => `

    <label class="item-checkbox-option">

      <input
        type="checkbox"
        value="${item.id}"
        onchange="updateItemSelection()"
      >

      <span>${escapeHtml(item.name)}</span>

    </label>

  `).join('');

}
function updateItemSelection() {

  const checkboxes =
    Array.from(
      document.querySelectorAll(
        '#itemCheckboxList input[type="checkbox"]'
      )
    );

  const selected =
    checkboxes.filter(cb => cb.checked);

  const addButton =
    document.getElementById('addFoodItemBtn');

  const selectAll =
    document.getElementById('selectAllItems');

  const text =
    document.getElementById('itemDropdownText');


  // -----------------------------
  // Button state
  // -----------------------------

  addButton.disabled =
    selected.length === 0;


  // -----------------------------
  // Select All state
  // -----------------------------

  selectAll.checked =
    checkboxes.length > 0 &&
    selected.length === checkboxes.length;


  // -----------------------------
  // Dropdown text
  // -----------------------------

  if (!selected.length) {

    text.textContent = 'Select items';

  }

  else if (
    selected.length === checkboxes.length
  ) {

    text.textContent =
      `All ${selected.length} items selected`;

  }

  else if (selected.length === 1) {

    text.textContent =
      selected[0].parentElement
        .querySelector('span')
        .textContent;

  }

  else {

    text.textContent =
      `${selected.length} items selected`;

  }

}

function resetItemSelection() {

  const list =
    document.getElementById('itemCheckboxList');

  const selectAll =
    document.getElementById('selectAllItems');

  const addButton =
    document.getElementById('addFoodItemBtn');

  const text =
    document.getElementById('itemDropdownText');

  if (list) {
    list.innerHTML = '';
  }

  if (selectAll) {
    selectAll.checked = false;
  }

  if (addButton) {
    addButton.disabled = true;
  }

  if (text) {
    text.textContent = 'Select items';
  }

}


function addFoodItem(foodItemId) {

  const categorySelect =
    document.getElementById('itemCategorySelect');

  const groupSelect =
    document.getElementById('itemGroupSelect');

  if (!categorySelect || !groupSelect) {
    console.error('Food selectors not found:', {
      categorySelect,
      groupSelect
    });

    toast('Food selectors are missing', 'error');
    return;
  }

  const categoryId = categorySelect.value;
  const groupId = groupSelect.value;

  if (!categoryId) {
    toast('Please select a category', 'error');
    return;
  }

  if (!groupId) {
    toast('Please select a group', 'error');
    return;
  }

  if (!foodItemId) {
    return;
  }

  const category = S.foodCategories.find(
    x => String(x.id) === String(categoryId)
  );

  const group = S.foodGroups.find(
    x => String(x.id) === String(groupId)
  );

  const foodItem = S.foodItems.find(
    x => String(x.id) === String(foodItemId)
  );

  if (!category || !group || !foodItem) {

    console.error('Food data not found:', {
      category,
      group,
      foodItem
    });

    toast('Food item information not found', 'error');
    return;
  }

  // Prevent duplicate
  const exists = S.formItems.some(
    x => String(x.foodItemId) === String(foodItem.id)
  );

  if (exists) {
    toast(`${foodItem.name} is already added`, 'error');
    return;
  }

  // Add selected food item
  S.formItems.push({

    rowId: `tmp-${Date.now()}-${++itemSeq}`,

    foodItemId: foodItem.id,

    itemName: foodItem.name,

    categoryId: category.id,
    categoryName: category.name,

    groupId: group.id,
    groupName: group.name,

    quantity: 1

  });

  renderFormFoodItems();
}

function removeFoodItem(foodItemId) {
  S.formItems = S.formItems.filter(
    item => String(item.foodItemId) !== String(foodItemId)
  );

  renderFormFoodItems();
}

function renderFormFoodItems() {
  const container = document.getElementById('selectedFoodItems');

  if (!container) {
    console.error('selectedFoodItems container not found');
    return;
  }

  if (!S.formItems || !S.formItems.length) {
    container.innerHTML = `
      <div class="food-empty">
        No food items selected.
      </div>
    `;
    return;
  }

  const categories = {};

  S.formItems.forEach(selected => {
    const item = S.foodItems.find(
      food => String(food.id) === String(selected.foodItemId)
    );

    if (!item) return;

    const group = S.foodGroups.find(
      group => String(group.id) === String(item.group_id)
    );

    const category = S.foodCategories.find(
      category => String(category.id) === String(group?.category_id)
    );

    const categoryId = category?.id || 'other';

    if (!categories[categoryId]) {
      categories[categoryId] = {
        name: category?.name || 'Other',
        items: []
      };
    }

    categories[categoryId].items.push(selected);
  });

  container.innerHTML = Object.values(categories).map(category => `
    <div class="food-category-block">

      <div class="food-category-title">
        ${escapeHtml(category.name)}
      </div>

      <div class="food-chip-list">

        ${category.items.map(selectedItem => `
          <div class="food-item-chip">

            <span class="food-chip-name">
              ${escapeHtml(selectedItem.itemName)}
            </span>

            <button
              type="button"
              class="food-item-remove"
              title="Remove item"
              onclick="removeFoodItem('${selectedItem.foodItemId}')"
            >
              ×
            </button>

          </div>
        `).join('')}

      </div>

    </div>
  `).join('');
}

function recalcTotals(){
  const guests=Number(document.getElementById('guestCount')?.value)||0,plate=Number(document.getElementById('perPlate')?.value)||0,add=Number(document.getElementById('additionalInput')?.value)||0;
  const total=Math.max(guests*plate+add,0);const el=document.getElementById('calculatedTotal');if(el)el.value=money(total);
}
async function saveOrder(e) {
  e.preventDefault();
  clearAllFieldErrors(e.target);

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  const orderDate = document.getElementById('orderDate').value;
  const orderTime = document.getElementById('orderTime').value;
  const guests = Number(document.getElementById('guestCount').value);
  const plate = Number(document.getElementById('perPlate').value);
  const additional = Number(document.getElementById('additionalInput').value) || 0;
  const status = document.getElementById('orderStatus').value;

  let bad = false;
  const fail = (id, message) => {
    showFieldError(document.getElementById(id), message);
    bad = true;
  };

  if (!name) fail('custName', 'Customer name is required.');
  if (!phone) fail('custPhone', 'Phone is required.');
  if (!orderDate) fail('orderDate', 'Order date is required.');
  if (!orderTime) fail('orderTime', 'Order time is required.');
  if (!guests || guests < 1) fail('guestCount', 'Guests must be greater than 0.');
  if (Number.isNaN(plate) || plate < 0) fail('perPlate', 'Per plate cannot be negative.');

  if (!S.formItems.length) {
    toast('Please select at least one food item.', 'error');
    bad = true;
  }

  if (bad) return;

  const subtotal = guests * plate;
  const total = Math.max(subtotal + additional, 0);

  try {
    let customerId =
      document.getElementById('customerSelect').value ||
      S.customer?.id ||
      null;

    const customerPayload = { name, phone, email, address };

    if (customerId) {
      const { error } = await window.db
        .from('customers')
        .update(customerPayload)
        .eq('id', customerId);
      if (error) throw error;
    } else {
      const { data, error } = await window.db
        .from('customers')
        .insert(customerPayload)
        .select()
        .single();
      if (error) throw error;
      customerId = data.id;
    }

    const payload = {
      customer_id: customerId,
      customer_name: name,
      order_date: orderDate,
      order_time: orderTime,
      guest_count: guests,
      per_plate_amount: plate,
      subtotal,
      additional_charge: additional,
      total_amount: total,
      status,
      event_name:
  document.getElementById('eventName')?.value || null,
      event_location:
  document.getElementById('eventLocation')?.value.trim() || null,
      notes: document.getElementById('orderNotes').value.trim()
    };

    let orderId = S.id;

    if (S.mode === 'edit') {
      const { error } = await window.db
        .from('orders')
        .update(payload)
        .eq('id', orderId);
      if (error) throw error;
    } else {
      const { data, error } = await window.db
        .from('orders')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      orderId = data.id;
    }

    const existingIds = S.formItems
      .filter(item => !String(item.rowId).startsWith('tmp-'))
      .map(item => item.rowId);

    const deletedIds = S.originalItemIds.filter(
      id => !existingIds.includes(id)
    );

    if (deletedIds.length) {
      const { error } = await window.db
        .from('order_items')
        .delete()
        .in('id', deletedIds);
      if (error) throw error;
    }

    for (const item of S.formItems) {

  const itemPayload = {
    order_id: orderId,

    // Food item
    food_item_id: item.foodItemId,
    item_name: item.itemName,

    // Category
    category_id: item.categoryId,
    category_name: item.categoryName,

    // Group
    group_id: item.groupId,
    group_name: item.groupName,

    // Quantity
    quantity: 1
  };

  const query =
    String(item.rowId).startsWith('tmp-')
      ? window.db
          .from('order_items')
          .insert(itemPayload)
      : window.db
          .from('order_items')
          .update(itemPayload)
          .eq('id', item.rowId);

  const { error } = await query;

  if (error) {
    console.error(
      'Order item save error:',
      error
    );

    throw error;
  }
}

    toast(
      S.mode === 'edit' ? 'Order updated' : 'Order created',
      'success'
    );

    setTimeout(() => {
      location.href = `order-details.html?id=${orderId}`;
    }, 400);
  } catch (error) {
    console.error('Save order error:', error);
    toast('Could not save order. Check Supabase schema/RLS.', 'error');
  }
}

/* ---------------- checklist/status ---------------- */
async function toggleChecklist(id,checked){const {error}=await window.db.from('order_items').update({is_completed:checked}).eq('id',id);if(error){toast('Could not update checklist','error');return;}const i=S.items.find(x=>x.id===id);if(i)i.is_completed=checked;renderViewMode();}
async function changeStatus(e){const {error}=await window.db.from('orders').update({status:e.target.value}).eq('id',S.id);if(error){toast('Could not update status','error');return;}S.order.status=e.target.value;toast('Status updated','success');}
async function deleteOrderNow(){if(!(await confirmDialog('Delete this order and all its payment records?')))return;const {error}=await window.db.from('orders').delete().eq('id',S.id);if(error){toast('Could not delete order','error');return;}location.href='orders.html';}

/* ---------------- bill / PDF ---------------- */
function billHTML(){
  const o=S.order,c=S.customer||{},ps=paymentSummary();
  return `<div class="bill"><div class="bill-head"><h2>PAYMENT BILL</h2><p>${escapeHtml(getSettings().businessName||'FoodOrder Management')}</p></div>
  <div class="bill-meta"><strong>${shortId(o.id)}</strong><span>${formatDateDisplay(o.order_date)} ${formatTime12(o.order_time)}</span></div>
  <p><strong>Customer:</strong> ${escapeHtml(c.name||o.customer_name||'—')} &nbsp; <strong>Phone:</strong> ${escapeHtml(c.phone||'—')}</p>
  <table><thead><tr><th style="text-align:left">Item</th></tr></thead><tbody>${S.items.map(i=>`<tr><td>${escapeHtml(i.item_name)}</td></tr>`).join('')}</tbody></table>
  <div class="bill-total"><span>ORDER TOTAL</span><span>${money(ps.total)}</span></div>
  <p>Paid: ${money(ps.paid)} &nbsp; Discount: ${money(ps.disc)} &nbsp; <strong>Balance: ${money(ps.balance)}</strong></p>
  <p class="thanks">Thank you for your order!</p></div>`;
}
function printBill(){document.getElementById('printArea').innerHTML=billHTML();window.print();}
async function generatePDF() {

  // =====================================================
  // DATA
  // =====================================================

  const o = S.order;
  const c = S.customer || {};
  const ps = paymentSummary();

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();


  // =====================================================
  // MONEY FORMAT
  // =====================================================

  const pdfMoney = amount => {

    return `Rs. ${Number(amount || 0).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    )}`;

  };


  // =====================================================
  // LOAD LOGO
  // =====================================================

  let logo = null;

  try {

    logo = await loadPDFLogo('logo.png');

  } catch (error) {

    console.warn(
      'Logo could not be loaded:',
      error
    );

  }


  // =====================================================
  // WATERMARK
  // =====================================================

  if (logo) {

    try {

      if (doc.GState) {

        doc.saveGraphicsState();

        doc.setGState(
          new doc.GState({
            opacity: 0.06
          })
        );

        doc.addImage(
          logo,
          'PNG',
          (pageWidth - 280) / 2,
          330,
          280,
          280
        );

        doc.restoreGraphicsState();

      }

    } catch (error) {

      console.warn(
        'Watermark could not be added:',
        error
      );

    }

  }


  // =====================================================
  // HEADER LOGO
  // =====================================================

  if (logo) {

    try {

      doc.addImage(
        logo,
        'PNG',
        35,
        25,
        65,
        65
      );

    } catch (error) {

      console.warn(
        'Header logo could not be added:',
        error
      );

    }

  }


  // =====================================================
  // RESET PDF TEXT
  // =====================================================

  doc.setCharSpace(0);

  doc.setTextColor(
    35,
    35,
    35
  );


  // =====================================================
  // BUSINESS HEADER
  // =====================================================

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(17);

  doc.text(
    'O. S Kitchen Caters And Events',
    115,
    42
  );


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(9);

  doc.text(
    'Pothencode, Kerala, 695584',
    115,
    58
  );

  doc.text(
    'Mobile: 9745445594',
    115,
    72
  );

  doc.text(
    'Email: mubeenpallinada143@gmail.com',
    115,
    86
  );


  // =====================================================
  // PAYMENT BILL TITLE
  // =====================================================

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(15);

  doc.text(
    'PAYMENT BILL',
    pageWidth - 35,
    42,
    {
      align: 'right'
    }
  );


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(8.5);

  doc.text(
    `Order ID: ${shortId(o.id)}`,
    pageWidth - 35,
    59,
    {
      align: 'right'
    }
  );

  doc.text(
    `Date: ${formatDateDisplay(o.order_date)}`,
    pageWidth - 35,
    73,
    {
      align: 'right'
    }
  );

  doc.text(
    `Time: ${formatTime12(o.order_time)}`,
    pageWidth - 35,
    87,
    {
      align: 'right'
    }
  );


  // =====================================================
  // HEADER LINE
  // =====================================================

  doc.setDrawColor(
    47,
    100,
    89
  );

  doc.setLineWidth(1);

  doc.line(
    35,
    103,
    pageWidth - 35,
    103
  );


  // =====================================================
  // CUSTOMER / ORDER DETAILS
  // =====================================================

  let infoY = 125;


  // Customer box

  doc.setFillColor(
    248,
    248,
    248
  );

  doc.setDrawColor(
    220,
    220,
    220
  );

  doc.roundedRect(
    35,
    infoY,
    250,
    75,
    6,
    6,
    'FD'
  );


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(9);

  doc.text(
    'CUSTOMER',
    48,
    infoY + 18
  );


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(8.5);

  doc.text(
    `Name: ${c.name || o.customer_name || '—'}`,
    48,
    infoY + 35
  );

  doc.text(
    `Phone: ${c.phone || '—'}`,
    48,
    infoY + 51
  );

  doc.text(
    `Order: ${shortId(o.id)}`,
    48,
    infoY + 67
  );


  // Order details box

  doc.roundedRect(
    305,
    infoY,
    pageWidth - 340,
    75,
    6,
    6,
    'FD'
  );


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'ORDER DETAILS',
    318,
    infoY + 18
  );


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    `Guests: ${o.guest_count || 0}`,
    318,
    infoY + 35
  );

  doc.text(
    `Per Plate: ${pdfMoney(o.per_plate_amount)}`,
    318,
    infoY + 51
  );

  doc.text(
    `Order Total: ${pdfMoney(ps.total)}`,
    318,
    infoY + 67
  );


  // =====================================================
  // BUILD FOOD HIERARCHY
  // =====================================================

  function buildFoodHierarchy() {

    const categories = {};


    (S.items || []).forEach(item => {

      const category =
        item.category_name ||
        item.category ||
        item.food_category ||
        'Other';


      const group =
        item.group_name ||
        item.group ||
        item.food_group ||
        'Other';


      const itemName =
        item.item_name ||
        item.name ||
        'Unnamed Item';


      if (!categories[category]) {

        categories[category] = {};

      }


      if (!categories[category][group]) {

        categories[category][group] = [];

      }


      if (
        !categories[category][group]
          .includes(itemName)
      ) {

        categories[category][group]
          .push(itemName);

      }

    });


    return categories;

  }


  const foodHierarchy =
    buildFoodHierarchy();


  // =====================================================
  // FOOD ITEMS TITLE
  // =====================================================

  let foodY =
    infoY + 95;


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.setTextColor(
    47,
    100,
    89
  );

  doc.text(
    'FOOD ITEMS',
    35,
    foodY
  );


  foodY += 12;


  // =====================================================
  // FOOD ITEMS BOX
  // =====================================================

  const foodBoxX = 35;

  const foodBoxW =
    pageWidth - 70;


  /*
   * We draw the box first with a reasonable
   * starting height. If there are many items,
   * additional pages are handled below.
   */

 const foodStartY = foodY + 5;

let currentY = foodStartY + 18;


  // =====================================================
  // FOOD BOX
  // =====================================================

  


  // =====================================================
  // FOOD CONTENT
  // =====================================================

  Object.entries(foodHierarchy)
    .forEach(
      ([category, groups]) => {

        // -----------------------------------------------
        // CATEGORY
        // -----------------------------------------------

        if (
          currentY >
          pageHeight - 70
        ) {

          doc.addPage();

          currentY = 45;

        }


        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.setFontSize(10);

        doc.setTextColor(
          47,
          100,
          89
        );

        doc.text(
          category,
          50,
          currentY
        );


        currentY += 18;


        // -----------------------------------------------
        // GROUP
        // -----------------------------------------------

        Object.entries(groups)
          .forEach(
            ([group, items]) => {

              if (
                currentY >
                pageHeight - 70
              ) {

                doc.addPage();

                currentY = 45;

              }


              doc.setFont(
                'helvetica',
                'bold'
              );

              doc.setFontSize(8.5);

              doc.setTextColor(
                55,
                55,
                55
              );

              doc.text(
                `${group}:`,
                62,
                currentY
              );


              currentY += 15;


              // -----------------------------------------
              // ITEMS
              // -----------------------------------------

              doc.setFont(
                'helvetica',
                'normal'
              );

              doc.setFontSize(8);

              doc.setTextColor(
                45,
                45,
                45
              );


              items.forEach(
                itemName => {

                  if (
                    currentY >
                    pageHeight - 70
                  ) {

                    doc.addPage();

                    currentY = 45;

                  }


                  const itemLines =
                    doc.splitTextToSize(
                      `• ${itemName}`,
                      foodBoxW - 85
                    );


                  itemLines.forEach(
                    line => {

                      doc.text(
                        line,
                        80,
                        currentY
                      );

                      currentY += 13;

                    }
                  );

                }
              );


              currentY += 4;

            }
          );


        currentY += 6;

      }
    );


  // =====================================================
  // FOOD BOX BORDER
  // =====================================================

  /*
   * If everything fits on the first page,
   * redraw the complete border around the content.
   */

  const foodHeight =
  currentY - foodStartY + 15;

if (currentY < pageHeight - 100) {

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.6);

  doc.roundedRect(
    foodBoxX,
    foodStartY,
    foodBoxW,
    foodHeight,
    6,
    6,
    'S'
  );
}


  // =====================================================
  // PAYMENT SUMMARY POSITION
  // =====================================================

  let summaryY =
    currentY + 20;


  if (
    summaryY >
    pageHeight - 180
  ) {

    doc.addPage();

    summaryY = 50;

  }


  // =====================================================
  // PAYMENT SUMMARY
  // =====================================================
summaryY += 20;
  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.setTextColor(
    35,
    35,
    35
  );

  doc.text(
    'PAYMENT SUMMARY',
    35,
    summaryY
  );


  summaryY += 15;


  const summaryBoxW =
    pageWidth - 70;

  const summaryBoxH =
    105;


  doc.setFillColor(
    248,
    248,
    248
  );

  doc.setDrawColor(
    210,
    210,
    210
  );

  doc.roundedRect(
    35,
    summaryY,
    summaryBoxW,
    summaryBoxH,
    6,
    6,
    'FD'
  );


  let sy =
    summaryY + 22;


  const rightX =
    pageWidth - 50;


  // Total

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(9);

  doc.text(
    'Order Total',
    50,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    pdfMoney(ps.total),
    rightX,
    sy,
    {
      align: 'right'
    }
  );


  sy += 20;


  // Paid

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    'Total Paid',
    50,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    pdfMoney(ps.paid),
    rightX,
    sy,
    {
      align: 'right'
    }
  );


  sy += 20;


  // Discount

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    'Payment Discount',
    50,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    `- ${pdfMoney(ps.disc)}`,
    rightX,
    sy,
    {
      align: 'right'
    }
  );


  sy += 21;


  // Balance

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.text(
    'BALANCE',
    50,
    sy
  );

  doc.text(
    pdfMoney(ps.balance),
    rightX,
    sy,
    {
      align: 'right'
    }
  );


  // =====================================================
  // PAYMENT HISTORY
  // =====================================================

  let historyY =
    summaryY +
    summaryBoxH +
    25;


  if (
    historyY >
    pageHeight - 100
  ) {

    doc.addPage();

    historyY = 50;

  }


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(10);

  doc.text(
    'PAYMENT HISTORY',
    35,
    historyY
  );


  historyY += 15;


  // =====================================================
  // PAYMENT HISTORY TABLE
  // =====================================================

  const paymentRows =
    (S.payments || []).map(
      p => [

        formatDateDisplay(
          p.payment_date
        ),

        pdfMoney(p.amount),

        pdfMoney(p.discount),

        pdfMoney(
          Number(p.amount || 0) +
          Number(p.discount || 0)
        )

      ]
    );


  if (paymentRows.length) {

    doc.autoTable({

      startY: historyY,

      margin: {
        left: 35,
        right: 35,
        bottom: 40
      },

      head: [[
        'Date',
        'Paid',
        'Discount',
        'Payment Value'
      ]],

      body: paymentRows,

      theme: 'grid',

      styles: {

        font: 'helvetica',

        fontSize: 8,

        cellPadding: 5,

        valign: 'middle',

        lineWidth: 0.4,

        textColor: [
          35,
          35,
          35
        ]

      },

      headStyles: {

        fontStyle: 'bold',

        fontSize: 8,

        halign: 'center',

        textColor: [
          255,
          255,
          255
        ],

        fillColor: [
          47,
          100,
          89
        ]

      },

      columnStyles: {

        0: {
          cellWidth: 120,
          halign: 'center'
        },

        1: {
          cellWidth: 110,
          halign: 'right'
        },

        2: {
          cellWidth: 110,
          halign: 'right'
        },

        3: {
          cellWidth: 130,
          halign: 'right'
        }

      },

      didParseCell: function(data) {

        doc.setCharSpace(0);

        if (
          data.section === 'body' &&
          [1, 2, 3].includes(
            data.column.index
          )
        ) {

          data.cell.styles.halign =
            'right';

        }

      },

      willDrawCell: function() {

        doc.setCharSpace(0);

      },

      didDrawCell: function() {

        doc.setCharSpace(0);

      }

    });

  } else {

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(8);

    doc.text(
      'No payment recorded.',
      35,
      historyY
    );

  }


  // =====================================================
  // FOOTER
  // =====================================================

  const totalPages =
    doc.internal.getNumberOfPages();


  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    doc.setPage(page);

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(7.5);

    doc.setTextColor(
      110,
      110,
      110
    );

    doc.text(
      'O. S Kitchen Caters And Events',
      35,
      pageHeight - 18
    );

    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - 35,
      pageHeight - 18,
      {
        align: 'right'
      }
    );

  }


  // =====================================================
  // SAVE
  // =====================================================

  doc.save(
    `${shortId(o.id)}-payment-bill.pdf`
  );


  toast(
    'Payment bill PDF generated',
    'success'
  );

}
function loadPDFLogo(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (error) => {
      console.error('Logo loading failed:', src, error);
      resolve(null);
    };

    img.src = src;
  });
}
