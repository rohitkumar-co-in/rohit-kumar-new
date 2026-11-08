/* PanelNest - front-end behaviour. No libraries needed. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Mobile menu ---------- */
  var toggle = $('.nav-toggle');
  var menu = $('#nav-menu');

  function setMenu(open) {
    if (!toggle) { return; }
    doc.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(!doc.classList.contains('nav-open'));
    });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a) { setMenu(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.classList.contains('nav-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (doc.classList.contains('nav-open') && !e.target.closest('.nav')) { setMenu(false); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) { setMenu(false); }
    });
  }

  /* ---------- Panel drawer (hamburger menu in the user + admin panels) ---------- */
  var dToggle = $('[data-drawer-toggle]');
  var drawer = $('#panel-drawer');

  if (dToggle && drawer) {
    var setDrawer = function (open, returnFocus) {
      doc.classList.toggle('drawer-open', open);
      dToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      dToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        var start = $('.drawer-link.is-on', drawer) || $('.drawer-link', drawer);
        if (start) { start.focus(); }
      } else if (returnFocus) {
        dToggle.focus();
      }
    };

    dToggle.addEventListener('click', function () {
      setDrawer(!doc.classList.contains('drawer-open'), true);
    });

    // PC (1200px+): the menu is a fixed sidebar (CSS). Never leave it "open" as an overlay when the
    // window grows, and scroll a long menu so the current page is in view.
    var sideMq = window.matchMedia ? window.matchMedia('(min-width: 1200px)') : null;
    if (sideMq) {
      var onSideChange = function () {
        if (sideMq.matches && doc.classList.contains('drawer-open')) { setDrawer(false, false); }
      };
      if (sideMq.addEventListener) { sideMq.addEventListener('change', onSideChange); } else if (sideMq.addListener) { sideMq.addListener(onSideChange); }
      var onLink = sideMq.matches ? $('.drawer-link.is-on', drawer) : null;
      if (onLink && onLink.offsetTop + onLink.offsetHeight > drawer.clientHeight - 24) {
        drawer.scrollTop = onLink.offsetTop - drawer.clientHeight / 2;
      }
    }
    $all('[data-drawer-close]').forEach(function (el) {
      el.addEventListener('click', function () { setDrawer(false, true); });
    });
    document.addEventListener('keydown', function (e) {
      if (!doc.classList.contains('drawer-open')) { return; }
      if (e.key === 'Escape') { setDrawer(false, true); return; }
      if (e.key === 'Tab') {
        // keep keyboard focus inside the open menu
        var items = $all('a[href], button', drawer).filter(function (el) { return !el.disabled; });
        if (!items.length) { return; }
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Pop-up messages (toasts) ----------
     Every message shows as a pop-up at the bottom centre, sliding up and back down:
       - messages from PHP flash()
       - the message boxes pages print (.alert: form errors, notices, warnings) - picked up below
       - messages from scripts: PanelToast.show('Text', 'success' | 'error' | 'warn' | 'info', { sticky: true })
     A pop-up closes by itself after a time that suits its length. One with a link or a file name in it
     stays until it is closed (x), so there is time to use it. Tap a pop-up to close it; hovering pauses it.
     A message box that is page content (a status panel, recovery codes) stays in the page: give it
     data-inline. Boxes with a form or button inside always stay. Without JavaScript all boxes stay. */
  var TOAST = {
    base: 2600,       // ms a short message stays on screen
    freeChars: 40,    // characters covered by the base time
    perChar: 45,      // extra ms for each character beyond that, so long text stays readable
    errorBonus: 1200, // errors and warnings stay a little longer
    max: 9000,        // never longer than this (sticky pop-ups wait for the close button)
    outMs: 280,       // keep in step with the toastOut animation in the CSS
    limit: 4          // most pop-ups on screen at once
  };
  var TOAST_TYPES = { success: 1, error: 1, warn: 1, info: 1 };
  var toasts = [];
  var toastStack = $('.flash-stack');

  // The live region is created up front so screen readers announce toasts added later
  if (!toastStack) {
    toastStack = document.createElement('div');
    toastStack.className = 'flash-stack';
    toastStack.setAttribute('role', 'status');
    toastStack.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastStack);
  }

  function toastTime(text, type) {
    var ms = TOAST.base + Math.max(0, text.length - TOAST.freeChars) * TOAST.perChar;
    if (type === 'error' || type === 'warn') { ms += TOAST.errorBonus; }
    return Math.min(ms, TOAST.max);
  }

  function trackToast(el, type, sticky) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    var total = toastTime(text, type);
    var left = total, startedAt = 0, timer = null, gone = false;
    var item = { el: el, text: text, sticky: !!sticky };

    function dismiss() {
      if (gone) { return; }
      gone = true;
      clearTimeout(timer);
      var i = toasts.indexOf(item);
      if (i > -1) { toasts.splice(i, 1); }
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, TOAST.outMs);
    }
    function start(ms) {
      clearTimeout(timer);
      if (item.sticky) { return; }
      startedAt = Date.now();
      timer = setTimeout(dismiss, ms);
    }

    item.dismiss = dismiss;
    item.restart = function () { left = total; start(left); };

    if (sticky && !el.querySelector('.flash-x')) {
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'flash-x';
      x.setAttribute('aria-label', 'Close message');
      x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      el.appendChild(x);
      el.classList.add('is-sticky');
    }
    // Tap anywhere to close (a link inside still opens).
    el.addEventListener('click', dismiss);
    el.addEventListener('mouseenter', function () { clearTimeout(timer); left -= Date.now() - startedAt; });
    el.addEventListener('mouseleave', function () { start(Math.max(left, 900)); });
    if (type === 'error') { el.setAttribute('role', 'alert'); }

    toasts.push(item);
    start(left);
    return item;
  }

  // Room for one more: the oldest pop-up that closes by itself goes first.
  function makeRoom() {
    while (toasts.length >= TOAST.limit) {
      var victim = toasts[0];
      for (var i = 0; i < toasts.length; i++) {
        if (!toasts[i].sticky) { victim = toasts[i]; break; }
      }
      victim.dismiss();
    }
  }

  // message: plain text, or a DOM node whose content (links, lists, bold text) is shown as it is.
  function showToast(message, type, opts) {
    opts = opts || {};
    type = TOAST_TYPES[type] ? type : 'info';
    var body = document.createElement('div');
    body.className = 'flash-body';
    if (message && message.nodeType) {
      body.appendChild(message);
    } else {
      body.textContent = String(message == null ? '' : message).replace(/\s+/g, ' ').trim();
    }
    var text = (body.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) { return null; }
    var sticky = opts.sticky !== undefined ? !!opts.sticky : !!body.querySelector('a[href], code');

    // Same message already showing? Just keep it on screen a little longer.
    for (var i = 0; i < toasts.length; i++) {
      if (toasts[i].text === text) { toasts[i].restart(); return toasts[i]; }
    }
    makeRoom();

    var el = document.createElement('div');
    el.className = 'flash flash-' + type;
    el.appendChild(body);
    toastStack.appendChild(el);
    return trackToast(el, type, sticky);
  }

  window.PanelToast = { show: showToast };

  // Messages rendered by PHP flash()
  $all('.flash', toastStack).forEach(function (el) {
    var type = 'info';
    ['success', 'error', 'warn', 'warning'].forEach(function (t) { if (el.classList.contains('flash-' + t)) { type = t === 'warning' ? 'warn' : t; } });
    if (el.classList.contains('flash-warning')) { el.classList.add('flash-warn'); }
    trackToast(el, type, !!el.querySelector('a[href], code'));
  });

  // Message boxes printed in the page (.alert) become pop-ups too, unless they are page content.
  $all('.alert').forEach(function (box) {
    if (box.hasAttribute('data-inline') || box.closest('[data-inline]') ||
        box.querySelector('form, input, select, textarea, button, .recovery-codes')) {
      return;
    }
    var type = box.classList.contains('alert-error') ? 'error'
      : (box.classList.contains('alert-warn') ? 'warn'
      : (box.classList.contains('alert-success') ? 'success' : 'info'));
    var content = document.createDocumentFragment();
    Array.prototype.forEach.call(box.childNodes, function (n) { content.appendChild(n.cloneNode(true)); });
    var wrap = document.createElement('div');
    wrap.appendChild(content);
    if (showToast(wrap, type)) {
      box.hidden = true;
      box.classList.add('is-toasted');
    }
  });

  /* ---------- Typing headline ---------- */
  var typed = $('[data-typed]');
  if (typed && !reduceMotion) {
    var words = [];
    try { words = JSON.parse(typed.getAttribute('data-words') || '[]'); } catch (err) { words = []; }
    if (words.length > 1) {
      var wi = 0, ci = words[0].length, deleting = false;
      var tick = function () {
        var word = words[wi];
        var delay;
        if (!deleting) {
          ci += 1;
          delay = 75;
          if (ci >= word.length) { ci = word.length; deleting = true; delay = 1700; }
        } else {
          ci -= 1;
          delay = 38;
          if (ci <= 0) { ci = 0; deleting = false; wi = (wi + 1) % words.length; delay = 350; }
        }
        typed.textContent = word.slice(0, ci);
        setTimeout(tick, delay);
      };
      setTimeout(function () { deleting = true; tick(); }, 2200);
    }
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = $all('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el) {
        var siblings = el.parentNode ? $all('.reveal', el.parentNode) : [];
        var idx = siblings.indexOf(el);
        el.style.setProperty('--rd', (idx > 0 ? Math.min(idx, 5) * 70 : 0) + 'ms');
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- Counters ---------- */
  function formatNum(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  var counters = $all('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        co.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var start = null, dur = 1400;
        function step(ts) {
          if (start === null) { start = ts; }
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = formatNum(Math.round(target * eased)) + suffix;
          if (p < 1) { window.requestAnimationFrame(step); }
        }
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { el.textContent = '0' + (el.getAttribute('data-suffix') || ''); co.observe(el); });
  }

  /* ---------- Live order counter in the hero preview ---------- */
  var live = $('[data-live-orders]');
  if (live && !reduceMotion) {
    var orders = parseInt(live.textContent.replace(/[^0-9]/g, ''), 10) || 1284;
    setInterval(function () {
      orders += 1 + Math.floor(Math.random() * 3);
      live.textContent = formatNum(orders);
    }, 2600);
  }

  /* ---------- Monthly / yearly plan switch ---------- */
  var cycleBtns = $all('.cycle-btn');
  if (cycleBtns.length) {
    var setCycle = function (cycle) {
      cycleBtns.forEach(function (b) {
        var on = b.getAttribute('data-cycle') === cycle;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $all('.price-amt').forEach(function (el) {
        el.textContent = el.getAttribute('data-' + cycle) || el.textContent;
      });
      $all('[data-per]').forEach(function (el) {
        var label = el.getAttribute('data-per-' + cycle);
        if (!label) { label = cycle === 'yearly' ? 'per year' : (cycle === 'quarterly' ? 'per quarter' : 'per month'); }
        el.textContent = label;
      });
      $all('.price-save').forEach(function (el) {
        el.textContent = (cycle === 'yearly' || cycle === 'quarterly') ? (el.getAttribute('data-save-' + cycle) || el.getAttribute('data-save') || '') : '';
      });
      $all('[data-rent-link]').forEach(function (a) {
        var base = a.getAttribute('data-base') || a.getAttribute('href');
        a.setAttribute('href', base + (cycle !== 'monthly' ? '&cycle=' + cycle : ''));
      });
    };
    cycleBtns.forEach(function (b) {
      b.addEventListener('click', function () { setCycle(b.getAttribute('data-cycle')); });
    });
  }

  /* ---------- Show / hide password ---------- */
  $all('[data-pw-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-pw-toggle'));
      if (!input) { return; }
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- Contact form (works without JS too) ---------- */
  var form = $('#contact-form');
  if (form && window.fetch && window.FormData) {
    var status = $('.form-status', form);
    var submitBtn = $('button[type="submit"]', form);

    // Messages show as pop-ups (the status line under the form stays empty)
    var say = function (msg, ok) {
      if (status) { status.textContent = ''; status.className = 'form-status'; }
      if (msg) { showToast(msg, ok ? 'success' : 'error'); }
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      if (name.length < 2) { say('Please enter your name.', false); form.elements.name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('Please enter a valid email address.', false); form.elements.email.focus(); return; }
      if (message.length < 10) { say('Please write at least 10 characters so we can help.', false); form.elements.message.focus(); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      say('', true);

      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false, message: 'Unexpected reply from the server.' }; });
        })
        .then(function (data) {
          say(data.message || (data.ok ? 'Message sent.' : 'Could not send. Please try again.'), !!data.ok);
          if (data.ok) { form.reset(); }
        })
        .catch(function () {
          say('Could not reach the server. Check your connection and try again.', false);
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.getAttribute('data-label') || 'Send message';
        });
    });
  }

  /* ---------- Rent page summary ---------- */
  var rent = $('#rent-form');
  if (rent) {
    // Coupon messages show as pop-ups; the line under the coupon box stays empty
    var couponSay = function (text, kind) {
      var line = $('[data-coupon-msg]', rent);
      if (line) { line.textContent = ''; line.className = 'hint coupon-msg'; }
      if (text) { showToast(text, kind === 'ok' ? 'success' : (kind === 'err' ? 'error' : 'info')); }
    };
    var couponLine = $('[data-coupon-msg]', rent);
    if (couponLine && couponLine.textContent.trim()) {
      // After a submit: an applied coupon is news; a coupon error is already in the error pop-up
      if (couponLine.classList.contains('ok')) { showToast(couponLine.textContent, 'success'); }
      couponSay('', '');
    }
    var sumPlan = $('[data-sum-plan]', rent);
    var sumCycle = $('[data-sum-cycle]', rent);
    var sumSubtotal = $('[data-sum-subtotal]', rent);
    var sumGst = $('[data-sum-gst]', rent);
    var sumTotal = $('[data-sum-total]', rent);
    var sumDiscountRow = $('[data-sum-discount-row]', rent);
    var sumDiscount = $('[data-sum-discount]', rent);
    var cycleSave = $('[data-cycle-save]', rent);

    // Set by the coupon "Apply" call below; cleared whenever the plan or
    // cycle changes, since a coupon's discount depends on the base price.
    // True right after the page loads if the server already applied a coupon
    // (e.g. the form was redisplayed because of another field's error).
    var appliedCoupon = (sumDiscountRow && sumDiscountRow.style.display !== 'none') ? true : null;

    var walletRadio = $('#pm-wallet', rent);
    var walletAffordNote = $('[data-wallet-afford]', rent);
    var submitText = $('[data-submit-text]', rent);
    var setSubmitLabel = function () {
      if (!submitText) { return; }
      var chosen = $('input[name="payment_method"]:checked', rent);
      if (chosen && chosen.value === 'wallet') {
        submitText.textContent = 'Pay from wallet';
      } else {
        submitText.textContent = submitText.getAttribute('data-default') || submitText.textContent;
      }
    };
    if (submitText && !submitText.getAttribute('data-default')) {
      submitText.setAttribute('data-default', submitText.textContent);
    }
    var checkWalletAfford = function (totalRaw) {
      if (!walletRadio) { return; }
      var balance = parseFloat(walletRadio.getAttribute('data-wallet-balance')) || 0;
      var choice = walletRadio.closest('.choice');
      if (totalRaw > balance + 0.004) {
        walletRadio.disabled = true;
        if (choice) { choice.classList.add('is-disabled'); }
        if (walletRadio.checked) {
          walletRadio.checked = false;
          var other = rent.querySelector('input[name="payment_method"]:not(#pm-wallet)');
          if (other) { other.checked = true; }
          showToast('Not enough wallet balance for this plan — add funds or choose the other option.', 'warn');
        }
        if (walletAffordNote) { walletAffordNote.textContent = ''; }
      } else {
        walletRadio.disabled = false;
        if (choice) { choice.classList.remove('is-disabled'); }
        if (walletAffordNote) { walletAffordNote.textContent = ''; }
      }
      setSubmitLabel();
      syncStepsPanel();
    };

    var stepsPanels = $all('.steps-panel', rent);
    var sumHeading = $('[data-sum-heading]', rent);
    var syncStepsPanel = function () {
      var chosen = $('input[name="payment_method"]:checked', rent);
      var val = chosen ? chosen.value : (stepsPanels[0] ? stepsPanels[0].getAttribute('data-steps') : '');
      stepsPanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-steps') !== val;
      });
      if (sumHeading) { sumHeading.textContent = val === 'request' ? 'Your request' : 'Your order'; }
    };

    var cycleSuffix = { monthly: 'm', quarterly: 'q', yearly: 'y' };
    var cycleLabel = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
    var cyclePeriodAttr = { monthly: 'data-period', quarterly: 'data-period-q', yearly: 'data-period-y' };
    var cycleUnitFallback = { monthly: 'month', quarterly: 'quarter', yearly: 'year' };

    var refresh = function (keepCoupon) {
      var plan = $('input[name="plan"]:checked', rent);
      var cycle = $('input[name="cycle"]:checked', rent);
      if (!plan || !cycle) { return; }
      var suf = cycleSuffix[cycle.value] || 'm';
      if (sumPlan) { sumPlan.textContent = plan.getAttribute('data-name'); }
      if (sumCycle) { sumCycle.textContent = cycleLabel[cycle.value] || 'Monthly'; }
      if (cycleSave) { cycleSave.textContent = cycle.value === 'yearly' ? (plan.getAttribute('data-save') || '') : ''; }
      $all('.choice-price-amt', rent).forEach(function (el) {
        var input = el.closest('.choice').querySelector('input[name="plan"]');
        if (input) {
          var period = input.getAttribute(cyclePeriodAttr[cycle.value] || 'data-period') || cycleUnitFallback[cycle.value] || 'month';
          el.textContent = input.getAttribute('data-' + suf) + ' / ' + period;
        }
      });

      if (keepCoupon) {
        checkWalletAfford(parseFloat(plan.getAttribute('data-' + suf + 't-raw')) || 0);
        return;
      }

      if (appliedCoupon) {
        appliedCoupon = null;
        if (sumDiscountRow) { sumDiscountRow.style.display = 'none'; }
        couponSay('Plan or billing changed — click Apply again to re-check your coupon.', '');
      }
      if (sumSubtotal) { sumSubtotal.textContent = plan.getAttribute('data-' + suf); }
      if (sumGst) { sumGst.textContent = plan.getAttribute('data-' + suf + 'g'); }
      if (sumTotal) { sumTotal.textContent = plan.getAttribute('data-' + suf + 't'); }
      checkWalletAfford(parseFloat(plan.getAttribute('data-' + suf + 't-raw')) || 0);
    };
    rent.addEventListener('change', function (e) {
      refresh(false);
      if (e.target && e.target.name === 'payment_method') { setSubmitLabel(); }
    });
    refresh(true);

    /* ---------- Coupon apply ---------- */
    var couponInput = $('[data-coupon-input]', rent);
    var couponBtn = $('[data-coupon-apply]', rent);
    if (couponInput && couponBtn) {
      var applyCoupon = function () {
        var plan = $('input[name="plan"]:checked', rent);
        var cycle = $('input[name="cycle"]:checked', rent);
        var code = couponInput.value.trim();
        if (!plan) {
          couponSay('Choose a plan first.', 'err');
          return;
        }
        if (!code) {
          appliedCoupon = null;
          if (sumDiscountRow) { sumDiscountRow.style.display = 'none'; }
          couponSay('', '');
          refresh(true);
          return;
        }
        couponBtn.disabled = true;
        var oldLabel = couponBtn.textContent;
        couponBtn.textContent = 'Checking...';
        var body = new URLSearchParams();
        body.set('plan', plan.value);
        body.set('cycle', cycle ? cycle.value : 'monthly');
        body.set('coupon_code', code);
        body.set('csrf', rent.querySelector('input[name="csrf"]').value);

        fetch(rent.getAttribute('action').replace(/user\/rent\.php$/, 'api/coupon_check.php'), {
          method: 'POST',
          body: body,
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
        })
          .then(function (res) { return res.json().catch(function () { return { ok: false, message: 'Unexpected reply from the server.' }; }); })
          .then(function (data) {
            if (data.ok) {
              appliedCoupon = data.code;
              couponSay(data.message, 'ok');
              if (sumSubtotal) { sumSubtotal.textContent = data.subtotal; }
              if (sumDiscountRow && sumDiscount) {
                sumDiscountRow.style.display = '';
                sumDiscount.textContent = '\u2212' + data.discount_fmt;
              }
              if (sumGst) { sumGst.textContent = data.gst; }
              if (sumTotal) { sumTotal.textContent = data.total; }
              checkWalletAfford(parseFloat(data.total_raw) || 0);
            } else {
              appliedCoupon = null;
              if (sumDiscountRow) { sumDiscountRow.style.display = 'none'; }
              couponSay(data.message || 'That coupon could not be applied.', 'err');
              refresh(true);
            }
          })
          .catch(function () {
            couponSay('Could not reach the server. Please try again.', 'err');
          })
          .then(function () {
            couponBtn.disabled = false;
            couponBtn.textContent = oldLabel;
          });
      };
      couponBtn.addEventListener('click', applyCoupon);
      couponInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
      });
    }

    /* ---------- Rent page: step-by-step wizard ---------- */
    var steps = $all('.rent-step', rent);
    var indicatorItems = $all('#rent-steps .step-indicator-item');

    var showStep = function (n) {
      steps.forEach(function (s) {
        s.classList.toggle('is-active', parseInt(s.getAttribute('data-step'), 10) === n);
      });
      indicatorItems.forEach(function (li) {
        var num = parseInt(li.getAttribute('data-step-link'), 10);
        li.classList.toggle('is-active', num === n);
        li.classList.toggle('is-done', num < n);
      });
      var activeCard = rent.querySelector('.rent-step.is-active');
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    var currentStepValid = function (stepEl) {
      var num = parseInt(stepEl.getAttribute('data-step'), 10);
      if (num === 1 && !$('input[name="plan"]:checked', stepEl)) {
        showToast('Please choose a plan to continue.', 'error');
        return false;
      }
      var required = $all('input[required], textarea[required]', stepEl);
      for (var i = 0; i < required.length; i++) {
        if (!required[i].reportValidity()) { return false; }
      }
      return true;
    };

    rent.addEventListener('click', function (ev) {
      var next = ev.target.closest('[data-step-next]');
      var back = ev.target.closest('[data-step-back]');
      if (next) {
        var current = next.closest('.rent-step');
        if (!currentStepValid(current)) { return; }
        showStep(parseInt(current.getAttribute('data-step'), 10) + 1);
      } else if (back) {
        var currentBack = back.closest('.rent-step');
        showStep(parseInt(currentBack.getAttribute('data-step'), 10) - 1);
      }
    });

    indicatorItems.forEach(function (li) {
      li.addEventListener('click', function () {
        var target = parseInt(li.getAttribute('data-step-link'), 10);
        if (li.classList.contains('is-done') || li.classList.contains('is-active')) {
          showStep(target);
        }
      });
      li.style.cursor = 'pointer';
    });
  }

  /* ---------- Search bars: live clear (x) button ----------
     Shows the x while there is text. Clicking it empties the box; if a search
     is currently applied to the page it also reloads the list without it. */
  $all('.search-field').forEach(function (field) {
    var input = $('.search-input', field);
    var clear = $('.search-clear', field);
    var form = field.closest ? field.closest('form') : null;
    if (!input || !clear) { return; }

    function sync() { field.classList.toggle('has-value', input.value.length > 0); }

    input.addEventListener('input', sync);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value !== '') { e.preventDefault(); clear.click(); }
    });
    clear.addEventListener('click', function () {
      input.value = '';
      sync();
      if (form && form.getAttribute('data-active') === '1') {
        form.submit();
      } else {
        input.focus();
      }
    });
    sync();
  });

  /* ---------- Tap sound ----------
     A short, synthesised "premium" click - no audio file to load, just the
     Web Audio API, so it's instant and works offline. Plays on every button,
     link-button, panel/drawer link, form control and floating chat button,
     plus the phone's own haptic buzz where the browser supports it.

     Layered like a real UI click, not a single beep:
       1. a filtered noise transient   -> the crisp "tick" of the contact
       2. a tonal body (falling pitch) -> warmth, so it doesn't sound thin
       3. a high sparkle overtone      -> a glassy, premium shimmer on top
       4. a soft sub thump             -> a little weight underneath
     A gentle low-pass across the whole mix keeps it smooth instead of
     harsh, and a touch of random pitch/pan on every tap keeps it feeling
     natural instead of a robotic loop. */
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx) {
    var tapCtx = null;
    var tapNoiseBuffer = null;

    function tapAudioCtx() {
      if (!tapCtx) { tapCtx = new AudioCtx(); }
      if (tapCtx.state === 'suspended') { tapCtx.resume(); }
      return tapCtx;
    }

    /* A short burst of noise, its volume shaped into a curve so it fades
       out smoothly instead of clicking off abruptly. Built once and reused. */
    function tapNoise(ctx) {
      if (tapNoiseBuffer) { return tapNoiseBuffer; }
      var len = Math.round(ctx.sampleRate * 0.035);
      tapNoiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = tapNoiseBuffer.getChannelData(0);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
      return tapNoiseBuffer;
    }

    function playTapSound() {
      var ctx = tapAudioCtx();
      var now = ctx.currentTime;
      var pitch = Math.pow(2, ((Math.random() * 30) - 15) / 1200);   // +-15 cents of natural variance
      var pan = (Math.random() * 0.3) - 0.15;                        // slight, subtle stereo drift

      var master = ctx.createGain();
      master.gain.value = 1;
      var smooth = ctx.createBiquadFilter();
      smooth.type = 'lowpass';
      smooth.frequency.value = 6500;
      master.connect(smooth);
      if (ctx.createStereoPanner) {
        var panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        smooth.connect(panner);
        panner.connect(ctx.destination);
      } else {
        smooth.connect(ctx.destination);
      }

      // 1) Transient tick - band-passed noise, gives the tactile "contact" edge.
      var noise = ctx.createBufferSource();
      noise.buffer = tapNoise(ctx);
      var noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 4200 * pitch;
      noiseFilter.Q.value = 1.1;
      var noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + 0.035);

      // 2) Tonal body - a falling sine, gives the click warmth instead of thinness.
      var body = ctx.createOscillator();
      body.type = 'sine';
      body.frequency.setValueAtTime(880 * pitch, now);
      body.frequency.exponentialRampToValueAtTime(420 * pitch, now + 0.09);
      var bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.2, now + 0.006);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      body.connect(bodyGain);
      bodyGain.connect(master);
      body.start(now);
      body.stop(now + 0.13);

      // 3) Sparkle overtone - a brief high harmonic, the "glassy" premium shine.
      var sparkle = ctx.createOscillator();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(2800 * pitch, now);
      var sparkleGain = ctx.createGain();
      sparkleGain.gain.setValueAtTime(0.055, now);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      sparkle.connect(sparkleGain);
      sparkleGain.connect(master);
      sparkle.start(now);
      sparkle.stop(now + 0.05);

      // 4) Sub thump - very quiet low layer, gives the click a little weight.
      var thump = ctx.createOscillator();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(180 * pitch, now);
      thump.frequency.exponentialRampToValueAtTime(90 * pitch, now + 0.08);
      var thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0001, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      thump.connect(thumpGain);
      thumpGain.connect(master);
      thump.start(now);
      thump.stop(now + 0.11);
    }

    var tapSelector = [
      'button', '.btn', 'a.chat-fab', '.drawer-link', '.nav-toggle', '.hamburger',
      '.nav-links a', '.footer-links a', '.search-btn', '.search-clear',
      'input[type="checkbox"]', 'input[type="radio"]', 'select', '.choice'
    ].join(', ');

    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest(tapSelector) : null;
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') { return; }
      try { playTapSound(); } catch (err) { /* ignore - never block the click */ }
      if (navigator.vibrate) { navigator.vibrate(6); }
    });
  }
})();

