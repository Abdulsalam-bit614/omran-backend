const CACHE = 'omran-v1';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// تثبيت — كاش الملفات الأساسية
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(()=>{})
  );
  self.skipWaiting();
});

// تفعيل — حذف الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — استراتيجية Network First للـ API، Cache First للباقي
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — دايماً من النت، لو فشل يرجع خطأ
  if(url.pathname.startsWith('/api')){
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({error:'لا يوجد اتصال بالإنترنت'}),
          {status:503, headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }

  // باقي الملفات — Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
