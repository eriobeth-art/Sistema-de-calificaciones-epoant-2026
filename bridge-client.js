/*
 * EPOANT · Cliente RPC para GitHub Pages -> Apps Script.
 * Conserva la API google.script.run para no reescribir el sistema actual.
 */
(function(){
  'use strict';
  const cfg = window.EPOANT_WEB_CONFIG || {};
  if (!cfg.backendUrl || !/^https:\/\/script\.google\.com\/macros\/s\//.test(cfg.backendUrl)) {
    console.error('EPOANT: backendUrl no configurado.');
  }

  const channel = 'epoant-cal-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const pending = new Map();
  let ready = false;
  let seq = 0;
  let readyResolve;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });

  const iframe = document.createElement('iframe');
  iframe.id = 'epoantGasBridge';
  iframe.title = 'Conexión segura EPOANT';
  iframe.setAttribute('aria-hidden','true');
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px;top:-9999px';
  iframe.src = cfg.backendUrl + (cfg.backendUrl.includes('?') ? '&' : '?') + 'bridge=1&channel=' + encodeURIComponent(channel) + '&v=' + encodeURIComponent(cfg.version || '');
  document.documentElement.appendChild(iframe);


  const helloTimer = setInterval(function(){
    if (ready) { clearInterval(helloTimer); return; }
    try { iframe.contentWindow.postMessage({type:'EPOANT_BRIDGE_HELLO',channel:channel}, '*'); } catch(e) {}
  }, 500);
  setTimeout(function(){ try { iframe.contentWindow.postMessage({type:'EPOANT_BRIDGE_HELLO',channel:channel}, '*'); } catch(e) {} }, 800);

  window.addEventListener('message', function(event){
    if (event.source !== iframe.contentWindow) return;
    const msg = event.data || {};
    if (msg.channel !== channel) return;

    if (msg.type === 'EPOANT_BRIDGE_READY') {
      ready = true;
      readyResolve(true);
      window.dispatchEvent(new CustomEvent('epoant-backend-ready', {detail:msg}));
      return;
    }

    if (msg.type !== 'EPOANT_GAS_RESULT' || !msg.id) return;
    const job = pending.get(msg.id);
    if (!job) return;
    pending.delete(msg.id);
    clearTimeout(job.timer);
    if (msg.ok) job.resolve(msg.result);
    else {
      const err = new Error(msg.error && msg.error.message ? msg.error.message : 'Error del servidor.');
      if (msg.error && msg.error.stack) err.stack = msg.error.stack;
      job.reject(err);
    }
  });

  function call(method, args){
    return readyPromise.then(function(){
      return new Promise(function(resolve,reject){
        const id = channel + '-' + (++seq);
        const timer = setTimeout(function(){
          pending.delete(id);
          reject(new Error('El servidor tardó demasiado en responder. Verifica tu conexión e inténtalo de nuevo.'));
        }, Number(cfg.rpcTimeoutMs || 180000));
        pending.set(id,{resolve,reject,timer});
        iframe.contentWindow.postMessage({
          type:'EPOANT_GAS_CALL',
          channel:channel,
          id:id,
          method:String(method||''),
          args:Array.isArray(args)?args:[]
        }, '*');
      });
    });
  }

  function makeRunner(){
    let success = function(){};
    let failure = function(err){ console.error(err); };
    const target = {
      withSuccessHandler:function(fn){ if(typeof fn==='function') success=fn; return proxy; },
      withFailureHandler:function(fn){ if(typeof fn==='function') failure=fn; return proxy; }
    };
    const proxy = new Proxy(target, {
      get:function(obj, prop){
        if (prop in obj) return obj[prop];
        if (prop === 'then') return undefined;
        return function(){
          const args = Array.prototype.slice.call(arguments);
          call(String(prop), args).then(success).catch(failure);
          return proxy;
        };
      }
    });
    return proxy;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    configurable:true,
    get:function(){ return makeRunner(); }
  });

  window.EPOANT_BRIDGE = Object.freeze({call:call, ready:function(){return readyPromise;}, isReady:function(){return ready;}});
})();
