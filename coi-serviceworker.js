/*! coi-serviceworker v0.1.7 - Guido Zuidhof, MIT License */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener("message", (ev) => {
        if (!ev.data) return;
        if (ev.data.type === "deregister") {
            self.registration.unregister().then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)));
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });
    self.addEventListener("fetch", function(event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;
        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, { credentials: "omit" }) : r;
        event.respondWith(
            fetch(request).then((response) => {
                if (response.status === 0) return response;
                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy",
                    coepCredentialless ? "credentialless" : "require-corp");
                if (!coepCredentialless) {
                    newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
                }
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }).catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = (reloadedBySelf == "coepdegrade");
        const coi = {
            shouldRegister: () => true,
            shouldDeregister: () => false,
            coepCredentialless: () => (window.chrome !== undefined || window.navigator.userAgent.indexOf('Firefox') !== -1),
            doReload: () => window.location.reload(),
            quiet: false,
            ...window.coi
        };
        const n = navigator;
        const controlling = n.serviceWorker && n.serviceWorker.controller;
        if (controlling && !window.crossOriginIsolated) {
            window.sessionStorage.setItem("coiCoepHasFailed", "true");
        }
        const coepHasFailed = window.sessionStorage.getItem("coiCoepHasFailed");
        if (controlling) {
            const reloader = () => {
                window.sessionStorage.setItem("coiReloadedBySelf", "true");
                coi.doReload();
            };
            if (!reloadedBySelf) { reloader(); return; }
        }
        if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;
        if (!window.isSecureContext) { console.log("COOP/COEP SW requires secure context"); return; }
        if (n.serviceWorker) {
            n.serviceWorker.register(window.document.currentScript.src).then(
                (registration) => {
                    console.log("COOP/COEP SW registered", registration.scope);
                    registration.addEventListener("updatefound", () => reloader());
                    if (registration.active && !n.serviceWorker.controller) reloader();
                },
                (err) => console.log("COOP/COEP SW failed:", err)
            );
        }
    })();
          }
