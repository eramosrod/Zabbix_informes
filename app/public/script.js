let barChartInstance = null;
let currentSelectedGroup = 'all';

/**
 * Formats a Date object to YYYY-MM-DDTHH:mm format for datetime-local input
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDatetimeInput(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Sets the time range based on preset type
 * @param {string} rangeType - '1d', '7d', '1w', '1m'
 */
function setTimeRange(rangeType) {
    const now = new Date();
    let fromDate = new Date();

    switch (rangeType) {
        case '1d':
            fromDate.setDate(now.getDate() - 1);
            break;
        case '7d':
        case '1w':
            fromDate.setDate(now.getDate() - 7);
            break;
        case '1m':
            fromDate.setMonth(now.getMonth() - 1);
            break;
        default:
            fromDate.setDate(now.getDate() - 1);
    }

    // Format and assign to datetime inputs
    document.getElementById('timeFrom').value = formatDatetimeInput(fromDate);
    document.getElementById('timeTill').value = formatDatetimeInput(now);

    // Trigger data reload
    fetchDashboardData();
}

/**
 * Renders group filter buttons dynamically
 * @param {Array} groups - Array of group objects from Zabbix API
 */
function renderGroupButtons(groups) {
    const container = document.getElementById('groupFilterButtons');
    container.innerHTML = '<button type="button" class="btn btn-primary btn-sm my-1 mr-1 active" data-group-id="all">Tots els grups</button>';

    groups.forEach(g => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline-primary btn-sm my-1 mr-1';
        btn.setAttribute('data-group-id', g.groupid);
        btn.textContent = g.name;
        container.appendChild(btn);
    });
}

/**
 * Fetches dashboard data based on current filters
 */
async function fetchDashboardData() {
    const groupSelect = document.getElementById('host-group-select');
    const timeFrom = document.getElementById('timeFrom').value;
    const timeTill = document.getElementById('timeTill').value;
    const errorDiv = document.getElementById('filter-error');
    
    // Clear previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // Validate required fields
    if (!timeFrom || !timeTill) {
        showError(errorDiv, 'Por favor, seleccione el rango de tiempo');
        return;
    }
    
    // Determine group IDs based on selection
    let groupIds;
    if (currentSelectedGroup === 'all') {
        // Get all group IDs from the select
        groupIds = Array.from(groupSelect.options).map(opt => opt.value).filter(v => v);
    } else {
        groupIds = [currentSelectedGroup];
    }
    
    if (groupIds.length === 0) {
        showError(errorDiv, 'No hay grupos de hosts disponibles');
        return;
    }
    
    const timeFromMs = new Date(timeFrom).getTime() / 1000;
    const timeTillMs = new Date(timeTill).getTime() / 1000;
    
    try {
        const response = await fetch('/api/dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupIds, timeFrom: timeFromMs, timeTill: timeTillMs })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // DEBUG INSTRUMENTATION - Frontend raw payload
            console.log('[DEBUG FRONTEND RAW] Payload completo recibido del backend:', JSON.stringify(data, null, 2));
            console.log('[DEBUG FRONTEND MAPPED] Muestra procesada (primeros 5):', data.activeProblems?.slice(0, 5).map(p => ({
                id: p.eventid || p.problemid,
                name: p.name,
                severityLabel: p.severity,
                severityValue: p.priority,
                triggerPriority: p.trigger?.priority,
                eventSeverity: p.eventSeverity,
                rawKeys: Object.keys(p)
            })));

            // Client-side sanitization: filter out "Not classified" (severity 0) events
            const sanitizedProblems = filterClassifiedProblems(data?.activeProblems);
            
            // Update data object with sanitized problems for downstream rendering
            data.activeProblems = sanitizedProblems;
            
            renderDashboard(data);
        } else {
            const errorData = await response.json();
            showError(errorDiv, errorData.error || 'Error al generar el informe');
        }
    } catch (error) {
        showError(errorDiv, 'Error de conexión al generar el informe');
        console.error('Error al generar informe:', error);
    }
}

/**
 * Filters out events with severity 0 (Not classified)
 * @param {Array} problems - Array of problem objects
 * @returns {Array} Filtered array with only classified problems (severity > 0)
 */
function filterClassifiedProblems(problems) {
    return (problems || []).filter(p => parseInt(p.severity, 10) > 0);
}

/**
 * Formats a Zabbix timestamp (seconds or milliseconds) to YYYY-MM-DD HH:mm:ss
 * @param {string|number} timestamp - Unix timestamp in seconds or milliseconds
 * @returns {string} Formatted date string or '-' if invalid
 */