/* ---------- Wide tables: fade the edge that has more columns (CSS .has-more-left / .has-more-right) ---------- */
(function () {
  var wraps = Array.prototype.slice.call(document.querySelectorAll('.table-wrap'));
  if (!wraps.length) { return; }
  function edges(w) {
    var max = w.scrollWidth - w.clientWidth;
    w.classList.toggle('has-more-right', max > 2 && w.scrollLeft < max - 2);
    w.classList.toggle('has-more-left', max > 2 && w.scrollLeft > 2);
  }
  var queued = false;
  function all() { queued = false; wraps.forEach(edges); }
  wraps.forEach(function (w) {
    w.addEventListener('scroll', function () { edges(w); }, { passive: true });
  });
  window.addEventListener('resize', function () {
    if (!queued) { queued = true; window.requestAnimationFrame(all); }
  }, { passive: true });
  window.addEventListener('load', all);
  all();
})();

/* ---------- Clickable order rows (My orders / Renewals) ---------- */
(function () {
  document.addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('tr.row-clickable[data-href]') : null;
    if (!row) { return; }
    // Don't hijack clicks on links, buttons, form controls, or labels inside the row
    // (e.g. auto-renew toggle, Renew now, Add funds, View details).
    if (e.target.closest('a, button, input, label, form, select, textarea')) { return; }
    window.location.href = row.getAttribute('data-href');
  });
})();

