/* Reports v2: total / paid / unpaid + customer payment badges + PDF */
let revenueChart,statusChart;
const repState={orders:[],from:addDaysISO(todayISO(),-29),to:todayISO()};
document.addEventListener('DOMContentLoaded',()=>{renderShell('reports','Reports','Payment and order reports');renderReportsShell();loadReports();});
function calc(o){const paid=(o.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0),disc=(o.payments||[]).reduce((s,p)=>s+Number(p.discount||0),0),total=Number(o.total_amount)||0;return{total,paid,disc,balance:Math.max(total-paid-disc,0),effective:paid+disc};}
function payBadge(o){const x=calc(o);return x.balance<=0&&x.total>0?'<span class="badge avail">Fully Paid</span>':x.effective>0?'<span class="badge" style="background:#fff4d6;color:#8a5a00;">Partially Paid</span>':'<span class="badge unavail">Unpaid</span>';}
function renderReportsShell(){
 document.getElementById('pageContent').innerHTML=`
 <div class="card mb-0" style="margin-bottom:18px;"><div class="filter-bar">
  <div class="field"><label>From</label><input type="date" id="repFrom" value="${repState.from}"></div>
  <div class="field"><label>To</label><input type="date" id="repTo" value="${repState.to}"></div>
  <div class="field" style="align-self:flex-end;"><button class="btn btn-primary" onclick="applyReportRange()">Apply</button></div>
  <div class="field" style="align-self:flex-end;"><button class="btn" onclick="generateMonthlyReportPDF()">Monthly Report PDF</button></div>
 </div></div>
 <div class="stat-grid" id="repStats">${['Total Amount','Total Paid','Unpaid Amount','Total Orders','Fully Paid'].map(l=>`<div class="stat-card c-grey"><div class="bar"></div><div class="label">${l}</div><div class="value">—</div></div>`).join('')}</div>
 <div class="detail-grid"><div class="card"><div class="card-head"><h3>Revenue — Last 14 Days</h3></div><div class="card-body"><canvas id="revenueCanvas" height="220"></canvas></div></div>
 <div class="card"><div class="card-head"><h3>Orders by Status</h3></div><div class="card-body"><canvas id="statusCanvas" height="220"></canvas></div></div></div>
 <div class="card mt-16"><div class="card-head"><h3>Payment Report</h3></div><div class="table-wrap"><table>
 <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Discount</th><th>Balance</th><th>Payment Status</th><th></th></tr></thead>
 <tbody id="repTableBody">${loadingRow(9)}</tbody></table></div></div>`;
}
function applyReportRange(){repState.from=document.getElementById('repFrom').value;repState.to=document.getElementById('repTo').value;renderStats();renderCharts();renderRangeTable();}
async function loadReports(){
 try{const {data,error}=await window.db.from('orders').select('*, customers(name), payments(*)').order('order_date');if(error)throw error;repState.orders=data||[];renderStats();renderCharts();renderRangeTable();}
 catch(e){console.error(e);document.getElementById('repTableBody').innerHTML=`<tr><td colspan="9">${errorState('Unable to load reports. Please run the v2 schema/migration.')}</td></tr>`;toast('Failed to load reports','error');}
}
function inRange(o){return o.order_date>=repState.from&&o.order_date<=repState.to;}
function renderStats(){
 const rows=repState.orders.filter(inRange),x=rows.reduce((a,o)=>{const c=calc(o);a.total+=c.total;a.paid+=c.paid;a.balance+=c.balance;if(c.balance<=0&&c.total>0)a.full++;return a;},{total:0,paid:0,balance:0,full:0});
 const cards=[['Total Amount',money(x.total),'c-accent'],['Total Paid',money(x.paid),'c-teal'],['Unpaid Amount',money(x.balance),'c-blue'],['Total Orders',rows.length,'c-grey'],['Fully Paid',x.full,'c-grey']];
 document.getElementById('repStats').innerHTML=cards.map(c=>`<div class="stat-card ${c[2]}"><div class="bar"></div><div class="label">${c[0]}</div><div class="value">${c[1]}</div></div>`).join('');
}
function renderCharts(){
 const days=[...Array(14)].map((_,i)=>addDaysISO(todayISO(),i-13)),rev=days.map(d=>repState.orders.filter(o=>o.order_date===d).reduce((s,o)=>s+calc(o).paid,0));
 const a=document.getElementById('revenueCanvas');if(revenueChart)revenueChart.destroy();revenueChart=new Chart(a,{type:'bar',data:{labels:days.map(d=>formatDateDisplay(d).slice(0,6)),datasets:[{label:'Paid (₹)',data:rev,backgroundColor:'#E0A23A',borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
 const b=document.getElementById('statusCanvas');if(statusChart)statusChart.destroy();statusChart=new Chart(b,{type:'doughnut',data:{labels:['Unpaid','Partially Paid','Fully Paid'],datasets:[{data:['Unpaid','Partially Paid','Fully Paid'].map(s=>repState.orders.filter(o=>{const c=calc(o);return s==='Fully Paid'?c.balance<=0&&c.total>0:s==='Partially Paid'?c.effective>0&&c.balance>0:c.effective===0;}).length),backgroundColor:['#BD4438','#E0A23A','#2F6459']}]},options:{plugins:{legend:{position:'bottom'}}}});
}
function renderRangeTable(){
 const rows=repState.orders.filter(inRange),body=document.getElementById('repTableBody');if(!rows.length){body.innerHTML=`<tr><td colspan="9">${emptyState('No orders in this range')}</td></tr>`;return;}
 body.innerHTML=rows.map(o=>{const c=calc(o);return `<tr><td class="order-id">ORD-${o.id.slice(0,8).toUpperCase()}</td><td>${escapeHtml(o.customers?.name||o.customer_name||'—')}</td><td>${formatDateDisplay(o.order_date)}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td>${money(c.disc)}</td><td><strong>${money(c.balance)}</strong></td><td>${payBadge(o)}</td><td><a class="btn btn-sm" href="order-details.html?id=${o.id}">View</a></td></tr>`;}).join('');
}
async function generateMonthlyReportPDF() {

  // =====================================================
  // GET REPORT DATA
  // =====================================================

  const rows = repState.orders.filter(inRange);

  const sum = rows.reduce(
    (a, o) => {

      const c = calc(o);

      a.t += Number(c.total || 0);
      a.p += Number(c.paid || 0);
      a.d += Number(c.disc || 0);
      a.b += Number(c.balance || 0);

      return a;

    },
    {
      t: 0,
      p: 0,
      d: 0,
      b: 0
    }
  );


  // =====================================================
  // CREATE PDF
  // =====================================================

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });


  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();


  // =====================================================
  // PDF MONEY FORMAT
  // =====================================================

  // Do NOT use money() inside the PDF.
  // This keeps numbers clear and prevents broken spacing.

  const pdfMoney = amount => {

    const value =
      Number(amount || 0);

    return `Rs. ${value.toLocaleString(
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
          (pageWidth - 300) / 2,
          (pageHeight - 300) / 2,
          300,
          300
        );

        doc.restoreGraphicsState();

      } else {

        doc.addImage(
          logo,
          'PNG',
          (pageWidth - 300) / 2,
          (pageHeight - 300) / 2,
          300,
          300
        );

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
  // RESET TEXT SPACING
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
  // REPORT TITLE - RIGHT
  // =====================================================

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(16);

  doc.text(
    'MONTHLY PAYMENT REPORT',
    pageWidth - 40,
    42,
    {
      align: 'right'
    }
  );


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(9);

  doc.text(
    `Period: ${formatDateDisplay(
      repState.from
    )} - ${formatDateDisplay(
      repState.to
    )}`,
    pageWidth - 40,
    60,
    {
      align: 'right'
    }
  );


  doc.text(
    `Generated: ${new Date().toLocaleDateString(
      'en-IN'
    )}`,
    pageWidth - 40,
    75,
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
    100,
    pageWidth - 35,
    100
  );


  // =====================================================
  // TABLE DATA
  // =====================================================

  const tableBody = rows.map(o => {

    const c = calc(o);

    let status = 'Unpaid';


    if (
      c.balance <= 0 &&
      c.total > 0
    ) {

      status = 'Fully Paid';

    } else if (
      c.effective > 0 &&
      c.balance > 0
    ) {

      status = 'Partially Paid';

    }


    return [

      shortId(o.id),

      o.customers?.name ||
      o.customer_name ||
      '—',

      formatDateDisplay(
        o.order_date
      ),

      pdfMoney(c.total),

      pdfMoney(c.paid),

      pdfMoney(c.disc),

      pdfMoney(c.balance),

      status

    ];

  });


  // =====================================================
  // REPORT TABLE
  // =====================================================

  doc.autoTable({

    startY: 115,

    margin: {
      top: 115,
      left: 35,
      right: 35,
      bottom: 45
    },


    head: [[
      'Order',
      'Customer',
      'Date',
      'Total',
      'Paid',
      'Discount',
      'Balance',
      'Status'
    ]],


    body: tableBody,


    theme: 'grid',


    // ===================================================
    // GENERAL STYLES
    // ===================================================

    styles: {

      font: 'helvetica',

      fontStyle: 'normal',

      fontSize: 8,

      cellPadding: 5,

      overflow: 'linebreak',

      valign: 'middle',

      lineWidth: 0.4,

      lineColor: [
        205,
        205,
        205
      ],

      textColor: [
        35,
        35,
        35
      ]

    },


    // ===================================================
    // HEADER STYLES
    // ===================================================

    headStyles: {

      font: 'helvetica',

      fontStyle: 'bold',

      fontSize: 8,

      halign: 'center',

      valign: 'middle',

      cellPadding: 6,

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


    // ===================================================
    // BODY
    // ===================================================

    bodyStyles: {

      minCellHeight: 23,

      valign: 'middle'

    },


    alternateRowStyles: {

      fillColor: [
        248,
        248,
        248
      ]

    },


    // ===================================================
    // COLUMN WIDTHS
    // ===================================================

    columnStyles: {

      // Order
      0: {

        cellWidth: 70,

        halign: 'center'

      },


      // Customer
      1: {

        cellWidth: 125,

        halign: 'left',

        overflow: 'linebreak'

      },


      // Date
      2: {

        cellWidth: 75,

        halign: 'center'

      },


      // Total
      3: {

        cellWidth: 90,

        halign: 'right'

      },


      // Paid
      4: {

        cellWidth: 90,

        halign: 'right'

      },


      // Discount
      5: {

        cellWidth: 90,

        halign: 'right'

      },


      // Balance
      6: {

        cellWidth: 95,

        halign: 'right'

      },


      // Status
      7: {

        cellWidth: 100,

        halign: 'center'

      }

    },


    // ===================================================
    // IMPORTANT NUMBER FIX
    // ===================================================

    didParseCell: function (data) {

      // Always reset character spacing
      doc.setCharSpace(0);


      // Amount columns
      if (
        data.section === 'body' &&
        [3, 4, 5, 6].includes(
          data.column.index
        )
      ) {

        data.cell.styles.halign =
          'right';

        data.cell.styles.fontSize =
          8;

        data.cell.styles.fontStyle =
          'normal';

      }


      // Order number
      if (
        data.section === 'body' &&
        data.column.index === 0
      ) {

        data.cell.styles.fontSize =
          7.5;

      }


      // Status
      if (
        data.section === 'body' &&
        data.column.index === 7
      ) {

        data.cell.styles.fontSize =
          7.5;

        data.cell.styles.fontStyle =
          'bold';

      }

    },


    // ===================================================
    // RESET CHARACTER SPACING
    // ===================================================

    willDrawCell: function () {

      doc.setCharSpace(0);

    },


    didDrawCell: function () {

      doc.setCharSpace(0);

    }

  });


  // =====================================================
  // SUMMARY
  // =====================================================

  let y =
    (doc.lastAutoTable?.finalY || 150) + 25;


  // If summary is too close to bottom,
  // create a new page.

  if (
    y > pageHeight - 125
  ) {

    doc.addPage();

    y = 50;

  }


  // =====================================================
  // SUMMARY TITLE
  // =====================================================

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.setCharSpace(0);

  doc.text(
    'REPORT SUMMARY',
    40,
    y
  );


  y += 22;


  // =====================================================
  // SUMMARY BOX
  // =====================================================

  const boxX = 40;

  const boxY = y;

  const boxW = 330;

  const boxH = 105;


  doc.setDrawColor(
    210,
    210,
    210
  );

  doc.setFillColor(
    248,
    248,
    248
  );

  doc.roundedRect(
    boxX,
    boxY,
    boxW,
    boxH,
    6,
    6,
    'FD'
  );


  // =====================================================
  // SUMMARY TEXT
  // =====================================================

  let sy =
    boxY + 22;


  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(9);

  doc.setCharSpace(0);


  // Total

  doc.text(
    'Total Amount',
    boxX + 15,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    pdfMoney(sum.t),
    boxX + boxW - 15,
    sy,
    {
      align: 'right'
    }
  );


  sy += 21;


  // Paid

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    'Total Paid',
    boxX + 15,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    pdfMoney(sum.p),
    boxX + boxW - 15,
    sy,
    {
      align: 'right'
    }
  );


  sy += 21;


  // Discount

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    'Total Discount',
    boxX + 15,
    sy
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    pdfMoney(sum.d),
    boxX + boxW - 15,
    sy,
    {
      align: 'right'
    }
  );


  sy += 21;


  // Unpaid

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Unpaid Amount',
    boxX + 15,
    sy
  );

  doc.text(
    pdfMoney(sum.b),
    boxX + boxW - 15,
    sy,
    {
      align: 'right'
    }
  );


  // =====================================================
  // FOOTER
  // =====================================================

  doc.setCharSpace(0);

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(8);

  doc.setTextColor(
    110,
    110,
    110
  );


  doc.text(
    'O. S Kitchen Caters And Events',
    35,
    pageHeight - 20
  );


  doc.text(
    'Pothencode, Kerala, 695584',
    pageWidth / 2,
    pageHeight - 20,
    {
      align: 'center'
    }
  );


  doc.text(
    `Page 1`,
    pageWidth - 35,
    pageHeight - 20,
    {
      align: 'right'
    }
  );


  // =====================================================
  // SAVE PDF
  // =====================================================

  doc.save(
    `payment-report-${repState.from}-to-${repState.to}.pdf`
  );


  // =====================================================
  // SUCCESS MESSAGE
  // =====================================================

  toast(
    'Monthly report PDF generated',
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
function shortId(id){return 'ORD-'+id.slice(0,8).toUpperCase();}
