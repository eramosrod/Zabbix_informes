document.getElementById('login-btn').addEventListener('click', async () => {
    const apiUrl = document.getElementById('apiUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, username, password })
    });
    if (response.ok) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('filters').style.display = 'block';
        loadHostGroups();
    }
});

async function loadHostGroups() {
    const response = await fetch('/api/hostgroups');
    const groups = await response.json();
    const select = document.getElementById('host-group-select');
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.groupid;
        option.textContent = group.name;
        select.appendChild(option);
    });
}

document.getElementById('generate-report').addEventListener('click', async () => {
    const groupIds = [document.getElementById('host-group-select').value];
    const timeFrom = new Date(document.getElementById('timeFrom').value).getTime() / 1000;
    const timeTill = new Date(document.getElementById('timeTill').value).getTime() / 1000;
    
    const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds, timeFrom, timeTill })
    });
    const data = await response.json();
    renderDashboard(data);
});

function renderDashboard(data) {
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('host-group').textContent = document.getElementById('host-group-select').options[document.getElementById('host-group-select').selectedIndex].text;
    document.getElementById('report-date').textContent = `${document.getElementById('timeFrom').value} a ${document.getElementById('timeTill').value}`;
    
    try {
        renderServersTable(data?.servers || []);
    } catch (e) {
        console.error('Error rendering servers table:', e);
    }

    try {
        const triggersData = data?.topTriggers || [];
        renderTopTriggersTable(triggersData);
    } catch (e) {
        console.error('Error rendering top triggers table:', e);
    }
}

function getBadge(value, type) {
    if (value === undefined || value === null) return '<span class="badge badge-gray">N/D</span>';
    
    if (type === 'icmp') {
        const colorClass = value == 1 ? 'badge-green' : 'badge-red';
        return `<span class="badge ${colorClass}">${value == 1 ? 'UP' : 'DOWN'}</span>`;
    }
    
    const numValue = parseFloat(value);
    
    if (type === 'cpu') {
        let colorClass = 'badge-green';
        if (numValue > 90) colorClass = 'badge-red';
        else if (numValue >= 80) colorClass = 'badge-yellow';
        return `<span class="badge ${colorClass}">${numValue.toFixed(1)}%</span>`;
    }
    
    if (type === 'memory') {
        let colorClass = 'badge-green';
        if (numValue <= 5) colorClass = 'badge-red';
        else if (numValue <= 10) colorClass = 'badge-yellow';
        return `<span class="badge ${colorClass}">${numValue.toFixed(1)}%</span>`;
    }
    
    return `<span class="badge badge-gray">${value}</span>`;
}

function renderServersTable(data) {
    const body = document.getElementById('servers-body');
    body.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron servidores en el grupo y rango seleccionados.</td></tr>';
        return;
    }

    data.forEach(server => {
        // Extraer las propiedades exactas definidas en el Paso 3
        const hostName = server.name || 'N/D';
        const icmpValue = server.icmp !== undefined ? server.icmp : null;
        const cpuValue = server.cpu !== undefined ? server.cpu : null;
        const memoryValue = server.memory !== undefined ? server.memory : null;
        const diskInfo = server.disk !== undefined ? server.disk : { name: null, pfree: null };
        
        // Generar badge para ICMP
        let icmpBadge = '';
        if (icmpValue === 1) {
            icmpBadge = '<span class="badge badge-green">UP</span>';
        } else if (icmpValue === 0) {
            icmpBadge = '<span class="badge badge-red">DOWN</span>';
        } else {
            icmpBadge = '<span class="badge badge-gray">N/D</span>';
        }
        
        // Generar badge para CPU
        let cpuBadge = '';
        if (cpuValue !== null) {
            const numValue = parseFloat(cpuValue);
            let colorClass = 'badge-green';
            if (numValue > 90) colorClass = 'badge-red';
            else if (numValue >= 80) colorClass = 'badge-yellow';
            cpuBadge = `<span class="badge ${colorClass}">${numValue.toFixed(1)}%</span>`;
        } else {
            cpuBadge = '<span class="badge badge-gray">N/D</span>';
        }
        
        // Generar badge para Memoria
        let memoryBadge = '';
        if (memoryValue !== null) {
            const numValue = parseFloat(memoryValue);
            let colorClass = 'badge-green';
            if (numValue < 5) colorClass = 'badge-red';
            else if (numValue <= 10) colorClass = 'badge-yellow';
            memoryBadge = `<span class="badge ${colorClass}">${numValue.toFixed(1)}%</span>`;
        } else {
            memoryBadge = '<span class="badge badge-gray">N/D</span>';
        }
        
        // Generar badge para Disco
        let diskBadge = '';
        if (diskInfo.pfree !== null) {
            const occupancy = 100 - diskInfo.pfree;
            let colorClass = 'badge-green';
            if (occupancy > 90) colorClass = 'badge-red';
            else if (occupancy >= 80) colorClass = 'badge-yellow';
            diskBadge = `<span class="badge ${colorClass}">${diskInfo.name || 'N/D'}: ${occupancy.toFixed(1)}%</span>`;
        } else {
            diskBadge = '<span class="badge badge-gray">N/D</span>';
        }

        body.innerHTML += `<tr>
            <td>${hostName}</td>
            <td>${icmpBadge}</td>
            <td>${cpuBadge}</td>
            <td>${memoryBadge}</td>
            <td>${diskBadge}</td>
        </tr>`;
    });
}

function renderTopTriggersTable(data) {
    const body = document.getElementById('top-triggers-body');
    body.innerHTML = '';
    
    const triggersList = Array.isArray(data) ? data : [];

    if (triggersList.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron alertas en el grupo y rango seleccionados.</td></tr>';
        return;
    }

    triggersList.forEach(item => {
        const severity = item.severity || 'Unknown';
        const severityClass = `severity-${severity.toLowerCase()}`;
        const hosts = Array.isArray(item.hosts) ? item.hosts.join(', ') : 'N/A';
        
        body.innerHTML += `<tr>
            <td>${item.trigger || 'N/A'}</td>
            <td><span class="badge ${severityClass}">${severity}</span></td>
            <td>${hosts}</td>
            <td>${item.count || 0}</td>
            <td>${item.lastState || 'N/A'}</td>
        </tr>`;
    });
}

document.getElementById('export-pdf').addEventListener('click', () => {
    const element = document.getElementById('dashboard');
    const opt = {
        margin: 1,
        filename: 'informe-zabbix.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
});