/* ---------- Floating Live chat button: unread count updates by itself ----------
   Asks user/chat_api.php?action=unread every 15 seconds while the tab is visible (nothing is
   marked as read), and right away when you come back to the tab. Updates the red badge on the
   button and the count next to "Live chat" in the menu. */
(function () {
  var fab = document.querySelector('.chat-fab-live[data-unread-url]');
  if (!fab || !window.fetch) { return; }
  var EVERY = 15000;
  var url = fab.getAttribute('data-unread-url');
  var label = fab.getAttribute('title') || 'Live chat';
  var menuLink = document.querySelector('.drawer-link[href$="user/chat.php"]');
  var badgeNow = fab.querySelector('.chat-fab-badge');
  var current = badgeNow ? (parseInt(badgeNow.textContent, 10) || 0) : 0;
  var timer = null;
  var stopped = false;

  function setCount(n) {
    var badge = fab.querySelector('.chat-fab-badge');
    if (n > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'chat-fab-badge';
        badge.setAttribute('aria-hidden', 'true');
        fab.appendChild(badge);
      }
      badge.textContent = n > 99 ? '99+' : String(n);
      if (n > current) {   // a new message: a little bump so it gets noticed
        fab.classList.remove('is-bump');
        void fab.offsetWidth;
        fab.classList.add('is-bump');
      }
    } else if (badge) {
      badge.parentNode.removeChild(badge);
    }
    fab.setAttribute('aria-label', label + (n > 0 ? ' (' + n + ' new)' : ''));
    if (menuLink) {
      var c = menuLink.querySelector('.count');
      if (n > 0) {
        if (!c) {
          c = document.createElement('span');
          c.className = 'count';
          menuLink.appendChild(c);
        }
        c.textContent = n;
      } else if (c) {
        c.parentNode.removeChild(c);
      }
    }
    current = n;
  }

  function check() {
    clearTimeout(timer);
    if (stopped || document.hidden) { return; }   // carries on when the tab is visible again
    fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
      .then(function (res) {
        if (res.status === 401) { return { signedOut: true }; }
        return res.json().catch(function () { return null; });
      })
      .then(function (d) {
        if (d && d.signedOut) { stopped = true; return; }
        if (d && d.ok && typeof d.unread === 'number') {
          setCount(d.unread);
          timer = setTimeout(check, EVERY);
        } else {
          timer = setTimeout(check, EVERY * 4);   // server busy or chat switched off: ask less often
        }
      })
      .catch(function () { timer = setTimeout(check, EVERY * 4); });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { check(); }
  });
  timer = setTimeout(check, EVERY);
})();
