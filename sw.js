const CACHE = 'omran-v2';
const STATIC = ['/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(()=>{})
  );
  // تفعيل فوري بدون انتظار
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // حذف كل الكاش القديم فوراً
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — دايماً من النت
  if(url.pathname.startsWith('/api')){
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({error:'لا يوجد اتصال'}),
          {status:503, headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }

  // index.html — Network First (يجيب الجديد دايماً)
  if(url.pathname === '/' || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // باقي الملفات — Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok){
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