function formatZabbixTime(timestamp) {
    if (!timestamp || timestamp === '-' || timestamp === '0') return '-';
    
    let ts = parseInt(timestamp, 10);
    if (isNaN(ts) || ts <= 0) return '-';

    // If timestamp is in seconds (10 digits instead of 13), convert to milliseconds
    if (ts < 10000000000) {
        ts = ts * 1000;
    }

    const date = new Date(ts);

    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Load logo on startup
    const savedLogo = localStorage.getItem('customLogo');
    if (savedLogo) {
        const logoImg = document.getElementById('custom-logo');
        logoImg.src = savedLogo;
        logoImg.style.display = 'block';
    }

    // Handle logo upload
    document.getElementById('logo-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const logoData = e.target.result;
                localStorage.setItem('customLogo', logoData);
                const logoImg = document.getElementById('custom-logo');
                logoImg.src = logoData;
                logoImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Configurar manejadores de eventos para los elementos del DOM
    document.getElementById('login-btn').addEventListener('click', async () => {
        const apiUrl = document.getElementById('apiUrl').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        // Limpiar errores previos
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        // Validar campos requeridos
        if (!apiUrl || !username || !password) {
            showError(errorDiv, 'Por favor, complete todos los campos de login');
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiUrl, username, password })
            });
            
            if (response.ok) {
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('filters').style.display = 'block';
                loadHostGroups();
            } else {
                const errorData = await response.json();
                showError(errorDiv, errorData.error || 'Error de autenticación');
            }
        } catch (error) {
            showError(errorDiv, 'Error de conexión con el servidor');
            console.error('Error de login:', error);
        }
    });
    
    document.getElementById('generate-report').addEventListener('click', () => {
        // Use the specific group from the select dropdown (overrides button selection)
        currentSelectedGroup = document.getElementById('host-group-select').value || 'all';
        fetchDashboardData();
    });
    
    document.getElementById('export-html').addEventListener('click', async () => {
        const dashboard = document.getElementById('dashboard').cloneNode(true);
        
        // Remove buttons from the exported HTML
        dashboard.querySelector('#export-html').remove();
        
        // Fetch CSS content
        const cssResponse = await fetch('style.css');
        const cssContent = await cssResponse.text();
        
        // Convert charts to Base64 images
        const barChartCanvas = document.getElementById('severityBarCanvas');
        
        const barImg = barChartCanvas.toDataURL('image/png');
        
        // Add charts as images to the cloned dashboard
        const chartsSection = dashboard.querySelector('.dashboard-row');
        if (chartsSection) {
            // Replace the canvas container with the image
            const barChartContainer = chartsSection.querySelector('.card-panel');
            if (barChartContainer) {
                barChartContainer.innerHTML = `
                    <h3 style="margin-top: 0; color: #1f2c33; font-size: 16px;">Recompte d'Alertes per Severitat</h3>
                    <img src="${barImg}" alt="Severitat Bar Chart" style="width: 100%; height: auto;">
                `;
            }
        }
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ca">
            <head>
                <meta charset="UTF-8">
                <title>Informe Zabbix</title>
                <style>${cssContent}</style>
            </head>
            <body>
                ${dashboard.innerHTML}
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'informe-zabbix.html';
        a.click();
        URL.revokeObjectURL(url);
    });
});

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    // Ocultar automáticamente después de 5 segundos
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

async function loadHostGroups() {
    try {
        const response = await fetch('/api/hostgroups');
        if (!response.ok) {
            throw new Error('Error al cargar grupos de hosts');
        }
        const groups = await response.json();
        const select = document.getElementById('host-group-select');
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.groupid;
            option.textContent = group.name;
            select.appendChild(option);
        });
        
        // Also render group filter buttons
        renderGroupButtons(groups);
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showError(document.getElementById('filter-error'), 'Error al cargar grupos de hosts');
    }
}

// Event listeners for time preset buttons
document.getElementById('timePresetButtons').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('#timePresetButtons .btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const range = e.target.getAttribute('data-range');
        setTimeRange(range);
    }
});

// Event listeners for group filter buttons
document.getElementById('groupFilterButtons').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('#groupFilterButtons .btn').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-outline-primary');
        });
        e.target.classList.add('active', 'btn-primary');
        e.target.classList.remove('btn-outline-primary');

        const selectedGroupId = e.target.getAttribute('data-group-id');
        // Update global filter state and reload data
        currentSelectedGroup = selectedGroupId;
        fetchDashboardData();
    }
});

