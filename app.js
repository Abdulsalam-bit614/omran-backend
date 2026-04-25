// ══ تبديل تسجيل دخول / حساب جديد ══
function switchAuthTab(tab) {
const lf = document.getElementById(‘login-form’);
const rf = document.getElementById(‘register-form’);
const ff = document.getElementById(‘forgot-form’);
const lb = document.getElementById(‘tab-login-btn’);
const rb = document.getElementById(‘tab-reg-btn’);
if (!lf) return;
lf.style.display = tab === ‘login’ ? ‘’ : ‘none’;
rf.style.display = tab === ‘register’ ? ‘’ : ‘none’;
if (ff) ff.style.display = ‘none’;
if (lb) lb.classList.toggle(‘on’, tab === ‘login’);
if (rb) rb.classList.toggle(‘on’, tab === ‘register’);
}

// ══ شريط الإعلانات ══
async function initAdBar() {
try {
const res = await fetch(`${API}/ads`);
const ads = await res.json();
const featured = professionals.filter(p => p.isFeatured);
let items = ‘’;
if (Array.isArray(ads)) {
ads.forEach(a => items += `<div class="ad-item">📢 <span class="tag">إعلان</span> ${a.name} — ${a.text}</div>`);
}
featured.forEach(p => items += `<div class="ad-item">⭐ <span class="tag">مميز</span> ${p.name} — ${p.spec} — ${[p.village,p.city].filter(Boolean).join(' - ')||''}</div>`);
if (!items) return;
const bar = document.getElementById(‘ad-bar’);
if (!bar) return;
bar.style.display = ‘’;
document.getElementById(‘ad-track’).innerHTML = items + items;
} catch(e) {}
}

const API = ‘/api’;

