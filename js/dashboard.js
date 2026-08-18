/* ==========================================================
   dashboard.js
   Home page: KPI stats + filterable order list for a chosen
   date range (Today / Tomorrow / This Week / Custom Date),
   with extra Status / Customer / Time filters.
   ========================================================== */

const dashState = {
  range: 'today',      // today | tomorrow | week | custom
  customDate: todayISO(),
  status: 'All',
  customerQuery: '',
  time: 'All',
  orders: [],
};

document.addEventListener('DOMContentLoaded', () => {
  renderShell('dashboard', 'Dashboard', 'Overview of catering orders');
  document.getElementById('topbarActions').innerHTML =
    `<a class="btn btn-primary" href="order-details.html?new=1">${icon('plus')} New Order</a>`;
  renderDashboardShell();
  loadDashboard();
});

function dateRangeBounds() {
  if (dashState.range === 'today') return [todayISO(), todayISO()];
  if (dashState.range === 'tomorrow') { const t = addDaysISO(todayISO(), 1); return [t, t]; }
  if (dashState.range === 'week') return [startOfWeekISO(), addDaysISO(startOfWeekISO(), 6)];
  return [dashState.customDate, dashState.customDate];
}

function renderDashboardShell() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="generateTodayOrdersPDF()">${icon('pdf')} Today's Orders PDF</button>`;
  document.getElementById('pageContent').innerHTML = `
    <div class="stat-grid" id="statGrid">
      ${['Orders','Guests','Revenue','Pending','Completed'].map(() =>
        `<div class="stat-card c-grey"><div class="bar"></div><div class="label">Loading…</div><div class="value">—</div></div>`
      ).join('')}
    </div>

    <div class="card">
      <div class="card-head">
        <h3 id="listTitle">Today's Orders</h3>
      </div>
      <div class="filter-bar">
        <div class="field">
          <label>Date Range</label>
          <div class="seg" id="rangeSeg">
            <button data-r="today" class="active">Today</button>
            <button data-r="tomorrow">Tomorrow</button>
            <button data-r="week">This Week</button>
            <button data-r="custom">Custom</button>
          </div>
        </div>
        <div class="field" id="customDateField" style="display:none;">
          <label>Choose Date</label>
          <input type="date" id="customDateInput" value="${todayISO()}">
        </div>
        <div class="field">
          <label>Status</label>
          <select id="statusFilter">
            <option value="All">All statuses</option>
            ${STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Order Time</label>
          <select id="timeFilter"><option value="All">All times</option></select>
        </div>
        <div class="field" style="flex:1;min-width:180px;">
          <label>Customer</label>
          <div class="search-box">
            ${icon('search')}
            <input type="text" id="customerFilter" placeholder="    Search customer name…">
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Date</th><th>Time</th>
              <th>Guests</th><th>Per Plate</th><th>Total</th><th>Paid</th><th>Balance</th><th>Payment</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="dashTableBody">${loadingRow(12)}</tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('#rangeSeg button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#rangeSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dashState.range = btn.dataset.r;
      document.getElementById('customDateField').style.display = dashState.range === 'custom' ? 'flex' : 'none';
      const titles = { today: "Today's Orders", tomorrow: "Tomorrow's Orders", week: "This Week's Orders", custom: 'Orders' };
      document.getElementById('listTitle').textContent = titles[dashState.range];
      loadDashboard();
    };
  });
  document.getElementById('customDateInput').onchange = (e) => {
    dashState.customDate = e.target.value; loadDashboard();
  };
  document.getElementById('statusFilter').onchange = (e) => { dashState.status = e.target.value; renderDashTable(); };
  document.getElementById('timeFilter').onchange = (e) => { dashState.time = e.target.value; renderDashTable(); };
  document.getElementById('customerFilter').oninput = debounce((e) => {
    dashState.customerQuery = e.target.value.trim().toLowerCase(); renderDashTable();
  }, 250);
}

async function loadDashboard() {
  const [from, to] = dateRangeBounds();
  document.getElementById('dashTableBody').innerHTML = loadingRow(12);
  try {
    const { data, error } = await window.db
      .from('orders')
      .select('*, customers(name, phone), order_items(id, item_name, quantity, is_completed), payments(amount, discount)')
      .gte('order_date', from)
      .lte('order_date', to)
      .order('order_date', { ascending: true })
      .order('order_time', { ascending: true });
    if (error) throw error;
    dashState.orders = data || [];
    populateTimeFilterOptions();
    renderStats();
    renderDashTable();
  } catch (err) {
    console.error(err);
    document.getElementById('dashTableBody').innerHTML =
      `<tr><td colspan="12">${errorState('Unable to load orders. Please check your Supabase configuration and try again.')}</td></tr>`;
    toast('Failed to load dashboard data', 'error');
  }
}

function populateTimeFilterOptions() {
  const times = [...new Set(dashState.orders.map(o => o.order_time))].sort();
  const sel = document.getElementById('timeFilter');
  const current = sel.value;
  sel.innerHTML = `<option value="All">All times</option>` +
    times.map(t => `<option value="${t}">${formatTime12(t)}</option>`).join('');
  sel.value = times.includes(current) ? current : 'All';
}

function paymentTotals(o) {
  const paid=(o.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
  const discount=(o.payments||[]).reduce((s,p)=>s+(Number(p.discount)||0),0);
  const total=Number(o.total_amount)||0;
  return {paid,discount,balance:Math.max(total-paid-discount,0)};
}
function renderStats() {
  const orders=dashState.orders;
  const totalOrders=orders.length;
  const totalGuests=orders.reduce((s,o)=>s+(o.guest_count||0),0);
  const totalAmount=orders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
  const totalPaid=orders.reduce((s,o)=>s+paymentTotals(o).paid,0);
  const unpaid=orders.reduce((s,o)=>s+paymentTotals(o).balance,0);
  const fullyPaid=orders.filter(o=>paymentTotals(o).balance<=0 && Number(o.total_amount)>0).length;
  const cards=[
    {label:'Total Orders',value:totalOrders,cls:'c-accent'},
    {label:'Total Guests',value:totalGuests,cls:'c-blue'},
    {label:'Total Amount',value:money(totalAmount),cls:'c-teal'},
    {label:'Total Paid',value:money(totalPaid),cls:'c-teal'},
    {label:'Unpaid Amount',value:money(unpaid),cls:'c-grey'},
    {label:'Fully Paid',value:fullyPaid,cls:'c-grey'}
  ];
  document.getElementById('statGrid').innerHTML=cards.map(c=>`<div class="stat-card ${c.cls}"><div class="bar"></div><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`).join('');
}
function renderDashTable() {
  let rows = dashState.orders.filter(o => {
    if (dashState.status !== 'All' && o.status !== dashState.status) return false;
    if (dashState.time !== 'All' && o.order_time !== dashState.time) return false;
    if (dashState.customerQuery && !(o.customers?.name || '').toLowerCase().includes(dashState.customerQuery)) return false;
    return true;
  });

  const body = document.getElementById('dashTableBody');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="12">${emptyState('No orders found', 'Try a different date range or clear your filters.')}</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(o => `
    <tr>
      <td class="order-id">${shortId(o.id)}</td>
      <td>${escapeHtml(o.customers?.name || '—')}</td>
      <td>${formatDateDisplay(o.order_date)}</td>
      <td>${formatTime12(o.order_time)}</td>
      <td>${o.guest_count}</td>
      <td>${money(o.per_plate_amount)}</td>
      <td><strong>${money(o.total_amount)}</strong></td>
      <td>${money(paymentTotals(o).paid)}</td>
      <td><strong>${money(paymentTotals(o).balance)}</strong></td>
      <td>${paymentTotals(o).balance <= 0 && Number(o.total_amount)>0 ? '<span class="badge avail">Fully Paid</span>' : paymentTotals(o).paid>0 || paymentTotals(o).discount>0 ? '<span class="badge" style="background:#fff4d6;color:#8a5a00;">Partially Paid</span>' : '<span class="badge unavail">Unpaid</span>'}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="td-actions">
        <a class="btn btn-sm btn-icon" title="View" href="order-details.html?id=${o.id}">${icon('eye')}</a>
        <a class="btn btn-sm btn-icon" title="Edit" href="order-details.html?id=${o.id}&edit=1">${icon('edit')}</a>
        <button class="btn btn-sm btn-icon" title="Delete" onclick="dashDeleteOrder('${o.id}')">${icon('trash')}</button>
      </td>
    </tr>
  `).join('');
}

function shortId(id) { return 'ORD-' + id.slice(0, 8).toUpperCase(); }

async function dashDeleteOrder(id) {
  const ok = await confirmDialog('Are you sure you want to delete this order? This also removes its food items and checklist.');
  if (!ok) return;
  try {
    const { error } = await window.db.from('orders').delete().eq('id', id);
    if (error) throw error;
    toast('Order deleted', 'success');
    loadDashboard();
  } catch (err) {
    console.error(err);
    toast('Could not delete order', 'error');
  }
}

async function generateTodayOrdersPDF() {

  // =========================================================
  // FILTER ORDERS
  // =========================================================

  const rows = dashState.orders.filter(o => {

    if (
      dashState.status !== 'All' &&
      o.status !== dashState.status
    ) {
      return false;
    }

    if (
      dashState.time !== 'All' &&
      o.order_time !== dashState.time
    ) {
      return false;
    }

    if (
      dashState.customerQuery &&
      !(o.customers?.name || '')
        .toLowerCase()
        .includes(dashState.customerQuery)
    ) {
      return false;
    }

    return true;
  });


  // =========================================================
  // CREATE PDF
  // =========================================================

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });


  // =========================================================
  // PAGE SIZE
  // =========================================================

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();


  // =========================================================
  // LOAD LOGO
  // =========================================================

  let logo = null;

  try {

    logo = await loadPDFLogo('logo.png');

  } catch (error) {

    console.warn(
      'Logo could not be loaded:',
      error
    );

  }


  // =========================================================
  // WATERMARK
  // =========================================================

  if (logo) {

    try {

      if (doc.GState) {

        doc.saveGraphicsState();

        doc.setGState(
          new doc.GState({
            opacity: 0.07
          })
        );

        doc.addImage(
          logo,
          'PNG',
          (pageWidth - 320) / 2,
          (pageHeight - 320) / 2,
          320,
          320
        );

        doc.restoreGraphicsState();

      } else {

        doc.addImage(
          logo,
          'PNG',
          (pageWidth - 320) / 2,
          (pageHeight - 320) / 2,
          320,
          320
        );

      }

    } catch (error) {

      console.warn(
        'Watermark could not be added:',
        error
      );

    }
  }


  // =========================================================
  // HEADER LOGO
  // =========================================================

  if (logo) {

    try {

      doc.addImage(
        logo,
        'PNG',
        25,
        18,
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


  // =========================================================
  // HEADER
  // =========================================================

  doc.setCharSpace(0);

  doc.setTextColor(
    35,
    35,
    35
  );


  // Company name

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(18);

  doc.text(
    'OS EVENTS & KITCHEN',
    105,
    40
  );


  // Report title

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(10);

  doc.text(
    "TODAY'S ORDERS",
    105,
    57
  );


  // Date

  doc.setFontSize(9);

  doc.text(
    `Date: ${formatDateDisplay(todayISO())}`,
    105,
    72
  );


  // =========================================================
  // MONEY FORMAT
  // =========================================================

  const pdfMoney = amount => {

    return `Rs. ${Number(
      amount || 0
    ).toLocaleString('en-IN')}`;

  };


  // =========================================================
  // CALCULATE SUMMARY
  // =========================================================

  const totalAmount = rows.reduce(
    (sum, o) =>
      sum +
      Number(o.total_amount || 0),
    0
  );


  const totalPaid = rows.reduce(
    (sum, o) =>
      sum +
      Number(
        paymentTotals(o).paid || 0
      ),
    0
  );


  const totalBalance = rows.reduce(
    (sum, o) =>
      sum +
      Number(
        paymentTotals(o).balance || 0
      ),
    0
  );


  // =========================================================
  // SUMMARY
  // =========================================================

  doc.setCharSpace(0);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(10);

  doc.setTextColor(
    35,
    35,
    35
  );


  doc.text(
    `Orders: ${rows.length}`,
    pageWidth - 180,
    38
  );


  doc.text(
    `Total: ${pdfMoney(totalAmount)}`,
    pageWidth - 180,
    54
  );


  doc.text(
    `Paid: ${pdfMoney(totalPaid)}`,
    pageWidth - 180,
    70
  );


  doc.text(
    `Balance: ${pdfMoney(totalBalance)}`,
    pageWidth - 180,
    86
  );


  // =========================================================
  // TABLE DATA
  // =========================================================

  const tableBody = rows.map(o => {

    const payment =
      paymentTotals(o);


    // -------------------------------------------------------
    // FOOD ITEMS
    // -------------------------------------------------------

    const items =
      (o.order_items || [])
        .map(item =>
          item.item_name ||
          item.name ||
          ''
        )
        .filter(Boolean)
        .join(' • ');


    // -------------------------------------------------------
    // PAYMENT STATUS
    // -------------------------------------------------------

    let paymentStatus =
      'Unpaid';


    if (
      payment.balance <= 0
    ) {

      paymentStatus =
        'Fully Paid';

    } else if (
      payment.paid +
      payment.discount > 0
    ) {

      paymentStatus =
        'Partially Paid';

    }


    // -------------------------------------------------------
    // RETURN TABLE ROW
    // -------------------------------------------------------

    return [

      // Order
      shortId(o.id),

      // Customer
      o.customers?.name ||
      '—',

      // Time
      formatTime12(
        o.order_time
      ),

      // Guests
      String(
        o.guest_count || 0
      ),

      // Per plate
      pdfMoney(
        o.per_plate_amount
      ),

      // Items
      items || '—',

      // Total
      pdfMoney(
        o.total_amount
      ),

      // Paid
      pdfMoney(
        payment.paid
      ),

      // Balance
      pdfMoney(
        payment.balance
      ),

      // Payment status
      paymentStatus

    ];

  });


  // =========================================================
  // TABLE
  // =========================================================

  doc.setCharSpace(0);


  doc.autoTable({

    // -------------------------------------------------------
    // POSITION
    // -------------------------------------------------------

    startY: 105,


    margin: {

      top: 105,

      left: 25,

      right: 25,

      bottom: 35

    },


    // -------------------------------------------------------
    // HEADER
    // -------------------------------------------------------

    head: [[

      'Order',

      'Customer',

      'Time',

      'Guests',

      'Per Plate',

      'Items',

      'Total',

      'Paid',

      'Balance',

      'Payment'

    ]],


    // -------------------------------------------------------
    // BODY
    // -------------------------------------------------------

    body: tableBody,


    // -------------------------------------------------------
    // THEME
    // -------------------------------------------------------

    theme: 'grid',


    // =======================================================
    // GENERAL STYLES
    // =======================================================

    styles: {

      font: 'helvetica',

      fontStyle: 'normal',

      fontSize: 7,

      cellPadding: 4,

      overflow: 'linebreak',

      valign: 'middle',

      lineWidth: 0.4,

      lineColor: [
        210,
        210,
        210
      ],

      textColor: [
        35,
        35,
        35
      ]

    },


    // =======================================================
    // HEADER STYLES
    // =======================================================

    headStyles: {

      font: 'helvetica',

      fontStyle: 'bold',

      fontSize: 7,

      halign: 'center',

      valign: 'middle',

      cellPadding: 5,

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


    // =======================================================
    // BODY STYLES
    // =======================================================

    bodyStyles: {

      font: 'helvetica',

      fontStyle: 'normal',

      minCellHeight: 22,

      valign: 'middle'

    },


    // =======================================================
    // ALTERNATE ROW
    // =======================================================

    alternateRowStyles: {

      fillColor: [
        248,
        248,
        248
      ]

    },


    // =======================================================
    // COLUMN WIDTHS
    // =======================================================

    columnStyles: {

      // Order
      0: {

        cellWidth: 55,

        halign: 'center'

      },


      // Customer
      1: {

        cellWidth: 85,

        halign: 'left'

      },


      // Time
      2: {

        cellWidth: 55,

        halign: 'center'

      },


      // Guests
      3: {

        cellWidth: 45,

        halign: 'center'

      },


      // Per Plate
      4: {

        cellWidth: 65,

        halign: 'right'

      },


      // =====================================================
      // ITEMS
      // =====================================================

      5: {

        cellWidth: 225,

        halign: 'left',

        valign: 'top',

        overflow: 'linebreak'

      },


      // Total
      6: {

        cellWidth: 70,

        halign: 'right'

      },


      // Paid
      7: {

        cellWidth: 70,

        halign: 'right'

      },


      // Balance
      8: {

        cellWidth: 70,

        halign: 'right'

      },


      // Payment
      9: {

        cellWidth: 85,

        halign: 'center'

      }

    },


    // =======================================================
    // PARSE CELL
    // =======================================================

    didParseCell: function (data) {

      // Always reset spacing
      doc.setCharSpace(0);


      // -----------------------------------------------------
      // ITEMS COLUMN
      // -----------------------------------------------------

      if (

        data.section === 'body' &&

        data.column.index === 5

      ) {

        const itemText =
          String(
            data.cell.raw || ''
          );


        // Normal items
        if (
          itemText.length <= 150
        ) {

          data.cell.styles.fontSize =
            7;

        }


        // Many items
        else if (
          itemText.length <= 250
        ) {

          data.cell.styles.fontSize =
            6;

        }


        // More items
        else if (
          itemText.length <= 350
        ) {

          data.cell.styles.fontSize =
            5.5;

        }


        // Very many items
        else {

          data.cell.styles.fontSize =
            5;

        }


        data.cell.styles.overflow =
          'linebreak';


        data.cell.styles.valign =
          'top';


        data.cell.styles.halign =
          'left';

      }


      // -----------------------------------------------------
      // NUMBER COLUMNS
      // -----------------------------------------------------

      if (

        data.section === 'body' &&

        [
          3,
          4,
          6,
          7,
          8
        ].includes(
          data.column.index
        )

      ) {

        data.cell.styles.halign =
          'right';

      }


      // -----------------------------------------------------
      // PAYMENT STATUS
      // -----------------------------------------------------

      if (

        data.section === 'body' &&

        data.column.index === 9

      ) {

        data.cell.styles.fontSize =
          6.5;


        data.cell.styles.fontStyle =
          'bold';


        data.cell.styles.halign =
          'center';

      }

    },


    // =======================================================
    // BEFORE DRAW CELL
    // =======================================================

    willDrawCell: function () {

      doc.setCharSpace(0);

    },


    // =======================================================
    // AFTER DRAW CELL
    // =======================================================

    didDrawCell: function () {

      doc.setCharSpace(0);

    }

  });


  // =========================================================
  // RESET SPACING
  // =========================================================

  doc.setCharSpace(0);


  // =========================================================
  // FOOTER
  // =========================================================

  const finalY =
    doc.lastAutoTable?.finalY ||
    120;


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(8);

  doc.setTextColor(
    100,
    100,
    100
  );


  doc.text(
    'OS EVENTS & KITCHEN',
    25,
    pageHeight - 18
  );


  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    pageWidth - 180,
    pageHeight - 18
  );


  // =========================================================
  // SAVE PDF
  // =========================================================

  doc.save(
    `todays-orders-${todayISO()}.pdf`
  );


  // =========================================================
  // SUCCESS MESSAGE
  // =========================================================

  toast(
    "Today's orders PDF generated",
    'success'
  );

}
function loadPDFLogo(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      console.warn('Logo could not be loaded:', src);
      resolve(null);
    };

    img.src = src;
  });
}

