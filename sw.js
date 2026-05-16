const CACHE = 'omran-v65';
const STATIC = ['/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — دايماً من النت بدون cache
  if(url.pathname.startsWith('/api')){
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({error:'لا يوجد اتصال'}),
          {status:503, headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }

  // index.html — Network First
  if(url.pathname === '/' || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if(res && res.status === 200){
            const toCache = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, toCache));
          }
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
      return fetch(e.request.clone()).then(res => {
        if(res && res.ok){
          const toCache = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
