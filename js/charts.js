/* ──────────────────────────────────────────────
   Charts — Chart.js rendering
   ────────────────────────────────────────────── */
const ChartManager = (() => {
    const charts = {};
    let topNCount = 10;
    const chartTypes = {
        monthlyTrend: 'line', categoryBreakdown: 'doughnut',
        dailySpending: 'bar', topExpenses: 'bar',
        categoryTrend: 'bar', dayOfWeek: 'bar',
        cumulativeSpend: 'line',
    };

    const COLORS = [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6',
        '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#06b6d4',
        '#84cc16', '#d946ef', '#0ea5e9', '#22c55e', '#a855f7',
        '#e11d48', '#0891b2', '#65a30d', '#c026d3', '#2563eb',
        '#16a34a', '#ca8a04', '#7c3aed', '#ea580c',
    ];
    const CATEGORY_COLORS = {};

    function getColor(category) {
        if (!CATEGORY_COLORS[category]) {
            CATEGORY_COLORS[category] = COLORS[Object.keys(CATEGORY_COLORS).length % COLORS.length];
        }
        return CATEGORY_COLORS[category];
    }

    /* ── Theme helpers ───────────────────────── */
    function tc() {
        const s = getComputedStyle(document.documentElement);
        return {
            text: s.getPropertyValue('--text-primary').trim(),
            secondary: s.getPropertyValue('--text-secondary').trim(),
            tertiary: s.getPropertyValue('--text-tertiary').trim(),
            border: s.getPropertyValue('--border').trim(),
            accent: s.getPropertyValue('--accent').trim(),
        };
    }

    /* High-contrast color for data labels */
    function dlColor() {
        const isDark = document.documentElement.dataset.theme === 'dark';
        return isDark ? '#e2e8f0' : '#1e293b';
    }

    function baseOpts() {
        const t = tc();
        return {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            scales: {
                x: { ticks: { color: t.tertiary, font: { size: 11 } }, grid: { color: t.border + '33' } },
                y: { ticks: { color: t.tertiary, font: { size: 11 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, grid: { color: t.border + '33' } },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: t.text + 'ee', titleColor: '#fff', bodyColor: '#fff',
                    padding: 12, cornerRadius: 8, displayColors: true,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label || ''}: ₹${Number(ctx.parsed.y || ctx.parsed).toLocaleString('en-IN')}`,
                    },
                },
                datalabels: { display: false },
            },
        };
    }

    function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

    /* ═══ Monthly Trend ═══════════════════════ */
    function renderMonthlyTrend(data) {
        destroyChart('monthlyTrend');
        const type = chartTypes.monthlyTrend;
        const map = {};
        data.forEach(d => { const m = d.date.substring(0, 7); map[m] = (map[m] || 0) + d.amount; });
        const months = Object.keys(map).sort();
        const values = months.map(m => map[m]);
        const t = tc();
        const ctx = document.getElementById('chartMonthlyTrend').getContext('2d');
        let bgColor = t.accent + '88';
        if (type === 'line') {
            const g = ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, t.accent + '30'); g.addColorStop(1, t.accent + '02');
            bgColor = g;
        }
        charts.monthlyTrend = new Chart(ctx, {
            type,
            data: {
                labels: months.map(m => { const d = new Date(m + '-01'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }),
                datasets: [{ label: 'Spending', data: values, backgroundColor: bgColor, borderColor: t.accent, borderWidth: 2, fill: type === 'line', tension: 0.3, pointRadius: values.length > 12 ? 0 : 4, pointBackgroundColor: t.accent, borderRadius: type === 'bar' ? 6 : 0 }]
            },
            options: baseOpts(),
        });
    }

    /* ═══ Category Breakdown ══════════════════ */
    function renderCategoryBreakdown(data) {
        destroyChart('categoryBreakdown');
        const type = chartTypes.categoryBreakdown;
        const map = {};
        data.forEach(d => { map[d.category] = (map[d.category] || 0) + d.amount; });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(s => s[0]);
        const values = sorted.map(s => s[1]);
        const colors = labels.map(l => getColor(l));
        const t = tc();

        const isPie = type === 'doughnut' || type === 'pie';

        // Default: only top 10 visible, rest hidden
        const hiddenIndices = new Set();
        if (labels.length > 10) {
            for (let i = 10; i < labels.length; i++) hiddenIndices.add(i);
        }

        const ctx = document.getElementById('chartCategoryBreakdown').getContext('2d');

        if (isPie) {
            charts.categoryBreakdown = new Chart(ctx, {
                type,
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.map(c => c + 'cc'),
                        borderColor: colors, borderWidth: 2,
                        hoverOffset: 12,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutQuart' },
                    cutout: type === 'doughnut' ? '55%' : 0,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { color: t.secondary, padding: 12, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' },
                        },
                        tooltip: {
                            backgroundColor: t.text + 'ee', titleColor: '#fff', bodyColor: '#fff',
                            padding: 12, cornerRadius: 8,
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                                    const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                    return ` ${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN')} (${pct}%)`;
                                },
                            },
                        },
                        datalabels: {
                            display: 'auto',
                            color: '#fff',
                            font: { weight: 'bold', size: 11 },
                            textShadowColor: 'rgba(0,0,0,0.4)',
                            textShadowBlur: 4,
                            formatter: (val) => '₹' + Number(val).toLocaleString('en-IN'),
                            anchor: 'center',
                            align: 'center',
                            clamp: true,
                        },
                    },
                },
                plugins: [ChartDataLabels],
            });
            // Hide indices beyond top 10
            hiddenIndices.forEach(i => {
                const meta = charts.categoryBreakdown.getDatasetMeta(0);
                if (meta.data[i]) meta.data[i].hidden = true;
            });
            charts.categoryBreakdown.update();
        } else {
            // Bar chart — horizontal with categories on y-axis
            charts.categoryBreakdown = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Spending',
                        data: values,
                        backgroundColor: colors.map(c => c + '99'),
                        borderColor: colors,
                        borderWidth: 1,
                        borderRadius: 4,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutQuart' },
                    scales: {
                        x: {
                            ticks: { color: t.tertiary, font: { size: 11 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') },
                            grid: { color: t.border + '33' },
                        },
                        y: {
                            ticks: { color: t.secondary, font: { size: 11, weight: '500' } },
                            grid: { display: false },
                        },
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: t.secondary, padding: 12, font: { size: 11 }, generateLabels: chart => {
                                    return chart.data.labels.map((label, i) => ({
                                        text: label, fillStyle: colors[i], strokeStyle: colors[i], hidden: false,
                                        index: i,
                                    }));
                                }
                            },
                            onClick: (e, legendItem, legend) => {
                                const idx = legendItem.index;
                                const chart = legend.chart;
                                const meta = chart.getDatasetMeta(0);
                                if (meta.data[idx]) {
                                    meta.data[idx].hidden = !meta.data[idx].hidden;
                                }
                                chart.update();
                            },
                        },
                        tooltip: {
                            backgroundColor: t.text + 'ee', titleColor: '#fff', bodyColor: '#fff',
                            padding: 12, cornerRadius: 8,
                            callbacks: {
                                label: ctx => ` ₹${Number(ctx.parsed.x).toLocaleString('en-IN')}`,
                            },
                        },
                        datalabels: {
                            display: 'auto',
                            color: dlColor(),
                            font: { weight: 'bold', size: 11 },
                            anchor: 'end',
                            align: 'end',
                            formatter: (val) => '₹' + Number(val).toLocaleString('en-IN'),
                        },
                    },
                },
                plugins: [ChartDataLabels],
            });
            // Hide indices beyond top 10
            hiddenIndices.forEach(i => {
                const meta = charts.categoryBreakdown.getDatasetMeta(0);
                if (meta.data[i]) meta.data[i].hidden = true;
            });
            charts.categoryBreakdown.update();
        }
    }

    /* ═══ Daily Spending ═════════════════════ */
    function renderDailySpending(data) {
        destroyChart('dailySpending');
        const type = chartTypes.dailySpending;
        const map = {};
        data.forEach(d => { map[d.date] = (map[d.date] || 0) + d.amount; });
        const dates = Object.keys(map).sort();
        const values = dates.map(d => map[d]);
        const t = tc();
        const ctx = document.getElementById('chartDailySpending').getContext('2d');
        const bgColor = type === 'line'
            ? (() => { const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#3b82f630'); g.addColorStop(1, '#3b82f602'); return g; })()
            : '#3b82f699';
        charts.dailySpending = new Chart(ctx, {
            type,
            data: {
                labels: dates.map(l => { const d = new Date(l); return `${d.getDate()}/${d.getMonth() + 1}`; }),
                datasets: [{ label: 'Daily', data: values, backgroundColor: bgColor, borderColor: '#3b82f6', borderWidth: 2, fill: type === 'line', tension: 0.3, pointRadius: 0, borderRadius: type === 'bar' ? 4 : 0 }]
            },
            options: baseOpts(),
        });
    }

    /* ═══ Top N Expenses ═════════════════════ */
    function renderTopExpenses(data) {
        destroyChart('topExpenses');
        const type = chartTypes.topExpenses;
        const top = [...data].sort((a, b) => b.amount - a.amount).slice(0, topNCount);

        // Update title
        const titleEl = document.getElementById('topExpensesTitle');
        if (titleEl) titleEl.textContent = `Top ${topNCount} Expenses`;

        // Adjust container height based on count
        const bodyEl = document.getElementById('topExpensesBody');
        if (bodyEl) {
            if (topNCount <= 10) bodyEl.style.height = '420px';
            else if (topNCount <= 20) bodyEl.style.height = '650px';
            else bodyEl.style.height = '1200px';
        }

        const tableEl = document.getElementById('topExpensesTable');
        const canvasEl = document.getElementById('chartTopExpenses');

        if (type === 'table') {
            canvasEl.style.display = 'none';
            tableEl.style.display = 'block';
            tableEl.innerHTML = `<table><thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Note</th></tr></thead><tbody>` +
                top.map(d => `<tr><td>${d.date}</td><td class="amount-cell">₹${Number(d.amount).toLocaleString('en-IN')}</td><td><span class="category-badge" style="background:${getColor(d.category)}18;color:${getColor(d.category)}">${d.category}</span></td><td>${d.note || '—'}</td></tr>`).join('') +
                `</tbody></table>`;
            return;
        }

        tableEl.style.display = 'none';
        canvasEl.style.display = 'block';

        // Y-axis: "Note (Category)" format
        const labels = top.map(d => {
            const note = d.note ? (d.note.length > 25 ? d.note.substring(0, 25) + '…' : d.note) : '—';
            return `${note} (${d.category})`;
        });
        const colors = top.map(d => getColor(d.category));
        const t = tc();

        charts.topExpenses = new Chart(document.getElementById('chartTopExpenses').getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Amount',
                    data: top.map(d => d.amount),
                    backgroundColor: colors.map(c => c + '99'),
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 600 },
                scales: {
                    x: {
                        ticks: { color: t.tertiary, font: { size: 11 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') },
                        grid: { color: t.border + '33' },
                    },
                    y: {
                        ticks: { color: t.secondary, font: { size: 11, weight: '500' } },
                        grid: { display: false },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: t.text + 'ee', titleColor: '#fff', bodyColor: '#fff',
                        padding: 14, cornerRadius: 8,
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                const d = top[idx];
                                return d.category;
                            },
                            label: (ctx) => {
                                const idx = ctx.dataIndex;
                                const d = top[idx];
                                return [
                                    `Date: ${d.date}`,
                                    `Amount: ₹${Number(d.amount).toLocaleString('en-IN')}`,
                                    `Note: ${d.note || '—'}`,
                                ];
                            },
                        },
                    },
                    datalabels: {
                        display: 'auto',
                        color: dlColor(),
                        font: { weight: 'bold', size: 11 },
                        anchor: 'end',
                        align: 'end',
                        formatter: v => '₹' + Number(v).toLocaleString('en-IN'),
                    },
                },
            },
            plugins: [ChartDataLabels],
        });
    }

    /* ═══ Category Trend ════════════════════ */
    function renderCategoryTrend(data) {
        destroyChart('categoryTrend');
        const type = chartTypes.categoryTrend;
        const map = {};
        const cats = new Set();
        data.forEach(d => { const m = d.date.substring(0, 7); if (!map[m]) map[m] = {}; map[m][d.category] = (map[m][d.category] || 0) + d.amount; cats.add(d.category); });
        const months = Object.keys(map).sort();
        const catArr = [...cats];
        const t = tc();

        const datasets = catArr.map(cat => {
            const color = getColor(cat);
            return {
                label: cat, data: months.map(m => map[m]?.[cat] || 0),
                backgroundColor: color + '88', borderColor: color, borderWidth: 1,
                fill: type === 'line' ? 'origin' : undefined,
                tension: 0.3, pointRadius: 0,
                stack: 'a',
            };
        });

        charts.categoryTrend = new Chart(document.getElementById('chartCategoryTrend').getContext('2d'), {
            type,
            data: { labels: months.map(m => { const d = new Date(m + '-01'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }), datasets },
            options: {
                ...baseOpts(),
                scales: {
                    ...baseOpts().scales,
                    x: { ...baseOpts().scales.x, stacked: true },
                    y: { ...baseOpts().scales.y, stacked: true },
                },
                plugins: {
                    ...baseOpts().plugins,
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: t.secondary, padding: 10, font: { size: 11 }, usePointStyle: true, pointStyle: 'rect' },
                    },
                },
            },
        });
    }

    /* ═══ Day of Week ═══════════════════════ */
    function renderDayOfWeek(data) {
        destroyChart('dayOfWeek');
        const type = chartTypes.dayOfWeek;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const totals = [0, 0, 0, 0, 0, 0, 0];
        const counts = [0, 0, 0, 0, 0, 0, 0];
        data.forEach(d => { const dow = new Date(d.date).getDay(); totals[dow] += d.amount; counts[dow]++; });
        const avg = totals.map((t, i) => counts[i] ? t / counts[i] : 0);
        const t = tc();
        const dayColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];
        charts.dayOfWeek = new Chart(document.getElementById('chartDayOfWeek').getContext('2d'), {
            type,
            data: { labels: days, datasets: [{ label: 'Avg Spend', data: avg, backgroundColor: dayColors.map(c => c + '80'), borderColor: dayColors, borderWidth: 2, pointBackgroundColor: dayColors, borderRadius: type === 'bar' ? 6 : 0 }] },
            options: type === 'radar'
                ? { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: baseOpts().plugins.tooltip, datalabels: { display: false } }, scales: { r: { ticks: { color: t.tertiary }, grid: { color: t.border + '33' }, pointLabels: { color: t.secondary, font: { size: 12 } } } } }
                : baseOpts(),
        });
    }

    /* ═══ Cumulative Spend ══════════════════ */
    function renderCumulativeSpend(data) {
        destroyChart('cumulativeSpend');
        const type = chartTypes.cumulativeSpend;
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const map = {};
        sorted.forEach(d => { map[d.date] = (map[d.date] || 0) + d.amount; });
        const dates = Object.keys(map).sort();
        let cumulative = 0;
        const values = dates.map(d => { cumulative += map[d]; return cumulative; });
        const ctx = document.getElementById('chartCumulativeSpend').getContext('2d');
        let bgColor = 'rgba(16,185,129,0.7)';
        if (type === 'line') {
            const g = ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(16,185,129,0.25)'); g.addColorStop(1, 'rgba(16,185,129,0.01)');
            bgColor = g;
        }
        charts.cumulativeSpend = new Chart(ctx, {
            type,
            data: {
                labels: dates.map(l => { const d = new Date(l); return `${d.getDate()}/${d.getMonth() + 1}`; }),
                datasets: [{ label: 'Cumulative Spend', data: values, backgroundColor: bgColor, borderColor: '#10b981', borderWidth: 2, fill: type === 'line', tension: 0.3, pointRadius: type === 'line' ? (values.length > 30 ? 0 : 3) : 0, pointBackgroundColor: '#10b981', borderRadius: type === 'bar' ? 4 : 0 }]
            },
            options: { ...baseOpts(), plugins: { ...baseOpts().plugins, legend: { display: false }, datalabels: { display: false } } },
        });
    }

    /* ═══ Heatmap (custom HTML) ═════════════ */
    function renderHeatmap(data) {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekMap = {};
        let maxVal = 0;
        data.forEach(d => {
            const dt = new Date(d.date);
            const dow = dt.getDay();
            const startOfYear = new Date(dt.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((dt - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
            const wKey = `${dt.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
            const key = `${wKey}-${dow}`;
            weekMap[key] = (weekMap[key] || 0) + d.amount;
            if (weekMap[key] > maxVal) maxVal = weekMap[key];
        });
        const weeks = [...new Set(Object.keys(weekMap).map(k => k.substring(0, k.lastIndexOf('-'))))].sort();
        const isDark = document.documentElement.dataset.theme === 'dark';
        let html = '<div class="heatmap-grid">';
        // Header row
        html += '<div class="heatmap-row"><div class="heatmap-label"></div>';
        weeks.forEach((_, i) => { html += `<div class="heatmap-cell-header">${i % 4 === 0 ? 'W' + (i + 1) : ''}</div>`; });
        html += '</div>';
        dayNames.forEach((day, dow) => {
            html += `<div class="heatmap-row"><div class="heatmap-label">${day}</div>`;
            weeks.forEach(w => {
                const key = `${w}-${dow}`;
                const val = weekMap[key] || 0;
                const intensity = maxVal ? val / maxVal : 0;
                let bg;
                if (val === 0) bg = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(0,0,0,0.04)';
                else {
                    const alpha = 0.15 + intensity * 0.85;
                    bg = isDark ? `rgba(99,102,241,${alpha})` : `rgba(99,102,241,${alpha})`;
                }
                const title = val > 0 ? `${day}, ${w}: ₹${Number(val).toLocaleString('en-IN')}` : `${day}, ${w}: No spending`;
                html += `<div class="heatmap-cell" style="background:${bg}" title="${title}"></div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        html += '<div class="heatmap-legend"><span>Less</span>';
        [0.1, 0.3, 0.5, 0.7, 1.0].forEach(v => {
            const a = isDark ? `rgba(99,102,241,${0.15 + v * 0.85})` : `rgba(99,102,241,${0.15 + v * 0.85})`;
            html += `<div class="heatmap-legend-cell" style="background:${a}"></div>`;
        });
        html += '<span>More</span></div>';
        container.innerHTML = html;
    }

    /* ═══ Deselect all legend items ═════════ */
    function deselectAllLegend(chartKey) {
        const chart = charts[chartKey];
        if (!chart) return;

        if (chartKey === 'categoryBreakdown') {
            const type = chartTypes.categoryBreakdown;
            if (type === 'doughnut' || type === 'pie') {
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach(d => d.hidden = true);
            } else {
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach(d => d.hidden = true);
            }
        } else {
            // For multi-dataset charts like categoryTrend
            chart.data.datasets.forEach((ds, i) => {
                chart.setDatasetVisibility(i, false);
            });
        }
        chart.update();
    }

    /* ═══ Public API ═══════════════════════ */
    function updateAll(data) {
        renderMonthlyTrend(data);
        renderCategoryBreakdown(data);
        renderDailySpending(data);
        renderTopExpenses(data);
        renderCategoryTrend(data);
        renderDayOfWeek(data);
        renderCumulativeSpend(data);
        renderHeatmap(data);
    }

    function setChartType(chart, type) {
        chartTypes[chart] = type;
        const data = App.getFilteredData();
        switch (chart) {
            case 'monthlyTrend': renderMonthlyTrend(data); break;
            case 'categoryBreakdown': renderCategoryBreakdown(data); break;
            case 'dailySpending': renderDailySpending(data); break;
            case 'topExpenses': renderTopExpenses(data); break;
            case 'categoryTrend': renderCategoryTrend(data); break;
            case 'dayOfWeek': renderDayOfWeek(data); break;
            case 'cumulativeSpend': renderCumulativeSpend(data); break;
        }
    }

    function setTopN(n) {
        topNCount = n;
    }

    function refreshTopExpenses() {
        renderTopExpenses(App.getFilteredData());
    }

    return { updateAll, setChartType, getColor, deselectAllLegend, setTopN, refreshTopExpenses };
})();