// ── ألوان التخصصات ──
const TBG={worker:’#eef2ff’,store:’#f0fdf4’,engineer:’#fef3c7’,contractor:’#fdf2f8’,client:’#f1f5f9’,admin:’#0f172a’};
const TCL={worker:’#1a56db’,store:’#15803d’,engineer:’#92400e’,contractor:’#7c3aed’,client:’#475569’,admin:’#fff’};
const TEM={worker:‘🔨’,store:‘🏪’,engineer:‘📐’,contractor:‘🏗️’,client:‘👤’,admin:‘⚙️’};

function avgRating(p){ return p.reviews?.length ? p.reviews.reduce((s,r)=>s+r.stars,0)/p.reviews.length : null; }
function openChatWith(id){ showPage(‘pg-chat’); }

const SYRIA={
‘دمشق’:[‘المزة’,‘كفرسوسة’,‘البرامكة’,‘ركن الدين’,‘باب توما’,‘المهاجرين’,‘دمر’,‘قدسيا’,‘المالكي’],
‘ريف دمشق’:[‘دوما’,‘عربين’,‘زملكا’,‘جرمانا’,‘صيدنايا’,‘يبرود’,‘الزبداني’,‘معضمية الشام’,‘داريا’,‘قطنا’,‘النبك’,‘سعسع’],
‘حلب’:[‘العزيزية’,‘الشهباء’,‘السليمانية’,‘إعزاز’,‘منبج’,‘الباب’,‘جرابلس’,‘عفرين’,‘عين العرب’,‘أعزاز’],
‘درعا’:[‘درعا البلد’,‘درعا المحطة’,‘نوى’,‘المزيريب’,‘الصنمين’,‘طفس’,‘بصرى الشام’,‘إنخل’,‘الحراك’,‘جاسم’,‘داعل’,‘عتمان’,‘ازرع’,‘خربة غزالة’],
‘حمص’:[‘الوعر’,‘الزهراء’,‘الرستن’,‘تلبيسة’,‘القصير’,‘تدمر’,‘تلكلخ’,‘المخرم’,‘حمص القديمة’],
‘حماة’:[‘مصياف’,‘السلمية’,‘محردة’,‘صوران’,‘مورك’,‘اللطامنة’,‘حماة القديمة’],
‘اللاذقية’:[‘جبلة’,‘القرداحة’,‘الحفة’,‘سلمى’,‘اللاذقية القديمة’],
‘طرطوس’:[‘صافيتا’,‘بانياس’,‘الشيخ بدر’,‘دريكيش’,‘القدموس’],
‘إدلب’:[‘معرة النعمان’,‘أريحا’,‘جسر الشغور’,‘سرمين’,‘بنش’,‘سرمدا’,‘أطمة’],
‘دير الزور’:[‘الميادين’,‘البوكمال’,‘الأشارة’,‘موحسن’],
‘الرقة’:[‘الطبقة’,‘تل أبيض’,‘سلوك’],
‘الحسكة’:[‘القامشلي’,‘المالكية’,‘رأس العين’,‘عامودا’,‘الشدادي’],
‘السويداء’:[‘شهبا’,‘صلخد’,‘القريا’,‘ضمير’],
‘القنيطرة’:[‘فيق’,‘البعث’,‘خان أرنبة’],
};

let specialties=[
{id:‘بلاط وسيراميك’,icon:‘🔲’,type:‘worker’},
{id:‘دهان وديكور’,icon:‘🖌️’,type:‘worker’},
{id:‘كهرباء’,icon:‘⚡’,type:‘worker’},
{id:‘صحي وسباكة’,icon:‘🚰’,type:‘worker’},
{id:‘بناء وترميم’,icon:‘🏗️’,type:‘worker’},
{id:‘جبس وديكور’,icon:‘🏛️’,type:‘worker’},
{id:‘حديد وألمنيوم’,icon:‘🔩’,type:‘worker’},
{id:‘نجارة’,icon:‘🪵’,type:‘worker’},
{id:‘محل مواد بناء’,icon:‘🏪’,type:‘store’},
{id:‘هندسة مدنية’,icon:‘📐’,type:‘engineer’},
{id:‘مقاولات’,icon:‘🏢’,type:‘contractor’},
];

let professionals=[
{id:1,name:‘أبو محمد البلاط’,type:‘worker’,spec:‘بلاط وسيراميك’,desc:‘متخصص في تركيب البلاط والسيراميك لأكثر من 12 سنة.’,area:‘درعا البلد’,exp:‘10-15 سنة’,phone:‘0912345678’,wa:‘0912345678’,avail:true,verified:true,mine:false,avatar:null,photos:[],
reviews:[{author:‘أحمد خليل’,stars:5,text:‘شغل ممتاز ونظيف’,date:‘قبل ٣ أيام’},{author:‘محمد’,stars:4,text:‘معلم شاطر’,date:‘قبل أسبوع’}]},
{id:2,name:‘أستاذ خالد الدهان’,type:‘worker’,spec:‘دهان وديكور’,desc:‘دهان داخلي وخارجي وورق حائط.’,area:‘المزيريب’,exp:‘5-10 سنوات’,phone:‘0923456789’,wa:‘0923456789’,avail:true,verified:true,mine:false,avatar:null,photos:[],
reviews:[{author:‘سامر’,stars:5,text:‘أحسن دهان بالمنطقة’,date:‘قبل يومين’}]},
{id:3,name:‘معلم سامر الكهربائي’,type:‘worker’,spec:‘كهرباء’,desc:‘كهرباء منازل وتجاري وصيانة شاملة.’,area:‘نوى’,exp:‘10-15 سنة’,phone:‘0934567890’,wa:’’,avail:false,verified:true,mine:false,avatar:null,photos:[],
reviews:[{author:‘خالد’,stars:5,text:‘سريع وأمين’,date:‘قبل ٥ أيام’}]},
{id:4,name:‘أبو حسن الصحي’,type:‘worker’,spec:‘صحي وسباكة’,desc:‘سباكة وصحي وتركيب حمامات.’,area:‘درعا البلد’,exp:‘5-10 سنوات’,phone:‘0945678901’,wa:‘0945678901’,avail:true,verified:false,mine:false,avatar:null,photos:[],reviews:[]},
{id:5,name:‘مواد البناء الوطني’,type:‘store’,spec:‘محل مواد بناء’,desc:‘جميع مواد البناء مع توصيل مجاني.’,area:‘شارع الثورة’,exp:‘أكثر من 15 سنة’,phone:‘0956789012’,wa:‘0956789012’,avail:true,verified:true,mine:false,avatar:null,photos:[],
reviews:[{author:‘عميل’,stars:4,text:‘أسعار معقولة’,date:‘قبل ٣ أيام’}]},
{id:6,name:‘م. أحمد الحايك’,type:‘engineer’,spec:‘هندسة مدنية’,desc:‘تصميم منازل وإشراف هندسي.’,area:‘درعا’,exp:‘أكثر من 15 سنة’,phone:‘0967890123’,wa:‘0967890123’,avail:true,verified:true,mine:false,avatar:null,photos:[],
reviews:[{author:‘أبو سامر’,stars:5,text:‘مهندس محترف’,date:‘قبل أسبوعين’}]},
];

let curUser = null, curSpec = ‘’;

// ══ التنقل ══
function showPage(id) {
document.querySelectorAll(’.page’).forEach(p => p.classList.remove(‘active’));
document.querySelectorAll(’.nb’).forEach(n => n.classList.remove(‘on’));
document.getElementById(id).classList.add(‘active’);
const map = {‘pg-home’:‘nb-home’,‘pg-search’:‘nb-search’,‘pg-add’:‘nb-add’,‘pg-chat’:‘nb-chat’,‘pg-profile’:‘nb-profile’};
if (map[id]) document.getElementById(map[id]).classList.add(‘on’);
if (id === ‘pg-add’) checkAddPage();
if (id === ‘pg-admin’) renderAdmin();
}

// ══ إظهار إخفاء كلمة المرور ══
function togglePass(id, btn) {
const el = document.getElementById(id);
el.type = el.type === ‘password’ ? ‘text’ : ‘password’;
btn.textContent = el.type === ‘password’ ? ‘👁’ : ‘🙈’;
}

// ══ التبديل بين نماذج التسجيل ══
function showSection(id) {
[‘login-form’,‘forgot-form’,‘register-form’].forEach(s => {
const el = document.getElementById(s);
if (el) el.style.display = s === id ? ‘’ : ‘none’;
});
}

// ══ تهيئة المحافظات ══
function initCities() {
const cities = Object.keys(SYRIA);
[‘city-filter’,‘br-city’,‘add-city’].forEach(selId => {
const sel = document.getElementById(selId);
if (!sel) return;
cities.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
});
}

function onCityChange() {
const city = document.getElementById(‘city-filter’).value;
const vSel = document.getElementById(‘village-filter’);
vSel.innerHTML = ‘<option value="">كل القرى</option>’;
if (city && SYRIA[city]) {
SYRIA[city].forEach(v => vSel.innerHTML += `<option value="${v}">${v}</option>`);
vSel.style.display = ‘’;
} else { vSel.style.display = ‘none’; }
renderPros();
}

function onBrCityChange() {
const city = document.getElementById(‘br-city’).value;
const vSel = document.getElementById(‘br-village’);
vSel.innerHTML = ‘<option value="">كل القرى</option>’;
if (city && SYRIA[city]) {
SYRIA[city].forEach(v => vSel.innerHTML += `<option value="${v}">${v}</option>`);
vSel.style.display = ‘’;
} else { vSel.style.display = ‘none’; }
renderBrowse();
}

function onAddCityChange() {
const city = document.getElementById(‘add-city’).value;
const vSel = document.getElementById(‘add-village’);
vSel.innerHTML = ‘<option value="">اختر القرية</option>’;
if (city && SYRIA[city]) {
SYRIA[city].forEach(v => vSel.innerHTML += `<option value="${v}">${v}</option>`);
vSel.style.display = ‘’;
} else { vSel.style.display = ‘none’; }
}

// ══ تهيئة شرائح التخصص ══
function initChips() {
const chips = document.getElementById(‘spec-chips’);
specialties.forEach(s => {
chips.innerHTML += `<div class="spec-chip" onclick="setSpec('${s.id}',this)">${s.icon} ${s.id}</div>`;
});
const brSpec = document.getElementById(‘br-spec’);
specialties.forEach(s => brSpec.innerHTML += `<option value="${s.id}">${s.icon} ${s.id}</option>`);
}

function setSpec(v, el) {
curSpec = v;
document.querySelectorAll(’.spec-chip’).forEach(c => c.classList.remove(‘on’));
el.classList.add(‘on’);
renderPros();
}

// ══ عرض المعلمين ══
function renderPros() {
const search = document.getElementById(‘main-search’)?.value || ‘’;
const city = document.getElementById(‘city-filter’)?.value || ‘’;
const village = document.getElementById(‘village-filter’)?.value || ‘’;
const list = professionals.filter(p => {
const s1 = !curSpec || p.spec === curSpec;
// بحث برقم OMR أو اسم أو تخصص أو منطقة
const s2 = !search ||
p.name?.includes(search) ||
p.spec?.includes(search) ||
p.area?.includes(search) ||
p.userId?.toLowerCase().includes(search.toLowerCase()) ||
p.phone?.includes(search);
const s3 = !city || p.area?.includes(city) || p.city?.includes(city);
const s4 = !village || p.area?.includes(village) || p.village?.includes(village);
return s1 && s2 && s3 && s4;
});
const el = document.getElementById(‘pros-list’);
el.innerHTML = list.length ? list.map(proCard).join(’’) : ‘<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">لا نتائج</div></div>’;
}

function renderBrowse() {
const spec = document.getElementById(‘br-spec’)?.value || ‘’;
const city = document.getElementById(‘br-city’)?.value || ‘’;
const village = document.getElementById(‘br-village’)?.value || ‘’;
const list = professionals.filter(p => {
const s1 = !spec || p.spec === spec;
const area = p.area||p.city||’’;
const s2 = !city || area.includes(city) || (p.city||’’).includes(city);
const s3 = !village || area.includes(village) || (p.village||’’).includes(village);
return s1 && s2 && s3;
});
const el = document.getElementById(‘browse-list’);
el.innerHTML = list.length ? list.map(proCard).join(’’) : ‘<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">لا نتائج</div></div>’;
}

function proCard(p){
const bg=TBG[p.type]||’#f1f5f9’,tc=TCL[p.type]||’#475569’,em=TEM[p.type]||‘👤’;
const avg=avgRating(p),cnt=p.reviews?.length||0;
const avStyle=p.avatar?`background-image:url(${p.avatar});background-size:cover;background-position:center`:`background:${bg};color:${tc}`;
return `<div class="pc" onclick="openDetail(${p.id})"> <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px"> <div class="av" style="width:46px;height:46px;font-size:20px;${avStyle}">${p.avatar?'':em}</div> <div style="flex:1;min-width:0"> <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px"> <span style="font-weight:800;font-size:15px">${p.name}</span> ${p.verified?`<span class="verified-badge">✓ موثّق</span>`:''} ${p.avail?'<span class="badge b-green">متاح</span>':'<span class="badge b-red">مشغول</span>'} </div> <div style="font-size:13px;color:var(--text2)">${p.spec}</div> <div style="font-size:12px;color:var(--text3)">📍 ${p.area||[p.village,p.city].filter(Boolean).join(' - ')||''}</div> ${p.userCode?`<div style="font-size:11px;color:var(--blue);font-weight:700">#${p.userCode}</div>`:''} </div> <div style="text-align:left;flex-shrink:0"> ${avg?`<div style="display:flex;align-items:center;gap:3px"><span style="color:#f59e0b">★</span><span style="font-size:13px;font-weight:700">${avg.toFixed(1)}</span></div><div style="font-size:11px;color:var(--text3)">(${cnt})</div>`:`<div style="font-size:12px;color:var(--text3)">جديد</div>`} <div style="font-size:11px;color:var(--text3);margin-top:3px">${p.exp}</div> </div> </div> ${p.desc?`<p style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.desc}</p>`:''} ${p.photos?.length?`<div style="display:flex;gap:4px;margin-bottom:10px;overflow:hidden;border-radius:8px">${p.photos.slice(0,3).map(src=>`<img src="${src}" style="width:${100/Math.min(3,p.photos.length)}%;aspect-ratio:1;object-fit:cover">`).join(’’)}</div>`:''} <div style="display:flex;gap:8px"> <button class="btn-call btn-sm" style="flex:1" onclick="event.stopPropagation();location.href='tel:${p.phone}'">📞 اتصل</button> ${p.wa?`<a class="btn-wa btn-sm" style="flex:1" href="https://wa.me/963${p.wa.slice(1)}" onclick="event.stopPropagation()">واتساب</a>`:’’}
<button class="btn btn-primary btn-sm" style="flex:1;padding:9px" onclick="event.stopPropagation();openChatWith(${p.id})">💬</button>
</div>

  </div>`;
}

/* ══════════ HOME / BROWSE ══════════ */

// ══ تفاصيل المهني ══
let selectedStars = 0;
function openDetail(id) {
const p = professionals.find(x => String(x.id) === String(id));
if (!p) return;
const avg = p.reviews?.length ? (p.reviews.reduce((s,r)=>s+r.stars,0)/p.reviews.length).toFixed(1) : null;
document.getElementById(‘detail-header’).innerHTML = `<div style="display:flex;align-items:center;gap:14px"> <div class="av" style="width:64px;height:64px;font-size:1.8rem;background:rgba(255,255,255,.2);color:#fff">${p.name[0]}</div> <div style="flex:1"> <div style="font-size:1.2rem;font-weight:800;color:#fff">${p.name} ${p.verified?'<span style="font-size:0.7rem;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:20px">✓ موثّق</span>':''}</div> <div style="color:rgba(255,255,255,.8);font-size:0.85rem;margin-top:3px">${p.spec} • 📍 ${p.area||[p.village,p.city].filter(Boolean).join(' - ')||''}</div> <span class="badge ${p.avail?'b-green':'b-red'}" style="margin-top:6px;display:inline-flex">${p.avail?'● متاح':'● مشغول'}</span> </div> </div>`;
renderDetailBody(p);
showPage(‘pg-detail’);
}

function renderDetailBody(p) {
const avg = p.reviews?.length ? (p.reviews.reduce((s,r)=>s+r.stars,0)/p.reviews.length).toFixed(1) : null;
const reviewsHtml = p.reviews?.length ? p.reviews.map((r,i) => `<div class="rev-card"> <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"> <span style="font-weight:700;font-size:14px">${r.author}</span> <div style="display:flex;gap:6px"> ${curUser ?`<button onclick="editReview('${p.id}',${i})" style="background:var(--blue-lt);color:var(--blue);border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">تعديل</button>
<button onclick="deleteReview('${p.id}',${i})" style="background:#fee2e2;color:var(--red);border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">حذف</button>`: ''} </div> </div> <div class="stars">${'★'.repeat(r.stars)}</div> <p style="font-size:14px;margin-top:6px;color:var(--text2)">${r.text}</p> <p style="font-size:11px;color:var(--text3);margin-top:4px">${r.date}</p> </div>`).join(’’) : ‘<p style="color:var(--text3);text-align:center;padding:16px">لا تقييمات بعد</p>’;

document.getElementById(‘detail-body’).innerHTML = `<div style="display:flex;gap:8px;margin-bottom:16px"> <a href="tel:${p.phone}" class="btn-call" style="flex:1"><i class="fa-solid fa-phone"></i> اتصال</a> ${p.wa ?`<a href="https://wa.me/963${p.wa.slice(1)}" class="btn-wa" style="flex:1"><i class="fa-brands fa-whatsapp"></i> واتساب</a>`: ''} </div> ${p.desc ?`<div class="card"><div class="st" style="margin-bottom:8px">عن المعلم</div><p style="font-size:14px;color:var(--text2);line-height:1.6">${p.desc}</p></div>`: ''} <div class="card"> <div class="st" style="margin-bottom:12px">التقييمات ${avg ?`<span style="color:var(--amber)">★ ${avg}</span>`: ''}</div> ${reviewsHtml} </div> ${curUser ?`
<div class="card">
<div class="st" style="margin-bottom:12px">أضف تقييمك</div>
<div style="display:flex;gap:6px;margin-bottom:10px" id="star-row">
${[1,2,3,4,5].map(s=>`<span onclick="setStar(${s})" style="font-size:1.6rem;cursor:pointer;color:var(--gray3)" data-s="${s}">★</span>`).join(’’)}
</div>
<textarea class="fi" id="review-text" placeholder="اكتب تقييمك..."></textarea>
<button class="btn btn-primary" onclick="submitReview('${p.id}')">إرسال التقييم</button>
</div>`: '<p style="text-align:center;color:var(--text3);font-size:14px;padding:10px">سجّل دخول لإضافة تقييم</p>'}`;
}

function setStar(n) {
selectedStars = n;
document.querySelectorAll(’[data-s]’).forEach(s => s.style.color = parseInt(s.dataset.s) <= n ? ‘#f59e0b’ : ‘var(–gray3)’);
}

function submitReview(proId) {
if (!selectedStars) { alert(‘اختر عدد النجوم’); return; }
const text = document.getElementById(‘review-text’).value.trim();
if (!text) { alert(‘اكتب تقييمك’); return; }
const p = professionals.find(x => String(x.id) === String(proId));
if (!p) return;
p.reviews.push({ author: curUser.name, stars: selectedStars, text, date: ‘الآن’ });
selectedStars = 0;
renderDetailBody(p);
fetch(`${API}/pros/${proId}/review`, {
method:‘POST’, headers:{‘Content-Type’:‘application/json’,‘x-auth-token’:localStorage.getItem(‘token’)||’’},
body: JSON.stringify({ rating: selectedStars, comment: text })
}).catch(()=>{});
}

function deleteReview(proId, idx) {
if (!confirm(‘حذف التعليق؟’)) return;
const p = professionals.find(x => String(x.id) === String(proId));
if (!p || !p.reviews[idx]) return;
p.reviews.splice(idx, 1);
renderDetailBody(p);
}

function editReview(proId, idx) {
const p = professionals.find(x => String(x.id) === String(proId));
if (!p || !p.reviews[idx]) return;
const newText = prompt(‘تعديل التعليق:’, p.reviews[idx].text);
if (newText?.trim()) { p.reviews[idx].text = newText.trim(); renderDetailBody(p); }
}

// ══ Auth ══
async function doLogin() {
const id = document.getElementById(‘log-id’).value.trim();
const pass = document.getElementById(‘log-pass’).value;
if (!id || !pass) { alert(‘أدخل البيانات’); return; }
// أدمن محلي
if (id === ‘0900000000’ && pass === ‘admin123’) {
curUser = { name:‘الأدمن’, type:‘admin’, phone:‘0900000000’ };
onLogin(); return;
}
const btn = document.getElementById(‘btn-login’);
btn.classList.add(‘btn-loading’);
try {
// يرسل كهاتف وإيميل معاً — السيرفر يتحقق من الاثنين
const body = { id, phone: id, email: id, password: pass };
const res = await fetch(`${API}/auth/login`, {
method:‘POST’, headers:{‘Content-Type’:‘application/json’},
body: JSON.stringify(body)
});
const data = await res.json();
const u = data.user;
if ((res.ok && data.success) || (res.ok && u)) {
localStorage.setItem(‘token’, u._id || ‘’);
localStorage.setItem(‘userName’, u.name);
localStorage.setItem(‘userType’, u.role || ‘client’);
curUser = { id:u._id, name:u.name, type:u.role||‘client’, phone:u.phone, email:u.email };
onLogin();
} else { alert(data.message || ‘بيانات خاطئة’); }
} catch(e) { alert(‘تعذر الاتصال بالسيرفر’); }
btn.classList.remove(‘btn-loading’);
}

async function doRegister() {
const name = document.getElementById(‘reg-name’).value.trim();
const phone = document.getElementById(‘reg-phone’).value.trim();
const email = document.getElementById(‘reg-email’).value.trim();
const pass = document.getElementById(‘reg-pass’).value;
const type = document.getElementById(‘reg-type’).value;
if (!name||!phone||!pass) { alert(‘أكمل البيانات’); return; }
const btn = document.getElementById(‘btn-register’);
btn.classList.add(‘btn-loading’);
try {
const res = await fetch(`${API}/auth/register`, {
method:‘POST’, headers:{‘Content-Type’:‘application/json’},
body: JSON.stringify({ name, phone, email, password: pass, role: type, spec: ‘’, city: ‘’, village: ‘’ })
});
const data = await res.json();
if (res.ok && data.success) {
alert(’✅ تم إنشاء حسابك\nرقمك: ’ + data.userId + ‘\nسجّل دخول الآن’);
showSection(‘login-form’);
} else { alert(data.error || data.message || ‘خطأ في التسجيل’); }
} catch(e) { alert(‘تعذر الاتصال’); }
btn.classList.remove(‘btn-loading’);
}

async function resetPassword() {
const phone = document.getElementById(‘forgot-phone’).value.trim();
const newPass = document.getElementById(‘forgot-newpass’).value;
const confirm = document.getElementById(‘forgot-confirm’).value;
if (!phone) { alert(‘أدخل رقم الهاتف’); return; }
if (newPass.length < 6) { alert(‘كلمة المرور قصيرة’); return; }
if (newPass !== confirm) { alert(‘كلمتا المرور غير متطابقتين’); return; }
const btn = document.getElementById(‘btn-forgot’);
btn.classList.add(‘btn-loading’);
try {
const res = await fetch(`${API}/auth/reset-password`, {
method:‘POST’, headers:{‘Content-Type’:‘application/json’},
body: JSON.stringify({ phone, newPass })
});
const data = await res.json();
if (res.ok) { alert(‘✅ تم تعيين كلمة المرور’); showSection(‘login-form’); }
else { alert(data.message || ‘رقم الهاتف غير موجود’); }
} catch(e) { alert(‘تعذر الاتصال’); }
btn.classList.remove(‘btn-loading’);
}

async function changePassword() {
const oldPass = document.getElementById(‘old-pass’).value;
const newPass = document.getElementById(‘new-pass’).value;
const confirm = document.getElementById(‘confirm-pass’).value;
if (!oldPass||!newPass) { alert(‘أكمل الحقول’); return; }
if (newPass.length < 6) { alert(‘كلمة المرور قصيرة’); return; }
if (newPass !== confirm) { alert(‘كلمتا المرور غير متطابقتين’); return; }
try {
const res = await fetch(`${API}/auth/change-password`, {
method:‘PUT’, headers:{‘Content-Type’:‘application/json’,‘x-auth-token’:localStorage.getItem(‘token’)||’’},
body: JSON.stringify({ oldPass, newPass })
});
const data = await res.json();
if (res.ok) {
alert(‘✅ تم تغيير كلمة المرور’);
[‘old-pass’,‘new-pass’,‘confirm-pass’].forEach(id => document.getElementById(id).value=’’);
} else { alert(data.message || ‘كلمة المرور القديمة خاطئة’); }
} catch(e) { alert(‘تعذر الاتصال’); }
}

function onLogin() {
document.getElementById(‘auth-section’).style.display = ‘none’;
document.getElementById(‘user-section’).style.display = ‘’;
document.getElementById(‘profile-name’).textContent = curUser.name;
const types = {client:‘عميل’,worker:‘معلم حرفي’,store:‘محل مواد بناء’,engineer:‘مهندس’,contractor:‘متعهد’,admin:‘أدمن’};
document.getElementById(‘profile-type’).textContent = types[curUser.type] || curUser.type;
if (curUser.type === ‘admin’) document.getElementById(‘admin-btn’).style.display = ‘’;
const av = document.getElementById(‘profile-av’);
const savedAvatar = localStorage.getItem(‘userAvatar’);
if (savedAvatar) { av.innerHTML = `<img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
else { av.textContent = curUser.name[0]; }
renderMyPhotos();
}

function doLogout() {
curUser = null;
localStorage.removeItem(‘token’);
document.getElementById(‘auth-section’).style.display = ‘’;
document.getElementById(‘user-section’).style.display = ‘none’;
document.getElementById(‘admin-btn’).style.display = ‘none’;
showSection(‘login-form’);
showPage(‘pg-home’);
}

// ══ الصورة الشخصية ══
function onAvatarChange(input) {
const file = input.files[0]; if (!file) return;
if (file.size > 2*1024*1024) { alert(‘الصورة كبيرة — الحد 2MB’); return; }
const reader = new FileReader();
reader.onload = e => {
const src = e.target.result;
document.getElementById(‘profile-av’).innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
localStorage.setItem(‘userAvatar’, src);
};
reader.readAsDataURL(file);
}

// ══ صور الأعمال ══
let myWorkPhotos = JSON.parse(localStorage.getItem(‘myWorkPhotos’)||’[]’);

function renderMyPhotos() {
const grid = document.getElementById(‘my-photos-grid’);
const count = document.getElementById(‘photos-count’);
if (!grid) return;
count.textContent = `${myWorkPhotos.length}/50`;
grid.innerHTML = myWorkPhotos.map((src,i) => `<div style="position:relative"> <img src="${src}" class="photo-thumb"> <button onclick="deletePhoto(${i})" style="position:absolute;top:2px;right:2px;background:rgba(239,68,68,.85);color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">✕</button> </div>`).join(’’);
}

function onPhotosChange(input) {
const files = Array.from(input.files);
const rem = 50 - myWorkPhotos.length;
if (files.length > rem) { alert(`يمكنك إضافة ${rem} صورة فقط`); return; }
files.forEach(f => {
const reader = new FileReader();
reader.onload = e => {
myWorkPhotos.push(e.target.result);
localStorage.setItem(‘myWorkPhotos’, JSON.stringify(myWorkPhotos));
renderMyPhotos();
};
reader.readAsDataURL(f);
});
input.value = ‘’;
}

function deletePhoto(idx) {
if (!confirm(‘حذف الصورة؟’)) return;
myWorkPhotos.splice(idx, 1);
localStorage.setItem(‘myWorkPhotos’, JSON.stringify(myWorkPhotos));
renderMyPhotos();
}

// ══ إضافة مهني ══
function checkAddPage() {
const af = document.getElementById(‘add-form’);
const lm = document.getElementById(‘add-login-msg’);
if (curUser) { af.style.display=’’; lm.style.display=‘none’; }
else { af.style.display=‘none’; lm.style.display=’’; }
}

async function submitPro() {
const name = document.getElementById(‘add-name’).value.trim();
const spec = document.getElementById(‘add-spec’).value;
const city = document.getElementById(‘add-city’).value;
const village = document.getElementById(‘add-village’).value;
const phone = document.getElementById(‘add-phone’).value.trim();
const wa = document.getElementById(‘add-wa’).value.trim();
const desc = document.getElementById(‘add-desc’).value.trim();
const exp = document.getElementById(‘add-exp’).value;
if (!name||!phone||!city) { alert(‘أكمل البيانات المطلوبة’); return; }
const area = village || city;
const newPro = { id:Date.now(), name, spec, area, phone, wa, desc, exp, type:curUser?.type||‘worker’, avail:true, verified:false, reviews:[] };
professionals.unshift(newPro);
const btn = document.getElementById(‘btn-add’);
btn.classList.add(‘btn-loading’);
try {
await fetch(`${API}/pros/add`, {
method:‘POST’, headers:{‘Content-Type’:‘application/json’,‘x-auth-token’:localStorage.getItem(‘token’)||’’},
body: JSON.stringify({ name, spec, area, phone, wa, desc, exp, type:curUser?.type||‘worker’ })
});
} catch(e) {}
btn.classList.remove(‘btn-loading’);
alert(‘✅ تم نشر ملفك المهني’);
showPage(‘pg-home’);
}

// ══ لوحة الأدمن ══
function renderAdmin() {
document.getElementById(‘admin-list’).innerHTML = professionals.map(p => `<div class="admin-row"> <div style="flex:1"> <div style="font-weight:700">${p.name}</div> <div style="font-size:12px;color:var(--text3)">${p.spec} • ${p.area||[p.village,p.city].filter(Boolean).join(' - ')||''}</div> <div style="margin-top:4px;display:flex;gap:5px"> ${p.verified?'<span class="badge b-blue">✓ موثّق</span>':''} ${p.isFeatured?'<span class="badge b-amber">⭐ مميز</span>':''} </div> </div> <div style="display:flex;gap:6px"> <button onclick="adminVerify('${p.id}')" style="background:var(--blue-lt);color:var(--blue);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">${p.verified?'إلغاء التوثيق':'توثيق'}</button> <button onclick="adminFeature('${p.id}')" style="background:#fef3c7;color:#92400e;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">${p.isFeatured?'إلغاء التميز':'تمييز'}</button> </div> </div>`).join(’’);
}

async function adminVerify(id) {
const p = professionals.find(x => String(x.id)===String(id));
if (!p) return;
p.verified = !p.verified;
renderAdmin();
fetch(`${API}/pros/admin/verify-pro/${id}`, {method:‘PUT’,headers:{‘x-auth-token’:localStorage.getItem(‘token’)||’’}}).catch(()=>{});
}

async function adminFeature(id) {
const p = professionals.find(x => String(x.id)===String(id));
if (!p) return;
p.isFeatured = !p.isFeatured;
renderAdmin();
fetch(`${API}/pros/admin/feature-pro/${id}`, {method:‘PUT’,headers:{‘Content-Type’:‘application/json’,‘x-auth-token’:localStorage.getItem(‘token’)||’’},body:JSON.stringify({isFeatured:p.isFeatured})}).catch(()=>{});
}

// ══ جلب من السيرفر ══
async function loadFromServer() {
try {
const res = await fetch(`${API}/pros`);
const data = await res.json();
if (Array.isArray(data) && data.length) {
data.forEach(p => {
if (!professionals.find(x => x.phone === p.phone)) {
professionals.unshift({
id:p._id||p.id,
name:p.name,
spec:p.spec,
type:p.role||p.type||‘worker’,
area:[p.village,p.city].filter(Boolean).join(’ - ‘)||p.area||’’,
city:p.city||’’,
village:p.village||’’,
phone:p.phone,
wa:p.wa||p.phone,
exp:p.experience||p.exp||’’,
desc:p.description||p.desc||’’,
avail:!p.isBusy,
verified:p.verified||false,
isFeatured:p.isFeatured||false,
userId:p.userId||’’,
reviews:[]
});
}
});
renderPros();
}
} catch(e) { console.log(‘offline’); }
}

// ══ استعادة الجلسة ══
function restoreSession() {
const token = localStorage.getItem(‘token’);
const name = localStorage.getItem(‘userName’);
const type = localStorage.getItem(‘userType’);
if (token && name) {
curUser = { name, type: type||‘client’ };
onLogin();
}
}

// ══ INIT ══
initCities();
initChips();
renderPros();
loadFromServer().then(() => initAdBar());
restoreSession();
