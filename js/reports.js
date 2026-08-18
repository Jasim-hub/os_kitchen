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
function generateMonthlyReportPDF(){
 const rows=repState.orders.filter(inRange),sum=rows.reduce((a,o)=>{const c=calc(o);a.t+=c.total;a.p+=c.paid;a.d+=c.disc;a.b+=c.balance;return a;},{t:0,p:0,d:0,b:0}),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'});
 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('MONTHLY PAYMENT REPORT',40,44);doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text(`Period: ${formatDateDisplay(repState.from)} - ${formatDateDisplay(repState.to)}`,40,62);
 doc.autoTable({startY:85,head:[['Order','Customer','Date','Total','Paid','Discount','Balance','Status']],body:rows.map(o=>{const c=calc(o);return[shortId(o.id),o.customers?.name||o.customer_name||'',formatDateDisplay(o.order_date),money(c.total),money(c.paid),money(c.disc),money(c.balance),c.balance<=0?'Fully Paid':c.effective>0?'Partially Paid':'Unpaid'];}),theme:'grid',styles:{fontSize:7}});
 let y=(doc.lastAutoTable?.finalY||120)+25;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(`TOTAL AMOUNT: ${money(sum.t)}`,40,y);y+=15;doc.text(`TOTAL PAID: ${money(sum.p)}`,40,y);y+=15;doc.text(`TOTAL DISCOUNT: ${money(sum.d)}`,40,y);y+=15;doc.text(`UNPAID AMOUNT: ${money(sum.b)}`,40,y);
 doc.save(`payment-report-${repState.from}-to-${repState.to}.pdf`);toast('Monthly report PDF generated','success');
}
function shortId(id){return 'ORD-'+id.slice(0,8).toUpperCase();}
