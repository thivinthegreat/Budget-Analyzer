/* ──────────────────────────────────────────────
   DataManager — CSV parsing, Google Sheets fetch, localStorage
   ────────────────────────────────────────────── */
const DataManager = (() => {
    const STORAGE_DATA = 'spendlens-data';
    const STORAGE_URL = 'spendlens-sheets-url';
    let data = [];

    /* ── Initialise ─────────────────────────── */
    function init() {
        const stored = localStorage.getItem(STORAGE_DATA);
        if (stored) {
            try { data = JSON.parse(stored); } catch (_) { data = []; }
        }
        const savedUrl = localStorage.getItem(STORAGE_URL);
        if (savedUrl) {
            const el = document.getElementById('sheetsUrl');
            if (el) el.value = savedUrl;
        }
        return data;
    }

    /* ── CSV parsing ────────────────────────── */
    function parseCSV(text) {
        if (!text || !text.trim()) return [];

        // Auto-detect delimiter
        const firstLine = text.trim().split('\n')[0];
        let delimiter = ',';
        if (firstLine.split('\t').length > firstLine.split(',').length) delimiter = '\t';
        else if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';';

        const lines = text.trim().split('\n');
        const parsed = [];

        // Detect header row
        let startIdx = 0;
        const headerLower = lines[0].toLowerCase();
        if (headerLower.includes('date') || headerLower.includes('amount') || headerLower.includes('category')) {
            startIdx = 1;
        }

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = splitCSVLine(line, delimiter);
            if (parts.length < 3) continue;

            const dateStr = (parts[0] || '').trim();
            // Robust amount cleaning: strip quotes, ₹, commas, spaces
            const rawAmt = (parts[1] || '').trim()
                .replace(/^["']+|["']+$/g, '')   // strip surrounding quotes
                .replace(/₹/g, '')                // strip rupee symbol
                .replace(/,/g, '')                // strip commas
                .replace(/\s/g, '')               // strip whitespace
                .replace(/\.00$/, '');             // strip trailing .00
            const amount = parseFloat(rawAmt);
            const category = (parts[2] || '').trim();
            const note = (parts[3] || '').trim();

            if (!dateStr || isNaN(amount) || !category) continue;

            const date = parseDate(dateStr);
            if (!date) continue;

            parsed.push({
                date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                amount,
                category,
                note
            });
        }
        return parsed;
    }

    function splitCSVLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === delimiter && !inQuotes) { result.push(current); current = ''; }
            else { current += ch; }
        }
        result.push(current);
        return result;
    }

    function parseDate(str) {
        // YYYY-MM-DD
        let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

        // DD/MM/YYYY or DD-MM-YYYY (4-digit year)
        m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            const a = +m[1], b = +m[2], y = +m[3];
            if (a > 12) return new Date(y, b - 1, a);          // DD/MM/YYYY
            if (b > 12) return new Date(y, a - 1, b);          // MM/DD/YYYY
            return new Date(y, b - 1, a);                       // default DD/MM/YYYY
        }

        // DD/MM/YY or DD-MM-YY (2-digit year)
        m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
        if (m) {
            const day = +m[1], month = +m[2], yy = +m[3];
            const year = yy <= 50 ? 2000 + yy : 1900 + yy;
            return new Date(year, month - 1, day);
        }

        // Fallback native
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    /* ── Google Sheets ──────────────────────── */
    async function fetchFromGoogleSheets(url) {
        let csvUrl = url;
        if (url.includes('docs.google.com/spreadsheets')) {
            const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (idMatch) {
                const gidMatch = url.match(/gid=(\d+)/);
                const gid = gidMatch ? gidMatch[1] : '0';
                csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
            }
        }
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return parseCSV(text);
    }

    /* ── Storage helpers ────────────────────── */
    function saveData(newData) {
        data = newData;
        localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
    }

    function appendData(newData) {
        const existing = new Set(data.map(d => `${d.date}|${d.amount}|${d.category}|${d.note}`));
        const unique = newData.filter(d => !existing.has(`${d.date}|${d.amount}|${d.category}|${d.note}`));
        data = [...data, ...unique];
        localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
        return { total: data.length, added: unique.length };
    }

    function clearData() {
        data = [];
        localStorage.removeItem(STORAGE_DATA);
        localStorage.removeItem(STORAGE_URL);
    }

    function getData() { return data; }
    function saveUrl(url) { localStorage.setItem(STORAGE_URL, url); }

    return { init, parseCSV, fetchFromGoogleSheets, saveData, appendData, clearData, getData, saveUrl };
})();
