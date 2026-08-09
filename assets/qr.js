/* shrtn.link — generazione QR lato client.
   Usato sia dalle pagine /[slug]/qr/ generate da build.js, sia da 404.html
   quando lavora in modalità fallback (Pages servito direttamente dal branch,
   senza pagine pre-generate).

   La libreria è ospitata qui, non su un CDN: i QR servono per materiali
   stampati e vengono spesso rigenerati a un evento, dove la rete è inaffidabile
   e un CDN irraggiungibile significherebbe pagina rotta. Self-hosting elimina
   anche l'unica dipendenza runtime di terze parti del sito.

   assets/qrcode.min.js è qrcode@1.5.1 (build/qrcode.min.js), l'ultima versione
   che pubblica un bundle browser: dalla 1.5.2 il pacchetto npm contiene solo
   moduli CommonJS. Espone il globale QRCode con toCanvas/toDataURL.
   Caricata su richiesta, così la homepage non la scarica mai. */

(function (global) {
  'use strict';

  var LIB_URL = '/assets/qrcode.min.js';
  var libPromise = null;

  function loadLib() {
    if (global.QRCode && typeof global.QRCode.toCanvas === 'function') {
      return Promise.resolve(global.QRCode);
    }
    if (libPromise) return libPromise;

    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = LIB_URL;
      s.async = true;
      s.onload = function () {
        if (global.QRCode && typeof global.QRCode.toCanvas === 'function') resolve(global.QRCode);
        else reject(new Error('Libreria QR caricata ma non utilizzabile.'));
      };
      s.onerror = function () {
        reject(new Error('Impossibile caricare la libreria QR. Ricarica la pagina.'));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function downloadCanvas(canvas, filename) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvas  canvas di destinazione
   * @param {string} opts.text               contenuto codificato nel QR
   * @param {string} [opts.filename]         nome del PNG scaricato
   * @param {HTMLElement} [opts.status]      elemento per messaggi di errore
   * @param {HTMLButtonElement} [opts.button] bottone "Download QR"
   */
  function render(opts) {
    var canvas = opts.canvas;
    var status = opts.status;
    var button = opts.button;
    var filename = opts.filename || 'qr.png';

    return loadLib()
      .then(function (QRCode) {
        return new Promise(function (resolve, reject) {
          QRCode.toCanvas(canvas, opts.text, {
            width: 1024,           // risoluzione alta: utilizzabile in stampa
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000ff', light: '#ffffffff' }
          }, function (err) {
            if (err) reject(err); else resolve();
          });
        });
      })
      .then(function () {
        canvas.hidden = false;
        if (status) status.hidden = true;
        if (button) {
          button.disabled = false;
          button.addEventListener('click', function () {
            downloadCanvas(canvas, filename);
          });
        }
      })
      .catch(function (err) {
        if (status) {
          status.hidden = false;
          status.textContent = err && err.message ? err.message : 'Errore nella generazione del QR.';
        }
        if (button) button.disabled = true;
      });
  }

  global.shrtnQr = { render: render, load: loadLib };
})(window);
