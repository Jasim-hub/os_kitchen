/* ==========================================================
   food-items.js
   Simple Food Catalog:
   Category -> Group -> Item
   Food items do NOT have a price.
   ========================================================== */

const fiState = {
  categories: [],
  groups: [],
  items: [],
  selectedCategoryId: null,
  editingCategoryId: null,
  editingGroupId: null,
  editingItemId: null,
};

const CATEGORY_EMOJI = {
  'Welcome Counter': '🥤',
  'Main Course': '🍛',
  'Desserts': '🍮',
  'Sadya': '🍃',
};

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('food-items', 'Food Items', 'Manage categories, groups and items');
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-primary" onclick="openCategoryModal()">${icon('plus')} Add Category</button>`;
  renderFoodPage();
  await loadCategories();
});

function renderFoodPage() {
  document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h3>Food Catalog</h3>
          <div class="text-soft">Category → Group → Item</div>
        </div>
      </div>

      <div class="food-category-tabs" id="foodCategoryTabs">
        <div class="loading-row"><span class="spinner"></span>Loading categories…</div>
      </div>

      <div class="card-body" id="foodCatalogBody">
        <div class="loading-row"><span class="spinner"></span>Loading…</div>
      </div>
    </div>

    ${categoryModalHTML()}
    ${groupModalHTML()}
    ${itemModalHTML()}
  `;
}

function categoryModalHTML() {
  return `
    <div class="modal-backdrop" id="categoryModal">
      <div class="modal">
        <div class="modal-head">
          <h3 id="categoryModalTitle">Add Category</h3>
          <button class="modal-close-icon" onclick="closeModal('categoryModal')">${icon('close')}</button>
        </div>
        <form id="categoryForm">
          <div class="modal-body">
            <div class="form-group">
    <label class="f-label">Category *</label>

    <select id="categoryName">
        <option value="">Select Category</option>
        <option value="Welcome Counter">Welcome Counter</option>
        <option value="Main Course">Main Course</option>
        <option value="Desserts">Desserts</option>
        <option value="Sadya">Sadya</option>
    </select>
</div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" onclick="closeModal('categoryModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Category</button>
          </div>
        </form>
      </div>
    </div>`;
}

function groupModalHTML() {
  return `
    <div class="modal-backdrop" id="groupModal">
      <div class="modal">
        <div class="modal-head">
          <h3 id="groupModalTitle">Add Group</h3>
          <button class="modal-close-icon" onclick="closeModal('groupModal')">${icon('close')}</button>
        </div>
        <form id="groupForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="f-label">Category</label>
              <input id="groupCategory" disabled>
            </div>
            <div class="form-group">
              <label class="f-label">Group Name *</label>
              <input id="groupName" type="text" placeholder="e.g. Fresh Juice" autocomplete="off">
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" onclick="closeModal('groupModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Group</button>
          </div>
        </form>
      </div>
    </div>`;
}

function itemModalHTML() {
  return `
    <div class="modal-backdrop" id="itemModal">
      <div class="modal">
        <div class="modal-head">
          <h3 id="itemModalTitle">Add Food Item</h3>
          <button class="modal-close-icon" onclick="closeModal('itemModal')">${icon('close')}</button>
        </div>
        <form id="itemForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="f-label">Category</label>
              <input id="itemCategory" disabled>
            </div>
            <div class="form-group">
              <label class="f-label">Group</label>
              <input id="itemGroup" disabled>
            </div>
            <div class="form-group">
              <label class="f-label">Item Name *</label>
              <input id="itemName" type="text" placeholder="e.g. Watermelon Juice" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="f-label">Description</label>
              <textarea id="itemDescription" rows="3" placeholder="Optional description"></textarea>
            </div>
            <div class="form-group">
              <label class="f-label">Availability</label>
              <select id="itemAvailability">
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
            <div class="hint">Price is not stored here. The per-plate amount is set when creating/editing an order.</div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" onclick="closeModal('itemModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Item</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function loadCategories() {
  try {
    const { data, error } = await window.db
      .from('food_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;

    fiState.categories = data || [];

    if (!fiState.selectedCategoryId && fiState.categories.length) {
      fiState.selectedCategoryId = fiState.categories[0].id;
    }

    renderCategoryTabs();
    await loadGroups();
  } catch (err) {
    console.error(err);
    document.getElementById('foodCategoryTabs').innerHTML = errorState('Unable to load categories.');
    toast('Failed to load food categories', 'error');
  }
}

function renderCategoryTabs() {
  const el = document.getElementById('foodCategoryTabs');
  if (!el) return;

  if (!fiState.categories.length) {
    el.innerHTML = `<div class="empty-state">No categories yet. Click <strong>Add Category</strong>.</div>`;
    return;
  }

  el.innerHTML = fiState.categories.map(c => `
    <div class="food-category-tab-wrap">
      <button class="food-category-tab ${c.id === fiState.selectedCategoryId ? 'active' : ''}"
        onclick="selectCategory('${c.id}')">
        <span>${CATEGORY_EMOJI[c.name] || '🍽️'}</span>
        <span>${escapeHtml(c.name)}</span>
      </button>
      <button class="tiny-action" title="Edit category" onclick="openCategoryModal('${c.id}')">${icon('edit')}</button>
      <button class="tiny-action danger" title="Delete category" onclick="deleteCategory('${c.id}')">${icon('trash')}</button>
    </div>
  `).join('');
}

async function selectCategory(id) {
  fiState.selectedCategoryId = id;
  renderCategoryTabs();
  await loadGroups();
}

async function loadGroups() {
  const body = document.getElementById('foodCatalogBody');
  if (!body) return;

  if (!fiState.selectedCategoryId) {
    body.innerHTML = `<div class="empty-state">Create a category to start adding groups and items.</div>`;
    return;
  }

  body.innerHTML = `<div class="loading-row"><span class="spinner"></span>Loading groups…</div>`;

  try {
    const { data, error } = await window.db
      .from('food_groups')
      .select('*')
      .eq('category_id', fiState.selectedCategoryId)
      .order('display_order', { ascending: true });
    if (error) throw error;

    fiState.groups = data || [];
    await renderGroups();
  } catch (err) {
    console.error(err);
    body.innerHTML = errorState('Unable to load food groups.');
    toast('Failed to load groups', 'error');
  }
}

async function renderGroups() {
  const body = document.getElementById('foodCatalogBody');
  const category = fiState.categories.find(c => c.id === fiState.selectedCategoryId);
  if (!body || !category) return;

  body.innerHTML = `
    <div class="catalog-heading">
      <div>
        <h3>${CATEGORY_EMOJI[category.name] || '🍽️'} ${escapeHtml(category.name)}</h3>
        <div class="text-soft">${fiState.groups.length} group${fiState.groups.length === 1 ? '' : 's'}</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="openGroupModal()">${icon('plus')} Add Group</button>
    </div>
    <div id="groupList"></div>`;

  const list = document.getElementById('groupList');
  if (!fiState.groups.length) {
    list.innerHTML = `<div class="empty-state mt-16">No groups in this category. Add your first group.</div>`;
    return;
  }

  for (const group of fiState.groups) {
    const card = document.createElement('div');
    card.className = 'catalog-group';
    card.innerHTML = `
      <div class="catalog-group-head">
        <div>
          <h4>${escapeHtml(group.name)}</h4>
          <div class="text-soft" id="group-count-${group.id}">Loading…</div>
        </div>
        <div class="catalog-actions">
          <button class="btn btn-sm btn-primary" onclick="openItemModal('${group.id}')">${icon('plus')} Add Item</button>
          <button class="btn btn-sm btn-icon" title="Edit group" onclick="openGroupModal('${group.id}')">${icon('edit')}</button>
          <button class="btn btn-sm btn-icon btn-danger" title="Delete group" onclick="deleteGroup('${group.id}')">${icon('trash')}</button>
        </div>
      </div>
      <div class="food-grid compact" id="items-${group.id}">
        <div class="loading-row"><span class="spinner"></span>Loading items…</div>
      </div>`;
    list.appendChild(card);
    await loadItems(group.id);
  }
}

async function loadItems(groupId) {
  try {
    const { data, error } = await window.db
      .from('food_items')
      .select('*')
      .eq('group_id', groupId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;

    renderItems(groupId, data || []);
  } catch (err) {
    console.error(err);
    const el = document.getElementById(`items-${groupId}`);
    if (el) el.innerHTML = errorState('Unable to load items.');
  }
}

function renderItems(groupId, items) {
  const el = document.getElementById(`items-${groupId}`);
  const count = document.getElementById(`group-count-${groupId}`);
  if (!el) return;

  if (count) count.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;

  if (!items.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No items yet. Click <strong>+ Add Item</strong>.</div>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="food-card compact-card">
      <div class="thumb">${CATEGORY_EMOJI[fiState.categories.find(c => c.id === fiState.selectedCategoryId)?.name] || '🍽️'}</div>
      <div class="fc-body">
        <div class="fc-name">${escapeHtml(item.name)}</div>
        <div class="fc-cat">Food item</div>
        ${item.description ? `<div class="text-soft item-description">${escapeHtml(item.description)}</div>` : ''}
        <div class="flex justify-between items-center mt-8">
          <span class="badge ${item.is_available ? 'avail' : 'unavail'}">${item.is_available ? 'Available' : 'Unavailable'}</span>
          <span class="no-price-label">No item price</span>
        </div>
        <div class="fc-actions">
          <button class="btn btn-sm btn-icon" title="Edit" onclick="openItemModal('${groupId}', '${item.id}')">${icon('edit')}</button>
          <button class="btn btn-sm btn-icon" title="Toggle availability" onclick="toggleAvailability('${item.id}', ${!item.is_available}, '${groupId}')">${item.is_available ? '🚫' : '✅'}</button>
          <button class="btn btn-sm btn-icon btn-danger" title="Delete" onclick="deleteItem('${item.id}', '${groupId}')">${icon('trash')}</button>
        </div>
      </div>
    </div>`).join('');
}

function openCategoryModal(id = null) {
  fiState.editingCategoryId = id;
  const item = id ? fiState.categories.find(x => x.id === id) : null;
  document.getElementById('categoryModalTitle').textContent = item ? 'Edit Category' : 'Add Category';
  document.getElementById('categoryName').value = item?.name || '';
  openModal('categoryModal');
  setTimeout(() => document.getElementById('categoryName').focus(), 50);
}

async function saveCategory(e) {
  e.preventDefault();
  const name = document.getElementById('categoryName').value.trim();
  if (!name) return toast('Enter category name', 'error');

  try {
    if (fiState.editingCategoryId) {
      const { error } = await window.db.from('food_categories').update({ name }).eq('id', fiState.editingCategoryId);
      if (error) throw error;
      toast('Category updated', 'success');
    } else {
      const { error } = await window.db.from('food_categories').insert({
        name,
        display_order: fiState.categories.length + 1,
      });
      if (error) throw error;
      toast('Category added', 'success');
    }
    closeModal('categoryModal');
    await loadCategories();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not save category', 'error');
  }
}

function openGroupModal(id = null) {
  if (!fiState.selectedCategoryId) return toast('Select a category first', 'error');
  fiState.editingGroupId = id;
  const group = id ? fiState.groups.find(x => x.id === id) : null;
  const category = fiState.categories.find(x => x.id === fiState.selectedCategoryId);
  document.getElementById('groupModalTitle').textContent = group ? 'Edit Group' : 'Add Group';
  document.getElementById('groupCategory').value = category?.name || '';
  document.getElementById('groupName').value = group?.name || '';
  openModal('groupModal');
  setTimeout(() => document.getElementById('groupName').focus(), 50);
}

async function saveGroup(e) {
  e.preventDefault();
  const name = document.getElementById('groupName').value.trim();
  if (!name) return toast('Enter group name', 'error');

  try {
    if (fiState.editingGroupId) {
      const { error } = await window.db.from('food_groups').update({ name }).eq('id', fiState.editingGroupId);
      if (error) throw error;
      toast('Group updated', 'success');
    } else {
      const { error } = await window.db.from('food_groups').insert({
        category_id: fiState.selectedCategoryId,
        name,
        display_order: fiState.groups.length + 1,
      });
      if (error) throw error;
      toast('Group added', 'success');
    }
    closeModal('groupModal');
    await loadGroups();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not save group', 'error');
  }
}

function openItemModal(groupId, itemId = null) {
  const group = fiState.groups.find(x => x.id === groupId);
  if (!group) return;

  fiState.editingGroupId = groupId;
  fiState.editingItemId = itemId;

  document.getElementById('itemModalTitle').textContent = itemId ? 'Edit Food Item' : 'Add Food Item';
  document.getElementById('itemCategory').value = fiState.categories.find(c => c.id === fiState.selectedCategoryId)?.name || '';
  document.getElementById('itemGroup').value = group.name;

  const loadExisting = async () => {
    let item = null;
    if (itemId) {
      const { data, error } = await window.db.from('food_items').select('*').eq('id', itemId).single();
      if (error) return toast('Could not load item', 'error');
      item = data;
    }
    document.getElementById('itemName').value = item?.name || '';
    document.getElementById('itemDescription').value = item?.description || '';
    document.getElementById('itemAvailability').value = String(item ? item.is_available : true);
    openModal('itemModal');
    setTimeout(() => document.getElementById('itemName').focus(), 50);
  };
  loadExisting();
}

async function saveItem(e) {
  e.preventDefault();
  const name = document.getElementById('itemName').value.trim();
  if (!name) return toast('Enter item name', 'error');

  const payload = {
    group_id: fiState.editingGroupId,
    name,
    description: document.getElementById('itemDescription').value.trim() || null,
    is_available: document.getElementById('itemAvailability').value === 'true',
  };

  try {
    if (fiState.editingItemId) {
      const { error } = await window.db.from('food_items').update(payload).eq('id', fiState.editingItemId);
      if (error) throw error;
      toast('Food item updated', 'success');
    } else {
      const { error } = await window.db.from('food_items').insert({
        ...payload,
        display_order: 1,
      });
      if (error) throw error;
      toast('Food item added', 'success');
    }
    closeModal('itemModal');
    await loadGroups();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not save food item', 'error');
  }
}

async function deleteCategory(id) {
  const category = fiState.categories.find(x => x.id === id);
  if (!category) return;
  const ok = await confirmDialog(`Delete "${category.name}" and all groups/items inside it?`);
  if (!ok) return;
  try {
    const { error } = await window.db.from('food_categories').delete().eq('id', id);
    if (error) throw error;
    if (fiState.selectedCategoryId === id) fiState.selectedCategoryId = null;
    toast('Category deleted', 'success');
    await loadCategories();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not delete category', 'error');
  }
}

async function deleteGroup(id) {
  const group = fiState.groups.find(x => x.id === id);
  if (!group) return;
  const ok = await confirmDialog(`Delete "${group.name}" and all items inside it?`);
  if (!ok) return;
  try {
    const { error } = await window.db.from('food_groups').delete().eq('id', id);
    if (error) throw error;
    toast('Group deleted', 'success');
    await loadGroups();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not delete group', 'error');
  }
}

async function toggleAvailability(id, value, groupId) {
  try {
    const { error } = await window.db.from('food_items').update({ is_available: value }).eq('id', id);
    if (error) throw error;
    toast(value ? 'Item available' : 'Item unavailable', 'success');
    await loadItems(groupId);
  } catch (err) {
    console.error(err);
    toast('Could not update availability', 'error');
  }
}

async function deleteItem(id, groupId) {
  const ok = await confirmDialog('Delete this food item? Past orders keep their saved item name.');
  if (!ok) return;
  try {
    const { error } = await window.db.from('food_items').delete().eq('id', id);
    if (error) throw error;
    toast('Food item deleted', 'success');
    await loadItems(groupId);
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not delete food item', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('categoryForm').onsubmit = saveCategory;
  document.getElementById('groupForm').onsubmit = saveGroup;
  document.getElementById('itemForm').onsubmit = saveItem;
});
