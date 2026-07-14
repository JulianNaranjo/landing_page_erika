/* =====================================================
   WHATSAPP CRO & ADS SIGNAL QUALITY
   Shared module for index.html, servicios.html, online.html,
   infantil.html, adultos.html.

   Responsibilities:
   - Capture gclid/wbraid/gbraid and persist across pages
     (sessionStorage) for offline conversion import.
   - Enrich every [data-wa-cta] href with a discreet
     "Ref: <id>" line, on load (covers middle-click / new tab).
   - Run the qualifying micro-step dialog for [data-wa-primary]
     CTAs (hero only) and push the `whatsapp_qualified_intent`
     dataLayer event before opening WhatsApp.
   - Inject the sticky mobile FAB (skipped on pages that
     already ship a persistent mobile CTA bar, see injectFab).

   Progressive enhancement: every CTA href in the static HTML
   is ALREADY a working wa.me/?text=<contextual copy> link.
   This script only ENRICHES it; it never blocks a click.
   ===================================================== */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "573003793080";
  var WHATSAPP_BASE_URL = "https://wa.me/" + WHATSAPP_NUMBER;
  var CLICK_ID_STORAGE_KEY = "wa_cro_click_id";
  var CLICK_ID_PARAM_PRIORITY = ["gclid", "wbraid", "gbraid"];

  /* Generic fallback copy for the injected FAB (same text used
     by the nav/footer CTAs across all 3 pages). */
  var FAB_BASE_TEXT = "Hola, quiero agendar una consulta.";

  /* Qualifying micro-step config, one entry per page slug.
     Page slug is read from <body data-page="...">. */
  var QUALIFIER_CONFIG = {
    index: {
      question: "¿Para quién es la consulta?",
      chips: [
        { label: "Para mi hijo/a" },
        { label: "Para mí" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
    servicios: {
      question: "¿Qué servicio buscas?",
      chips: [
        { label: "Evaluación neuropsicológica" },
        { label: "Diagnóstico de autismo" },
        { label: "Psicología / psicoterapia" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
    online: {
      question: "¿Qué tipo de consulta buscas?",
      chips: [
        { label: "Evaluación online" },
        { label: "Psicoterapia online" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
    infantil: {
      question: "¿Qué necesitas para tu hijo/a?",
      chips: [
        { label: "Evaluación neuropsicológica" },
        { label: "Dificultades escolares / atención" },
        { label: "Diagnóstico de autismo (TEA)" },
        { label: "Terapia infantil" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
    adultos: {
      question: "¿Qué buscas?",
      chips: [
        { label: "Evaluación de memoria / atención" },
        { label: "Psicoterapia individual" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
    "servicios-online": {
      question: "¿Qué tipo de consulta virtual buscas?",
      chips: [
        { label: "Evaluación online" },
        { label: "Psicoterapia online" },
        { label: "Asesoría en crianza" },
      ],
      skipLabel: "Prefiero escribir directo",
    },
  };

  var cachedClickId = null;
  var dialogEls = null; // { backdrop, dialog, closeBtn, chipsContainer, skipBtn }
  var activeCta = null;
  var lastFocusedElement = null;

  /* -----------------------------------------------------
     Click id capture (gclid > wbraid > gbraid), memoized
     and persisted to sessionStorage so it survives internal
     navigation between the 3 pages (index -> servicios -> online).
     ----------------------------------------------------- */
  function getClickId() {
    if (cachedClickId) return cachedClickId;

    var params = new URLSearchParams(window.location.search);
    for (var i = 0; i < CLICK_ID_PARAM_PRIORITY.length; i++) {
      var type = CLICK_ID_PARAM_PRIORITY[i];
      var id = params.get(type);
      if (id) {
        cachedClickId = { id: id, type: type };
        try {
          sessionStorage.setItem(CLICK_ID_STORAGE_KEY, JSON.stringify(cachedClickId));
        } catch (e) {
          /* sessionStorage unavailable (privacy mode, etc.) - degrade gracefully */
        }
        return cachedClickId;
      }
    }

    try {
      var stored = sessionStorage.getItem(CLICK_ID_STORAGE_KEY);
      if (stored) {
        cachedClickId = JSON.parse(stored);
        return cachedClickId;
      }
    } catch (e) {
      /* ignore */
    }

    cachedClickId = { id: null, type: "none" };
    return cachedClickId;
  }

  /* -----------------------------------------------------
     URL / text composition
     ----------------------------------------------------- */
  function decodeExistingText(href) {
    try {
      var url = new URL(href, window.location.href);
      return url.searchParams.get("text") || "";
    } catch (e) {
      return "";
    }
  }

  /* Composes the final wa.me URL. Order: contextual text,
     then qualifier answer label (if any). The click id is still
     captured and persisted for future conversion tracking, but is
     intentionally NOT surfaced in the visible message text (keeps
     the patient-facing copy clean under a maximize-clicks strategy).
     Exactly one encodeURIComponent pass over the joined text -
     never re-encodes an already encoded fragment. */
  function buildWhatsAppUrl(baseText, options) {
    options = options || {};
    var lines = [baseText];

    if (options.answerLabel) {
      lines.push(options.answerLabel);
    }

    var finalText = lines.join("\n");
    return WHATSAPP_BASE_URL + "?text=" + encodeURIComponent(finalText);
  }

  function getPageSlug() {
    return document.body.getAttribute("data-page") || "";
  }

  /* -----------------------------------------------------
     Hydration: rewrite every [data-wa-cta] href to append
     the Ref line. Runs at DOMContentLoaded, before the
     delegated click listener is attached, so even
     middle-click / "open in new tab" / "copy link" carry
     the click id. Also caches the raw (pre-Ref) contextual
     text on each element so the qualifying dialog can later
     recompose it (text + answer + Ref) without double-adding
     the Ref line already baked into the hydrated href.
     ----------------------------------------------------- */
  function hydrateStaticCtas(clickId) {
    var ctas = document.querySelectorAll("[data-wa-cta]");
    ctas.forEach(function (cta) {
      var baseText = decodeExistingText(cta.getAttribute("href"));
      if (!baseText) return;
      cta.dataset.waBaseText = baseText;
      cta.setAttribute("href", buildWhatsAppUrl(baseText, { clickId: clickId }));
    });
  }

  /* -----------------------------------------------------
     Sticky mobile FAB
     Skipped on pages that already ship a persistent mobile
     CTA bar (.sticky-cta-bar, e.g. online.html) to avoid two
     competing fixed-position WhatsApp entry points stacking
     at the bottom of the viewport on mobile.
     ----------------------------------------------------- */
  function injectFab() {
    if (document.querySelector(".sticky-cta-bar")) return;
    if (document.querySelector('[data-wa-cta="fab"]')) return;

    var fab = document.createElement("a");
    fab.className = "wa-fab";
    fab.setAttribute("data-wa-cta", "fab");
    fab.setAttribute("target", "_blank");
    fab.setAttribute("rel", "noopener noreferrer");
    fab.setAttribute("aria-label", "Escríbenos por WhatsApp");
    fab.setAttribute("href", WHATSAPP_BASE_URL + "?text=" + encodeURIComponent(FAB_BASE_TEXT));
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
      "</svg>";

    document.body.appendChild(fab);
  }

  /* -----------------------------------------------------
     Qualifying micro-step dialog (accessible modal)
     Injected once per page load, built from the active
     page's qualifier config. Mirrors .blog-modal styling.
     ----------------------------------------------------- */
  function getFocusable(container) {
    var nodes = container.querySelectorAll("button");
    return Array.prototype.slice.call(nodes).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function trapFocus(e) {
    if (!dialogEls) return;
    var focusable = getFocusable(dialogEls.dialog);
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKeydown(e) {
    if (!dialogEls || dialogEls.backdrop.hasAttribute("hidden")) return;
    if (e.key === "Escape") {
      closeDialog();
    } else if (e.key === "Tab") {
      trapFocus(e);
    }
  }

  function openDialog(cta) {
    if (!dialogEls) return;
    activeCta = cta;
    lastFocusedElement = document.activeElement;
    dialogEls.backdrop.removeAttribute("hidden");
    document.body.style.overflow = "hidden";

    var focusable = getFocusable(dialogEls.dialog);
    if (focusable.length) focusable[0].focus();
  }

  function closeDialog() {
    if (!dialogEls) return;
    dialogEls.backdrop.setAttribute("hidden", "");
    document.body.style.overflow = "";

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }

    activeCta = null;
  }

  function getActiveCtaBaseText() {
    if (!activeCta) return "";
    return activeCta.dataset.waBaseText || decodeExistingText(activeCta.getAttribute("href"));
  }

  /* Skip/direct path: redirect immediately with base contextual
     text (+ Ref if present). MUST NOT fire the dataLayer event. */
  function onSkip() {
    if (!activeCta) return;
    var baseText = getActiveCtaBaseText();
    var clickId = getClickId();
    var url = buildWhatsAppUrl(baseText, { clickId: clickId });
    var cta = activeCta;
    closeDialog();
    void cta;
    window.open(url, "_blank");
  }

  /* Qualified path: push the dataLayer event synchronously
     BEFORE opening WhatsApp, then redirect with contextual
     text + selected answer + Ref (if present). */
  function onQualified(answerLabel) {
    if (!activeCta) return;
    var cta = activeCta;
    var ctaId = cta.getAttribute("data-wa-cta") || "";
    var page = getPageSlug();
    var baseText = getActiveCtaBaseText();
    var clickId = getClickId();

    pushQualifiedIntent(ctaId, page, answerLabel);

    var url = buildWhatsAppUrl(baseText, { answerLabel: answerLabel, clickId: clickId });
    closeDialog();
    window.open(url, "_blank");
  }

  /* Canonical dataLayer contract for GTM. Event name and
     field names are exact - GTM's Custom Event trigger and
     the Ads conversion wiring depend on this literal shape. */
  function pushQualifiedIntent(ctaId, page, answer) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "whatsapp_qualified_intent",
      page: page,
      cta_id: ctaId,
      answer: answer,
    });
  }

  function injectDialogTemplate(config) {
    var backdrop = document.createElement("div");
    backdrop.className = "wa-dialog-backdrop";
    backdrop.setAttribute("hidden", "");

    var dialog = document.createElement("div");
    dialog.className = "wa-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "wa-dialog-heading");

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "wa-dialog__close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", closeDialog);

    var heading = document.createElement("h2");
    heading.id = "wa-dialog-heading";
    heading.className = "wa-dialog__title";
    heading.textContent = config.question;

    var chipsContainer = document.createElement("div");
    chipsContainer.className = "wa-dialog__chips";
    config.chips.forEach(function (chip) {
      var chipBtn = document.createElement("button");
      chipBtn.type = "button";
      chipBtn.className = "wa-dialog__chip";
      chipBtn.textContent = chip.label;
      chipBtn.addEventListener("click", function () {
        onQualified(chip.label);
      });
      chipsContainer.appendChild(chipBtn);
    });

    var skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "wa-dialog__skip";
    skipBtn.textContent = config.skipLabel;
    skipBtn.addEventListener("click", onSkip);

    dialog.appendChild(closeBtn);
    dialog.appendChild(heading);
    dialog.appendChild(chipsContainer);
    dialog.appendChild(skipBtn);
    backdrop.appendChild(dialog);

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeDialog();
    });

    document.body.appendChild(backdrop);

    dialogEls = {
      backdrop: backdrop,
      dialog: dialog,
      closeBtn: closeBtn,
      chipsContainer: chipsContainer,
      skipBtn: skipBtn,
    };
  }

  /* Delegated click listener: intercepts only [data-wa-primary]
     CTAs (hero) to route them through the qualifying dialog.
     Every other [data-wa-cta] stays a plain, already-hydrated
     link (no interception needed). */
  function handlePrimaryClick(e) {
    var cta = e.target.closest("[data-wa-primary]");
    if (!cta) return;
    if (!dialogEls) return; // no qualifier config for this page - fall back to plain link

    e.preventDefault();
    openDialog(cta);
  }

  function init() {
    var page = getPageSlug();
    var config = QUALIFIER_CONFIG[page];
    var clickId = getClickId();

    if (config) {
      injectDialogTemplate(config);
    }

    injectFab();
    hydrateStaticCtas(clickId);

    document.addEventListener("click", handlePrimaryClick);
    document.addEventListener("keydown", onKeydown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
