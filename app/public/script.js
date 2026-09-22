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
    
    document.getElementById('generate-report').addEventListener('click', async () => {
        const groupSelect = document.getElementById('host-group-select');
        const timeFrom = document.getElementById('timeFrom').value;
        const timeTill = document.getElementById('timeTill').value;
        const errorDiv = document.getElementById('filter-error');
        
        // Limpiar errores previos
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        // Validar campos requeridos
        if (!groupSelect.value) {
            showError(errorDiv, 'Por favor, seleccione un grupo de hosts');
            return;
        }
        if (!timeFrom || !timeTill) {
            showError(errorDiv, 'Por favor, seleccione el rango de tiempo');
            return;
        }
        
        try {
            const groupIds = [groupSelect.value];
            const timeFromMs = new Date(timeFrom).getTime() / 1000;
            const timeTillMs = new Date(timeTill).getTime() / 1000;
            
            const response = await fetch('/api/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupIds, timeFrom: timeFromMs, timeTill: timeTillMs })
            });
            
            if (response.ok) {
                const data = await response.json();
                renderDashboard(data);
            } else {
                const errorData = await response.json();
                showError(errorDiv, errorData.error || 'Error al generar el informe');
            }
        } catch (error) {
            showError(errorDiv, 'Error de conexión al generar el informe');
            console.error('Error al generar informe:', error);
        }
    });
    
    document.getElementById('export-html').addEventListener('click', async () => {
        const dashboard = document.getElementById('dashboard').cloneNode(true);
        
        // Remove buttons from the exported HTML
        dashboard.querySelector('#export-html').remove();
        
        // Fetch CSS content
        const cssResponse = await fetch('style.css');
        const cssContent = await cssResponse.text();
        
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
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showError(document.getElementById('filter-error'), 'Error al cargar grupos de hosts');
    }
}

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
        const alertsData = data?.activeProblems || [];
        renderAlertsTable(alertsData);
    } catch (e) {
        console.error('Error rendering alerts table:', e);
        showError(document.getElementById('filter-error'), 'Error al renderizar tabla de alertas');
    }
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

function calculateDuration(clock, r_clock) {
    const start = parseInt(clock) * 1000;
    const end = r_clock ? parseInt(r_clock) * 1000 : Date.now();
    const diff = end - start;
    
    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)));
    
    return `${hours}h ${minutes}m ${seconds}s`;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(parseInt(timestamp) * 1000);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

function renderAlertsTable(data) {
    console.log('[DEBUG] renderAlertsTable received data:', data);
    if (!data) {
        console.error('[DEBUG] Data is null or undefined!');
    } else if (data.length === 0) {
        console.log('[DEBUG] Data is empty array.');
    } else {
        console.log('[DEBUG] First alert sample:', data[0]);
        // Verify property access
        console.log('[DEBUG] Alert property check: clock exists?', 'clock' in data[0], 'time exists?', 'time' in data[0]);
    }
    const body = document.getElementById('alerts-body');
    body.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center">No data found</td></tr>';
        return;
    }
    
    data.forEach(alert => {
        const statusClass = alert.status === 'RESOLVED' ? 'status-resolved' : 'status-problem';
        
        body.innerHTML += `<tr>
            <td>${formatDate(alert.time)}</td>
            <td>${formatDate(alert.recovery_time)}</td>
            <td><span class="status-badge ${statusClass}">${alert.status}</span></td>
            <td>${alert.host}</td>
            <td>${getSeverityBadge(alert.severity)}</td>
            <td>${alert.problem}</td>
            <td>${calculateDuration(alert.time, alert.recovery_time)}</td>
        </tr>`;
    });
}