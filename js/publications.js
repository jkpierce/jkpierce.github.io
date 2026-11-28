/* Publications page: fetch citation counts and open-access status from OpenAlex,
   show totals, an h-index and a citations-per-year chart, and let readers sort
   and filter the list. Without JavaScript (or if OpenAlex is down) the plain list
   still shows. */
(function () {
    var list = document.getElementById('pub-list');
    if (!list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('li.pub'));
    var state = { sort: 'new', type: 'all' };

    function cites(li) { return +(li.dataset.cites || 0); }

    /* ---------- sorting, filtering and year headings ---------- */
    function render() {
        var shown = items.filter(function (li) {
            return state.type === 'all' || li.dataset.type === state.type ||
                   (state.type === 'preprint' && li.dataset.type === 'inprep');
        });
        shown.sort(function (a, b) {
            if (state.sort === 'cited') return cites(b) - cites(a) || b.dataset.year - a.dataset.year;
            var d = a.dataset.order - b.dataset.order;
            return state.sort === 'old' ? -d : d;
        });
        list.querySelectorAll('.pub-year').forEach(function (h) { h.remove(); });
        items.forEach(function (li) { li.hidden = true; });
        var lastYear = null;
        shown.forEach(function (li) {
            li.hidden = false;
            if (state.sort !== 'cited' && li.dataset.year !== lastYear) {
                lastYear = li.dataset.year;
                var h = document.createElement('li');
                h.className = 'pub-year';
                h.setAttribute('aria-hidden', 'true');
                h.textContent = lastYear;
                list.appendChild(h);
            }
            list.appendChild(li);
        });
    }

    document.querySelectorAll('.pub-seg').forEach(function (seg) {
        seg.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            state[seg.dataset.ctl] = b.dataset.v;
            render();
        });
    });
    render();

    /* ---------- citations-per-year chart (inline SVG) ---------- */
    function drawChart(byYear) {
        var fig = document.getElementById('pub-chart');
        var years = Object.keys(byYear).map(Number).sort();
        if (!fig || !years.length) return;
        var y0 = years[0], y1 = Math.max(years[years.length - 1], new Date().getFullYear());
        var n = y1 - y0 + 1, max = 1;
        for (var y = y0; y <= y1; y++) max = Math.max(max, byYear[y] || 0);
        var W = 300, Hh = 92, base = 74, top = 14, bw = W / n;
        var s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Citations per year">';
        for (y = y0; y <= y1; y++) {
            var v = byYear[y] || 0, h = (base - top) * v / max, x = (y - y0) * bw;
            s += '<g><title>' + y + ': ' + v + ' citations</title>' +
                 '<rect x="' + (x + bw * 0.18).toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) +
                 '" height="' + Math.max(h, v ? 1 : 0).toFixed(1) + '" rx="1.5" class="bar"/>';
            if (v) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (base - h - 3).toFixed(1) + '" class="val">' + v + '</text>';
            if ((y - y0) % 2 === (y1 - y0) % 2) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Hh - 4) + '" class="yr">&rsquo;' + String(y).slice(2) + '</text>';
            s += '</g>';
        }
        s += '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="axis"/></svg>';
        fig.innerHTML = s + '<figcaption>Citations per year</figcaption>';
    }

    /* ---------- OpenAlex ---------- */
    var dois = items.map(function (li) { return li.dataset.doi; }).filter(Boolean);
    if (!dois.length || !window.fetch) return;
    var url = 'https://api.openalex.org/works?per-page=50&select=doi,cited_by_count,open_access,counts_by_year&filter=doi:' +
              dois.map(encodeURIComponent).join('|');
    fetch(url).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (data) {
        var byDoi = {};
        data.results.forEach(function (w) { if (w.doi) byDoi[w.doi.replace('https://doi.org/', '').toLowerCase()] = w; });
        var total = 0, counts = [], byYear = {};
        items.forEach(function (li) {
            var w = byDoi[li.dataset.doi];
            if (!w) return;
            var c = w.cited_by_count || 0;
            li.dataset.cites = c;
            total += c;
            counts.push(c);
            var el = li.querySelector('.pub-cites');
            el.textContent = c === 1 ? '1 citation' : c + ' citations';
            el.hidden = false;
            var oa = li.querySelector('.pub-oa'), open = !!(w.open_access && w.open_access.is_oa);
            oa.textContent = open ? 'Open access' : 'Paywalled';
            oa.classList.toggle('is-closed', !open);
            oa.hidden = false;
            (w.counts_by_year || []).forEach(function (cy) { byYear[cy.year] = (byYear[cy.year] || 0) + cy.cited_by_count; });
        });
        counts.sort(function (a, b) { return b - a; });
        var h = 0;
        while (h < counts.length && counts[h] >= h + 1) h++;
        document.getElementById('st-cites').textContent = total;
        document.getElementById('st-h').textContent = h;
        document.querySelector('.pubs-page').classList.add('has-metrics');
        drawChart(byYear);
        if (state.sort === 'cited') render();
    }).catch(function () {
        var p = document.querySelector('.pub-source');
        if (p) p.textContent = 'Citation counts are unavailable right now (OpenAlex could not be reached).';
    });
})();
