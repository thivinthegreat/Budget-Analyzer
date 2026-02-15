/* ──────────────────────────────────────────────
   FilterManager — Year / Month / Category / Keyword
   ────────────────────────────────────────────── */
const FilterManager = (() => {
    let activeFilters = { year: '', month: '', categories: [], keyword: '' };
    let allData = [];

    /* ── Populate dropdowns from data ──────── */
    function populate(data) {
        allData = data;
        populateYears();
        populateMonths();
        populateCategories();
    }

    function populateYears() {
        const years = [...new Set(allData.map(d => d.date.substring(0, 4)))].sort().reverse();
        const el = document.getElementById('filterYear');
        const cur = el.value;
        el.innerHTML = '<option value="">All Years</option>';
        years.forEach(y => {
            el.innerHTML += `<option value="${y}" ${y === cur ? 'selected' : ''}>${y}</option>`;
        });
    }

    function populateMonths() {
        const el = document.getElementById('filterMonth');
        const cur = el.value;
        let subset = allData;
        if (activeFilters.year) subset = subset.filter(d => d.date.startsWith(activeFilters.year));

        const months = [...new Set(subset.map(d => parseInt(d.date.substring(5, 7))))].sort((a, b) => a - b);
        const names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        el.innerHTML = '<option value="">All Months</option>';
        months.forEach(m => {
            const val = String(m).padStart(2, '0');
            el.innerHTML += `<option value="${val}" ${val === cur ? 'selected' : ''}>${names[m]}</option>`;
        });
    }

    function populateCategories() {
        let subset = allData;
        if (activeFilters.year) subset = subset.filter(d => d.date.startsWith(activeFilters.year));
        if (activeFilters.month) subset = subset.filter(d => d.date.substring(5, 7) === activeFilters.month);

        const cats = [...new Set(subset.map(d => d.category))].sort();
        const listEl = document.getElementById('categoryList');
        listEl.innerHTML = '';
        cats.forEach(cat => {
            const checked = activeFilters.categories.length === 0 || activeFilters.categories.includes(cat);
            const lbl = document.createElement('label');
            lbl.className = 'multi-select-item';
            lbl.innerHTML = `<input type="checkbox" value="${cat}" ${checked ? 'checked' : ''}> ${cat}`;
            listEl.appendChild(lbl);
        });
        updateCategoryBtnText();
    }

    function updateCategoryBtnText() {
        const btn = document.getElementById('categoryBtn');
        const boxes = document.querySelectorAll('#categoryList input[type="checkbox"]');
        const checked = [...boxes].filter(c => c.checked);
        if (checked.length === boxes.length || checked.length === 0) btn.textContent = 'All Categories';
        else if (checked.length === 1) btn.textContent = checked[0].value;
        else btn.textContent = `${checked.length} categories`;
    }

    /* ── Apply filters to data ─────────────── */
    function apply(data) {
        let out = data;
        if (activeFilters.year) out = out.filter(d => d.date.startsWith(activeFilters.year));
        if (activeFilters.month) out = out.filter(d => d.date.substring(5, 7) === activeFilters.month);
        if (activeFilters.categories.length > 0) out = out.filter(d => activeFilters.categories.includes(d.category));
        if (activeFilters.keyword) {
            const kw = activeFilters.keyword.toLowerCase();
            out = out.filter(d => d.note.toLowerCase().includes(kw));
        }
        return out;
    }

    /* ── Setters ────────────────────────────── */
    function setYear(v) { activeFilters.year = v; }
    function setMonth(v) { activeFilters.month = v; }
    function setCategories(v) { activeFilters.categories = v; }
    function setKeyword(v) { activeFilters.keyword = v; }
    function getFilters() { return { ...activeFilters }; }

    function reset() {
        activeFilters = { year: '', month: '', categories: [], keyword: '' };
        document.getElementById('filterYear').value = '';
        document.getElementById('filterMonth').value = '';
        document.getElementById('filterKeyword').value = '';
        document.querySelectorAll('#categoryList input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateCategoryBtnText();
    }

    return {
        populate, populateMonths, populateCategories, apply,
        setYear, setMonth, setCategories, setKeyword, getFilters, reset, updateCategoryBtnText
    };
})();