function renderDashboard(data) {
    if (!data || !data.success) {
        showError(document.getElementById('filter-error'), 'Error al cargar el dashboard');
        return;
    }
    
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('host-group').textContent = document.getElementById('host-group-select').options[document.getElementById('host-group-select').selectedIndex].text;
    document.getElementById('report-date').textContent = `${document.getElementById('timeFrom').value} a ${document.getElementById('timeTill').value}`;
    
    try {
        renderServersTable(data?.servers || []);
    } catch (e) {
        console.error('Error rendering servers table:', e);
        showError(document.getElementById('filter-error'), 'Error al renderizar tabla de servidores');
    }
    
    try {
        // Use sanitized data (already filtered by generate-report handler)
        // Additional safety: apply filter again to ensure no severity 0 events slip through
        const sanitizedProblems = filterClassifiedProblems(data?.activeProblems);
        renderAlertsTable(sanitizedProblems);
        renderSeverityBarChart(sanitizedProblems);
        renderHostsAlertsTable(sanitizedProblems);
        generateSummaryAlerts(sanitizedProblems);
    } catch (e) {
        console.error('Error rendering alerts table:', e);
        showError(document.getElementById('filter-error'), 'Error al renderizar tabla de alertas');
    }
}

function renderSeverityBarChart(problems) {
    const canvas = document.getElementById('severityBarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (problems || []).forEach(p => {
        const sev = parseInt(p.severity, 10);
        if (counts[sev] !== undefined) counts[sev]++;
    });

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Information', 'Warning', 'Average', 'High', 'Disaster'],
            datasets: [{
                label: 'Nombre d\'Alertes',
                data: [counts[1], counts[2], counts[3], counts[4], counts[5]],
                backgroundColor: [
                    '#7499FF', // Information
                    '#FFF000', // Warning
                    '#FFAA44', // Average
                    '#FF8888', // High
                    '#FF4646'  // Disaster
                ],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function getSeverityBadge(severity) {
    const severities = {
        0: { label: 'Not classified', class: 'severity-not-classified' },
        1: { label: 'Information', class: 'severity-information' },
        2: { label: 'Warning', class: 'severity-warning' },
        3: { label: 'Average', class: 'severity-average' },
        4: { label: 'High', class: 'severity-high' },
        5: { label: 'Disaster', class: 'severity-disaster' }
    };
    const sev = severities[parseInt(severity)] || { label: 'Unknown', class: 'severity-unknown' };
    return `<span class="badge ${sev.class}">${sev.label}</span>`;
}

function renderServersTable(data) {
    const body = document.getElementById('servers-body');
    body.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron servidores en el grupo y rango seleccionados.</td></tr>';
        return;
    }
    
    data.forEach(server => {
        const hostName = server.name || 'N/D';
        const icmpValue = server.icmp !== undefined ? server.icmp : null;
        const cpuValue = server.cpu !== undefined ? server.cpu : null;
        const memoryValue = server.memory !== undefined ? server.memory : null;
        
        const icmpBadge = `<span class="badge badge-${server.icmpStatus || 'gray'}">${icmpValue === 1 ? 'UP' : (icmpValue === 0 ? 'DOWN' : 'N/D')}</span>`;
        const cpuBadge = cpuValue !== null ? `<span class="badge badge-${server.cpuStatus || 'gray'}">${cpuValue.toFixed(1)}%</span>` : '<span class="badge badge-gray">N/D</span>';
        const memoryBadge = memoryValue !== null ? `<span class="badge badge-${server.memoryStatus || 'gray'}">${memoryValue.toFixed(1)}%</span>` : '<span class="badge badge-gray">N/D</span>';
        const activeAlertsBadge = `<span class="badge badge-${server.activeAlerts > 0 ? 'red' : 'green'}">${server.activeAlerts}</span>`;
        
        body.innerHTML += `<tr>
            <td>${hostName}</td>
            <td>${icmpBadge}</td>
            <td>${cpuBadge}</td>
            <td>${memoryBadge}</td>
            <td>${activeAlertsBadge}</td>
        </tr>`;
    });
}

function calculateDuration(clockVal, rClockVal, statusVal) {
  // 1. Obtener timestamp de inicio en segundos
  let startSec = parseInt(clockVal, 10);
  if (isNaN(startSec) || startSec <= 0) {
    return '-';
  }
  if (startSec > 10000000000) {
    startSec = Math.floor(startSec / 1000); // Normalizar ms a s
  }

  // 2. Determinar la hora final (Resolución vs Hora Actual)
  let endSec;
  const parsedR = parseInt(rClockVal, 10);
  const hasValidRecovery = !isNaN(parsedR) && parsedR > 0 && rClockVal !== '-' && rClockVal !== '0';

  if (hasValidRecovery) {
    // Si la alerta está resuelta / tiene r_clock
    endSec = parsedR > 10000000000 ? Math.floor(parsedR / 1000) : parsedR;
  } else {
    // Si sigue activa (PROBLEM), usar la hora actual
    endSec = Math.floor(Date.now() / 1000);
  }

  // 3. Calcular diferencia en segundos
  const diffSec = Math.max(0, endSec - startSec);

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function renderAlertsTable(problems) {
    console.log('[DEBUG] renderAlertsTable received data:', problems);
    if (!problems) {
        console.error('[DEBUG] Data is null or undefined!');
    } else if (problems.length === 0) {
        console.log('[DEBUG] Data is empty array.');
    } else {
        console.log('[DEBUG] First alert sample:', problems[0]);
        // Verify property access
        console.log('[DEBUG] Alert property check: clock exists?', 'clock' in problems[0], 'time exists?', 'time' in problems[0]);
    }
    const body = document.getElementById('alerts-body');
    body.innerHTML = '';
    
    if (!Array.isArray(problems) || problems.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="padding: 12px; text-align: center; color: #6c757d;">No se encontraron problemas clasificados en el rango seleccionado.</td></tr>';
        return;
    }
    
    // Rely solely on input parameter - data is already sanitized by caller
    problems.forEach(alert => {
        const statusClass = alert.status === 'RESOLVED' ? 'status-resolved' : 'status-problem';
        
        const formattedTime = formatZabbixTime(alert.clock || alert.time);
        const formattedRecovery = formatZabbixTime(alert.r_clock || alert.recovery_time);
        const duration = calculateDuration(alert.clock || alert.time, alert.r_clock || alert.recovery_time, alert.value || alert.status);
        
        body.innerHTML += `<tr>
            <td>${formattedTime}</td>
            <td>${formattedRecovery}</td>
            <td><span class="status-badge ${statusClass}">${alert.status}</span></td>
            <td>${alert.host}</td>
            <td>${getSeverityBadge(alert.severity)}</td>
            <td>${alert.problem}</td>
            <td>${duration}</td>
        </tr>`;
    });
}

function renderHostsAlertsTable(problems) {
    const body = document.getElementById('hostsAlertsTbody');
    body.innerHTML = '';
    
    // Rely solely on input parameter - data is already sanitized by caller
    const sanitizedProblems = problems || [];

    if (!Array.isArray(sanitizedProblems) || sanitizedProblems.length === 0) {
        body.innerHTML = '<tr><td colspan="2" class="text-center">No alerts in the selected range.</td></tr>';
        return;
    }
    
    // Group by host and count occurrences
    const hostCounts = {};
    sanitizedProblems.forEach(p => {
        const host = p.host || (p.hosts && p.hosts[0] && p.hosts[0].name) || 'Unknown';
        hostCounts[host] = (hostCounts[host] || 0) + 1;
    });
    
    // Convert to array and sort by count descending
    const sortedHosts = Object.entries(hostCounts)
        .map(([host, count]) => ({ host, count }))
        .sort((a, b) => b.count - a.count);
    
    // Render the table
    sortedHosts.forEach(({ host, count }) => {
        body.innerHTML += `<tr>
            <td>${host}</td>
            <td style="text-align: right;">${count}</td>
        </tr>`;
    });
}

function generateSummaryAlerts(problemsList) {
    const summaryMap = {};
    
    problemsList.forEach(p => {
        const hostName = p.host || (p.hosts && p.hosts[0] ? p.hosts[0].name : 'Desconocido');
        const triggerName = p.name || p.problem || p.description || 'Alerta';
        const severity = p.severity || 0;
        const key = `${hostName}___${triggerName}`;
        
        if (!summaryMap[key]) {
            summaryMap[key] = {
                host: hostName,
                trigger: triggerName,
                severity: severity,
                count: 0
            };
        }
        summaryMap[key].count += 1;
    });
    
    // Convertir a array y ordenar descendentemente por recuento
    const summaryArray = Object.values(summaryMap);
    summaryArray.sort((a, b) => b.count - a.count);
    
    renderSummaryAlertsTable(summaryArray);
}

function renderSummaryAlertsTable(summaryArray) {
    const body = document.getElementById('summaryAlertsBody');
    body.innerHTML = '';
    
    if (!Array.isArray(summaryArray) || summaryArray.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron alertas en el rango seleccionado.</td></tr>';
        return;
    }
    
    summaryArray.forEach(item => {
        const severityBadge = getSeverityBadge(item.severity);
        body.innerHTML += `<tr>
            <td>${item.host}</td>
            <td>${item.trigger}</td>
            <td>${severityBadge}</td>
            <td class="text-center">${item.count}</td>
        </tr>`;
    });
}
