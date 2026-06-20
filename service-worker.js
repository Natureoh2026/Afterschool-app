/* After-School service worker
   - 앱 셸(아래 APP_SHELL)을 미리 캐시해서 인터넷 없이도 첫 화면이 열리게 함
   - Google Fonts 등 외부 리소스는 처음 받아올 때 캐시에 저장(다음부턴 오프라인 가능)
   - 버전을 올리면(CACHE 이름 변경) 옛 캐시는 자동 삭제됨 */

const CACHE = "afterschool-v1";

// 같은 폴더에 함께 올려야 하는 파일들
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

// 설치: 앱 셸 미리 캐시
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// 활성화: 이전 버전 캐시 정리
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;

  // GET 요청만 처리
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) 페이지 이동(HTML 문서): 네트워크 우선, 실패하면 캐시된 index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // 2) 같은 폴더의 정적 파일(아이콘 등): 캐시 우선
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return cached; });
      })
    );
    return;
  }

  // 3) 외부 리소스(Google Fonts 등): 캐시에 있으면 쓰고, 없으면 받아와서 캐시(stale-while-revalidate)
  event.respondWith(
    caches.match(req).then(function (cached) {
      const network = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
