/* Overlay viewer for project media: click a tile to open it, then step through
   every tile on the page with the arrows, arrow keys or a swipe. Esc or a click
   outside the image closes it. */
(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('#content .media-tile > a'));
    if (!links.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image viewer');
    box.hidden = true;
    box.innerHTML =
        '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
        '<button class="lb-btn lb-prev" aria-label="Previous">&#8249;</button>' +
        '<div class="lb-stage"></div>' +
        '<button class="lb-btn lb-next" aria-label="Next">&#8250;</button>' +
        '<div class="lb-count"></div>';
    document.body.appendChild(box);

    var stage = box.querySelector('.lb-stage');
    var count = box.querySelector('.lb-count');
    var current = 0, opener = null;

    function show(i) {
        current = (i + links.length) % links.length;
        var a = links[current];
        var src = a.getAttribute('href');
        var el;
        if (a.querySelector('video')) {
            el = document.createElement('video');
            el.src = src; el.autoplay = true; el.loop = true; el.muted = true;
            el.playsInline = true; el.controls = true;
        } else {
            el = document.createElement('img');
            el.src = src;
            var thumb = a.querySelector('img');
            el.alt = thumb ? thumb.alt : '';
        }
        stage.replaceChildren(el);
        count.textContent = (current + 1) + ' / ' + links.length;
        // Preload the neighbours so stepping feels instant.
        [current + 1, current - 1].forEach(function (j) {
            var n = links[(j + links.length) % links.length];
            if (!n.querySelector('video')) { new Image().src = n.getAttribute('href'); }
        });
    }

    function open(i) {
        opener = document.activeElement;
        box.hidden = false;
        document.documentElement.classList.add('lb-open');
        show(i);
        box.querySelector('.lb-close').focus();
    }

    function close() {
        box.hidden = true;
        stage.replaceChildren();
        document.documentElement.classList.remove('lb-open');
        if (opener) opener.focus();
    }

    links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // allow open-in-new-tab
            e.preventDefault();
            open(i);
        });
    });

    box.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    box.querySelector('.lb-close').addEventListener('click', close);
    box.addEventListener('click', function (e) {
        if (e.target === box || e.target === stage) close();
    });

    document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') show(current + 1);
        else if (e.key === 'ArrowLeft') show(current - 1);
    });

    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
        x0 = null;
    });
})();

/* On narrow screens the project tabs scroll sideways: bring the current one into view. */
(function () {
    var cur = document.querySelector('.project-tabs a[aria-current="page"]');
    if (!cur) return;
    var bar = cur.parentNode;
    function center() {
        if (bar.scrollWidth <= bar.clientWidth) return;
        var b = bar.getBoundingClientRect(), c = cur.getBoundingClientRect();
        bar.scrollLeft += (c.left + c.width / 2) - (b.left + b.width / 2);
    }
    center();
    window.addEventListener('load', center);
})();
