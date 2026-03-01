/* ──────────────────────────────────────────────
   App — Main orchestration
   ────────────────────────────────────────────── */
const App = (() => {
    let rawData = [];
    let filteredData = [];
    let ROWS_PER_PAGE = 25;
    let currentPage = 1;
    let sortCol = 'date';
    let sortAsc = false;

    // Inline filters for Filtered Transactions table
    let tableCatFilter = '';
    let tableNoteFilter = '';

    // All Data tab state
    let allDataPage = 1;
    let allDataSortCol = 'date';
    let allDataSortAsc = false;
    let allDataSearch = '';

    /* ═══ Init ══════════════════════════════════ */
    function init() {
        ThemeManager.init();
        rawData = DataManager.init();

        bindDrawer();
        bindFilters();
        bindChartSwitchers();
        bindTable();
        bindTableFilters();
        bindMainTabs();
        bindAllDataTable();
        bindDeselectButtons();

        if (rawData.length) showDashboard();
        else showEmpty();
    }

    /* ═══ Data loading ══════════════════════════ */
    function onDataLoaded(newRecords, source) {
        const result = DataManager.appendData(newRecords);
        rawData = DataManager.getData();
        toast(`Loaded ${result.added} new records (${rawData.length} total) from ${source}`, 'success');
        showDashboard();
    }

    function showDashboard() {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        document.getElementById('dataBadge').textContent = `${rawData.length} records`;
        document.getElementById('recordCount').textContent = `${rawData.length} records loaded`;
        FilterManager.populate(rawData);
        refresh();
        renderAllData();
    }

    function showEmpty() {
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('dataBadge').textContent = 'No data';
        document.getElementById('recordCount').textContent = '0 records loaded';
    }

    function refresh() {
        filteredData = FilterManager.apply(rawData);
        updateKPIs(filteredData);
        updateFilterSummary(filteredData);
        ChartManager.updateAll(filteredData);
        updateCategoryShareTable(filteredData, rawData);
        currentPage = 1;
        populateTableCatDropdown(filteredData);
        renderTable(filteredData);
    }

    function getFilteredData() { return filteredData; }

    /* ═══ Main Tab Navigation ═══════════════════ */
    function bindMainTabs() {
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.main-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panelId = tab.dataset.mainTab + 'Panel';
                document.getElementById(panelId).classList.add('active');
                if (tab.dataset.mainTab === 'alldata') renderAllData();
            });
        });
    }

    /* ═══ Deselect-all buttons ══════════════════ */
    function bindDeselectButtons() {
        const catBreakdown = document.getElementById('catBreakdownDeselectAll');
        if (catBreakdown) {
            catBreakdown.addEventListener('click', () => {
                ChartManager.deselectAllLegend('categoryBreakdown');
            });
        }
        const catTrend = document.getElementById('catTrendDeselectAll');
        if (catTrend) {
            catTrend.addEventListener('click', () => {
                ChartManager.deselectAllLegend('categoryTrend');
            });
        }
    }

    /* ═══ Filter Summary ═══════════════════════ */
    function updateFilterSummary(data) {
        const filters = FilterManager.getFilters();
        const parts = [];
        if (filters.year) parts.push(`Year: ${filters.year}`);
        if (filters.month) {
            const names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            parts.push(`Month: ${names[parseInt(filters.month)]}`);
        }
        if (filters.categories.length > 0) parts.push(`Categories: ${filters.categories.length} selected`);
        if (filters.keyword) parts.push(`Keyword: "${filters.keyword}"`);

        const el = document.getElementById('filterSummary');
        const txt = document.getElementById('filterSummaryText');
        if (parts.length > 0) {
            el.style.display = 'flex';
            txt.textContent = `🔽 Showing ${data.length} of ${rawData.length} records — ${parts.join(' · ')}`;
        } else {
            el.style.display = 'none';
        }
    }

    /* ═══ KPIs (5 cards) ═══════════════════════ */
    function updateKPIs(data) {
        const total = data.reduce((s, d) => s + d.amount, 0);
        const count = data.length;
        const max = count ? Math.max(...data.map(d => d.amount)) : 0;

        // Top category
        const catMap = {};
        data.forEach(d => { catMap[d.category] = (catMap[d.category] || 0) + d.amount; });
        const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

        // Month-over-Month change
        const monthMap = {};
        data.forEach(d => { const k = d.date.substring(0, 7); monthMap[k] = (monthMap[k] || 0) + d.amount; });
        const monthKeys = Object.keys(monthMap).sort();
        let momText = '—';
        let momClass = '';
        if (monthKeys.length >= 2) {
            const curr = monthMap[monthKeys[monthKeys.length - 1]];
            const prev = monthMap[monthKeys[monthKeys.length - 2]];
            if (prev > 0) {
                const pct = ((curr - prev) / prev * 100).toFixed(1);
                momText = (pct > 0 ? '+' : '') + pct + '%';
                momClass = pct > 0 ? 'kpi-danger' : 'kpi-success';
            }
        }

        document.getElementById('kpiTotal').textContent = '₹' + Math.round(total).toLocaleString('en-IN');
        document.getElementById('kpiCount').textContent = count.toLocaleString('en-IN');
        document.getElementById('kpiMax').textContent = '₹' + Math.round(max).toLocaleString('en-IN');
        document.getElementById('kpiTopCat').textContent = topCat ? topCat[0] : '—';

        const momEl = document.getElementById('kpiMoM');
        momEl.textContent = momText;
        momEl.className = 'kpi-value ' + momClass;
    }

    /* ═══ Category Share Table ══════════════════ */
    function computeMedian(arr) {
        if (!arr.length) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }

    function getMonthlyMedians(allData, numMonths) {
        // Build per-category, per-month totals from ALL data
        const catMonthAmt = {};   // { cat: { '2025-03': amount, ... } }
        const catMonthCnt = {};   // { cat: { '2025-03': count, ... } }
        const allMonths = new Set();

        allData.forEach(d => {
            const m = d.date.substring(0, 7);
            allMonths.add(m);
            if (!catMonthAmt[d.category]) { catMonthAmt[d.category] = {}; catMonthCnt[d.category] = {}; }
            catMonthAmt[d.category][m] = (catMonthAmt[d.category][m] || 0) + d.amount;
            catMonthCnt[d.category][m] = (catMonthCnt[d.category][m] || 0) + 1;
        });

        // Get the last N months (sorted descending, take numMonths)
        const sortedMonths = [...allMonths].sort().reverse().slice(0, numMonths);

        const medianAmt = {};
        const medianCnt = {};
        for (const cat of Object.keys(catMonthAmt)) {
            const amts = sortedMonths.map(m => catMonthAmt[cat][m] || 0);
            const cnts = sortedMonths.map(m => catMonthCnt[cat][m] || 0);
            medianAmt[cat] = computeMedian(amts);
            medianCnt[cat] = computeMedian(cnts);
        }
        return { medianAmt, medianCnt };
    }

    function deviationBadge(current, median) {
        if (median === 0) return '<span class="dev-badge dev-neutral">—</span>';
        const pct = ((current - median) / median * 100).toFixed(0);
        const sign = pct > 0 ? '+' : '';
        const cls = pct > 10 ? 'dev-up' : pct < -10 ? 'dev-down' : 'dev-neutral';
        return `<span class="dev-badge ${cls}">${sign}${pct}%</span>`;
    }

    function updateCategoryShareTable(data, allData) {
        const catMap = {};
        const catCount = {};
        data.forEach(d => {
            catMap[d.category] = (catMap[d.category] || 0) + d.amount;
            catCount[d.category] = (catCount[d.category] || 0) + 1;
        });

        const total = data.reduce((s, d) => s + d.amount, 0);
        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const { medianAmt, medianCnt } = getMonthlyMedians(allData || data, 6);

        const tbody = document.getElementById('categoryShareBody');
        tbody.innerHTML = sorted.map(([cat, amt]) => {
            const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0';
            const txnCount = catCount[cat] || 0;
            const avgTxn = txnCount > 0 ? Math.round(amt / txnCount) : 0;
            const color = ChartManager.getColor(cat);
            const barWidth = total > 0 ? (amt / total * 100) : 0;

            const mAmt = Math.round(medianAmt[cat] || 0);
            const mCnt = Math.round(medianCnt[cat] || 0);

            return `<tr>
                <td><span class="category-badge" style="background:${color}18;color:${color};">${cat}</span></td>
                <td class="cell-with-sub">
                    <span style="font-weight:600;color:var(--accent);">₹${Number(amt).toLocaleString('en-IN')}</span>
                    <span class="sub-median">Med ₹${mAmt.toLocaleString('en-IN')} ${deviationBadge(amt, mAmt)}</span>
                </td>
                <td>
                    <div class="share-bar-container">
                        <div class="share-bar" style="width:${barWidth}%;background:${color};"></div>
                        <span>${pct}%</span>
                    </div>
                </td>
                <td class="cell-with-sub">
                    <span style="font-weight:600;">${txnCount}</span>
                    <span class="sub-median">Med ${mCnt} ${deviationBadge(txnCount, mCnt)}</span>
                </td>
                <td>₹${avgTxn.toLocaleString('en-IN')}</td>
            </tr>`;
        }).join('');

        const countEl = document.getElementById('categoryShareCount');
        if (countEl) countEl.textContent = `${sorted.length} categories`;
    }

    /* ═══ Transaction table (Filtered) ═════════ */
    function getTableData(data) {
        let out = data;
        if (tableCatFilter) out = out.filter(d => d.category === tableCatFilter);
        if (tableNoteFilter) {
            const q = tableNoteFilter.toLowerCase();
            out = out.filter(d => (d.note || '').toLowerCase().includes(q));
        }
        return out;
    }

    function populateTableCatDropdown(data) {
        const sel = document.getElementById('tableCatFilter');
        if (!sel) return;
        const cats = [...new Set(data.map(d => d.category))].sort();
        const cur = sel.value;
        sel.innerHTML = '<option value="">All Categories</option>';
        cats.forEach(c => {
            sel.innerHTML += `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`;
        });
    }

    function renderTable(data) {
        const tableData = getTableData(data);
        const sorted = [...tableData].sort((a, b) => {
            let va = a[sortCol], vb = b[sortCol];
            if (sortCol === 'amount') { va = +va; vb = +vb; }
            else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
            if (va < vb) return sortAsc ? -1 : 1;
            if (va > vb) return sortAsc ? 1 : -1;
            return 0;
        });

        const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        const page = sorted.slice(start, start + ROWS_PER_PAGE);

        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = page.map(d => {
            const clr = ChartManager.getColor(d.category);
            return `<tr>
        <td>${d.date}</td>
        <td style="font-weight:600;color:var(--accent);">₹${Number(d.amount).toLocaleString('en-IN')}</td>
        <td><span class="category-badge" style="background:${clr}18;color:${clr};">${d.category}</span></td>
        <td style="color:var(--text-secondary);">${d.note || '—'}</td>
      </tr>`;
        }).join('');

        document.getElementById('tableCount').textContent = `${tableData.length} of ${data.length} records`;
        renderPagination(totalPages, 'tablePagination', currentPage, (pg) => { currentPage = pg; renderTable(filteredData); });
    }

    function bindTableFilters() {
        const catSel = document.getElementById('tableCatFilter');
        if (catSel) {
            catSel.addEventListener('change', e => {
                tableCatFilter = e.target.value;
                currentPage = 1;
                renderTable(filteredData);
            });
        }
        const noteInput = document.getElementById('tableNoteFilter');
        if (noteInput) {
            let timer;
            noteInput.addEventListener('input', e => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    tableNoteFilter = e.target.value.trim();
                    currentPage = 1;
                    renderTable(filteredData);
                }, 250);
            });
        }
    }

    /* ═══ All Data Table ═══════════════════════ */
    function renderAllData() {
        let data = [...rawData];
        if (allDataSearch) {
            const s = allDataSearch.toLowerCase();
            data = data.filter(d =>
                d.date.toLowerCase().includes(s) ||
                d.category.toLowerCase().includes(s) ||
                (d.note || '').toLowerCase().includes(s) ||
                String(d.amount).includes(s)
            );
        }
        const sorted = data.map((d, i) => ({ ...d, _idx: i + 1 })).sort((a, b) => {
            let va, vb;
            if (allDataSortCol === 'index') { va = a._idx; vb = b._idx; }
            else if (allDataSortCol === 'amount') { va = +a.amount; vb = +b.amount; }
            else { va = String(a[allDataSortCol] || '').toLowerCase(); vb = String(b[allDataSortCol] || '').toLowerCase(); }
            if (va < vb) return allDataSortAsc ? -1 : 1;
            if (va > vb) return allDataSortAsc ? 1 : -1;
            return 0;
        });

        const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
        if (allDataPage > totalPages) allDataPage = totalPages;
        const start = (allDataPage - 1) * ROWS_PER_PAGE;
        const page = sorted.slice(start, start + ROWS_PER_PAGE);

        const tbody = document.getElementById('alldataBody');
        tbody.innerHTML = page.map(d => {
            const clr = ChartManager.getColor(d.category);
            return `<tr>
        <td style="color:var(--text-tertiary);font-size:12px;">${d._idx}</td>
        <td>${d.date}</td>
        <td style="font-weight:600;color:var(--accent);">₹${Number(d.amount).toLocaleString('en-IN')}</td>
        <td><span class="category-badge" style="background:${clr}18;color:${clr};">${d.category}</span></td>
        <td style="color:var(--text-secondary);">${d.note || '—'}</td>
      </tr>`;
        }).join('');

        document.getElementById('alldataCount').textContent = `${data.length} records`;
        renderPagination(totalPages, 'alldataPagination', allDataPage, (pg) => { allDataPage = pg; renderAllData(); });
    }

    function bindAllDataTable() {
        document.querySelectorAll('#alldataTable th[data-allsort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.allsort;
                if (allDataSortCol === col) allDataSortAsc = !allDataSortAsc;
                else { allDataSortCol = col; allDataSortAsc = true; }
                renderAllData();
            });
        });
        let searchTimer;
        document.getElementById('alldataSearch').addEventListener('input', e => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                allDataSearch = e.target.value.trim();
                allDataPage = 1;
                renderAllData();
            }, 250);
        });
    }

    /* ═══ Shared Pagination ════════════════════ */
    function renderPagination(totalPages, containerId, activePage, onPageClick) {
        const cont = document.getElementById(containerId);
        if (totalPages <= 1) { cont.innerHTML = ''; return; }
        let html = '';
        html += `<button class="page-btn" ${activePage === 1 ? 'disabled' : ''} data-page="${activePage - 1}">‹</button>`;
        for (let p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - activePage) > 1) {
                if (p === 3 || p === totalPages - 2) html += `<span style="color:var(--text-tertiary);padding:0 4px;">…</span>`;
                continue;
            }
            html += `<button class="page-btn ${p === activePage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }
        html += `<button class="page-btn" ${activePage === totalPages ? 'disabled' : ''} data-page="${activePage + 1}">›</button>`;
        cont.innerHTML = html;
        cont.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pg = parseInt(btn.dataset.page);
                if (pg >= 1 && pg <= totalPages) onPageClick(pg);
            });
        });
    }

    function bindTable() {
        document.querySelectorAll('#transactionTable th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = true; }
                renderTable(filteredData);
            });
        });

        // Entries per page
        const entriesSel = document.getElementById('filteredEntriesSelect');
        if (entriesSel) {
            entriesSel.addEventListener('change', e => {
                ROWS_PER_PAGE = parseInt(e.target.value);
                currentPage = 1;
                renderTable(filteredData);
            });
        }
    }

    /* ═══ Drawer ════════════════════════════════ */
    function bindDrawer() {
        const drawer = document.getElementById('dataDrawer');
        const overlay = document.getElementById('overlay');
        const open = () => { drawer.classList.add('open'); overlay.classList.add('active'); };
        const close = () => { drawer.classList.remove('open'); overlay.classList.remove('active'); };

        document.getElementById('manageData').addEventListener('click', open);
        document.getElementById('emptyStateBtn').addEventListener('click', open);
        document.getElementById('drawerClose').addEventListener('click', close);
        overlay.addEventListener('click', close);

        // Tabs
        document.querySelectorAll('.data-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.data-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.data-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
            });
        });

        // Google Sheets connect
        document.getElementById('connectSheets').addEventListener('click', async () => {
            const url = document.getElementById('sheetsUrl').value.trim();
            if (!url) { toast('Please enter a Google Sheets URL', 'error'); return; }
            const status = document.getElementById('connectionStatus');
            status.className = 'connection-status loading';
            status.textContent = '⏳ Connecting…';
            try {
                const records = await DataManager.fetchFromGoogleSheets(url);
                if (!records.length) throw new Error('No valid records found');
                DataManager.saveUrl(url);
                status.className = 'connection-status success';
                status.textContent = `✓ Connected — ${records.length} records fetched`;
                onDataLoaded(records, 'Google Sheets');
            } catch (e) {
                status.className = 'connection-status error';
                status.textContent = `✗ ${e.message}`;
                toast(e.message, 'error');
            }
        });

        // CSV paste
        document.getElementById('loadPaste').addEventListener('click', () => {
            const text = document.getElementById('csvPaste').value.trim();
            if (!text) { toast('Please paste CSV data', 'error'); return; }
            const records = DataManager.parseCSV(text);
            if (!records.length) { toast('No valid records found in pasted data', 'error'); return; }
            onDataLoaded(records, 'CSV paste');
            document.getElementById('csvPaste').value = '';
        });

        // File upload
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--accent)'; });
        uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
        uploadZone.addEventListener('drop', e => {
            e.preventDefault(); uploadZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
        });
        fileInput.addEventListener('change', () => { if (fileInput.files[0]) readFile(fileInput.files[0]); });

        function readFile(file) {
            const reader = new FileReader();
            reader.onload = () => {
                const records = DataManager.parseCSV(reader.result);
                if (!records.length) { toast('No valid records in file', 'error'); return; }
                onDataLoaded(records, file.name);
            };
            reader.readAsText(file);
        }

        // Clear data
        document.getElementById('clearData').addEventListener('click', () => {
            DataManager.clearData();
            rawData = [];
            filteredData = [];
            FilterManager.reset();
            showEmpty();
            toast('All data cleared', 'info');
        });
    }

    /* ═══ Filters ═══════════════════════════════ */
    function bindFilters() {
        document.getElementById('filterYear').addEventListener('change', e => {
            FilterManager.setYear(e.target.value);
            FilterManager.populateMonths(rawData);
            FilterManager.populateCategories(rawData);
            refresh();
        });

        document.getElementById('filterMonth').addEventListener('change', e => {
            FilterManager.setMonth(e.target.value);
            FilterManager.populateCategories(rawData);
            refresh();
        });

        // Category multi-select
        const catBtn = document.getElementById('categoryBtn');
        const catDD = document.getElementById('categoryDropdown');
        catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            catDD.classList.toggle('open');
            catBtn.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select')) {
                catDD.classList.remove('open');
                catBtn.classList.remove('active');
            }
        });
        // Checkbox change handler
        catDD.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;
            const checked = [...catDD.querySelectorAll('#categoryList input:checked')].map(c => c.value);
            const all = [...catDD.querySelectorAll('#categoryList input')];
            FilterManager.setCategories(checked.length === all.length ? [] : checked);
            FilterManager.updateCategoryBtnText();
            refresh();
        });

        // Category search
        document.getElementById('categorySearch').addEventListener('input', e => {
            const q = e.target.value.trim().toLowerCase();
            document.querySelectorAll('#categoryList .multi-select-item').forEach(item => {
                const label = item.textContent.toLowerCase();
                item.style.display = label.includes(q) ? '' : 'none';
            });
        });

        // Select All
        document.getElementById('catSelectAll').addEventListener('click', () => {
            document.querySelectorAll('#categoryList input[type="checkbox"]').forEach(cb => { cb.checked = true; });
            FilterManager.setCategories([]);
            FilterManager.updateCategoryBtnText();
            refresh();
        });

        // Clear All
        document.getElementById('catClearAll').addEventListener('click', () => {
            document.querySelectorAll('#categoryList input[type="checkbox"]').forEach(cb => { cb.checked = false; });
            const empty = [];
            FilterManager.setCategories(empty);
            FilterManager.updateCategoryBtnText();
            refresh();
        });

        // Keyword
        let kwTimer;
        document.getElementById('filterKeyword').addEventListener('input', e => {
            clearTimeout(kwTimer);
            kwTimer = setTimeout(() => {
                FilterManager.setKeyword(e.target.value.trim());
                refresh();
            }, 250);
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', () => {
            FilterManager.reset();
            refresh();
        });
    }

    /* ═══ Chart switchers ═══════════════════════ */
    function bindChartSwitchers() {
        document.querySelectorAll('.chart-switcher').forEach(sel => {
            sel.addEventListener('change', e => {
                if (e.target.dataset.chart) {
                    ChartManager.setChartType(e.target.dataset.chart, e.target.value);
                }
            });
        });

        // Top-N selector
        const topNSel = document.getElementById('topNSelect');
        if (topNSel) {
            topNSel.addEventListener('change', e => {
                ChartManager.setTopN(parseInt(e.target.value));
                ChartManager.refreshTopExpenses();
            });
        }
    }

    /* ═══ Toast ═════════════════════════════════ */
    function toast(msg, type = 'info') {
        const cont = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        cont.appendChild(el);
        setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3500);
    }

    return { init, getFilteredData };
})();

/* ── Boot ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', App.init);
