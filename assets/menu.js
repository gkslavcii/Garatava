/**
 * Garatava QR Menü — vanilla JS, framework yok.
 * Veri kaynağı: /_data/menu.json (POS tarafından üretilir + GitHub Pages deploy ile yayınlanır)
 *
 * Yetenekler:
 * - Sticky kategori tab'ları (yatay scroll)
 * - Tab tıklayınca smooth scroll
 * - Sayfa scroll edilince aktif kategori vurgusu (IntersectionObserver)
 * - Tab listesi üzerinde sola/sağa swipe → kategori değiştir
 */

const TR_FMT = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

async function loadMenu() {
    const root = document.getElementById('menuRoot');
    const tabs = document.getElementById('catTabs');
    try {
        const r = await fetch('/_data/menu.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('menu.json yüklenemedi');
        const data = await r.json();

        const cats = Array.isArray(data.categories) ? data.categories : [];
        if (cats.length === 0) {
            root.innerHTML = '<div class="m-loading">Menü henüz hazır değil.</div>';
            return;
        }

        // Tab'lar
        tabs.innerHTML = '';
        cats.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = c.name;
            btn.dataset.target = `cat-${idx}`;
            if (idx === 0) btn.classList.add('active');
            btn.addEventListener('click', () => {
                const el = document.getElementById(`cat-${idx}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            tabs.appendChild(btn);
        });

        // Kategoriler + ürünler
        root.innerHTML = '';
        cats.forEach((c, idx) => {
            const sec = document.createElement('section');
            sec.className = 'm-category';
            sec.id = `cat-${idx}`;

            const h = document.createElement('h2');
            h.className = 'm-category-title';
            h.textContent = c.name;
            sec.appendChild(h);

            (c.products || []).forEach(p => {
                const div = document.createElement('div');
                div.className = 'm-product';

                const row = document.createElement('div');
                row.className = 'm-prow';

                const name = document.createElement('div');
                name.className = 'name';
                name.textContent = p.name;
                row.appendChild(name);

                if (typeof p.price === 'number' && p.price > 0) {
                    const price = document.createElement('div');
                    price.className = 'price';
                    price.textContent = `${TR_FMT.format(p.price)} ₺`;
                    row.appendChild(price);
                }
                div.appendChild(row);

                if (p.description && p.description.trim()) {
                    const desc = document.createElement('div');
                    desc.className = 'm-pdesc';
                    desc.textContent = p.description.trim();
                    div.appendChild(desc);
                }

                // Kalori — açıklamanın altında soft bir satır. null = girilmemiş (gizle); 0 geçerli.
                if (typeof p.calories === 'number') {
                    const cal = document.createElement('div');
                    cal.className = 'm-pcal';
                    cal.textContent = `${p.calories} kcal`;
                    div.appendChild(cal);
                }
                sec.appendChild(div);
            });
            root.appendChild(sec);
        });

        // Güncelleme zamanı (footer)
        const upd = document.getElementById('updatedText');
        if (upd && data.updatedAt) {
            try {
                const d = new Date(data.updatedAt);
                upd.textContent = `Son güncelleme: ${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            } catch { /* yut */ }
        }

        setupScrollSpy(cats.length);
        setupSwipeTabs(cats.length);
    } catch (err) {
        root.innerHTML = `<div class="m-loading">Menü yüklenirken hata oluştu.<br><small style="font-size:0.7rem;opacity:0.7;">${err.message}</small></div>`;
    }
}

/** Sayfa scroll edilince aktif kategoriyi vurgular. */
function setupScrollSpy(count) {
    const tabs = document.querySelectorAll('#catTabs button');
    if (tabs.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        // En çok kesişen kategoriyi bul
        let best = null;
        entries.forEach(e => {
            if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
        });
        if (!best) return;
        const idx = best.target.id.replace('cat-', '');
        const btn = document.querySelector(`#catTabs button[data-target="cat-${idx}"]`);
        if (btn) {
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            // Tab listesini de scroll et — aktif tab görünür olsun
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

    for (let i = 0; i < count; i++) {
        const sec = document.getElementById(`cat-${i}`);
        if (sec) observer.observe(sec);
    }
}

/** Tab bar üzerinde sola/sağa swipe → komşu kategoriye geç. */
function setupSwipeTabs(count) {
    const tabs = document.getElementById('catTabs');
    if (!tabs) return;
    let startX = 0, startY = 0, dx = 0, dy = 0, active = false;
    tabs.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dx = dy = 0;
        active = true;
    }, { passive: true });
    tabs.addEventListener('touchmove', (e) => {
        if (!active) return;
        dx = e.touches[0].clientX - startX;
        dy = e.touches[0].clientY - startY;
    }, { passive: true });
    tabs.addEventListener('touchend', () => {
        if (!active) return;
        active = false;
        // Yatay swipe + yeterli mesafe + dikey değil
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            const activeBtn = document.querySelector('#catTabs button.active');
            if (!activeBtn) return;
            const all = Array.from(document.querySelectorAll('#catTabs button'));
            const idx = all.indexOf(activeBtn);
            const next = dx < 0 ? Math.min(count - 1, idx + 1) : Math.max(0, idx - 1);
            if (next !== idx) {
                const target = document.getElementById(`cat-${next}`);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', loadMenu);
