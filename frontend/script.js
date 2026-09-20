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
    if (value === undefined || value === null || value === 'N/D') return '<span class="badge badge-gray">N/D</span>';
    
    let colorClass = 'badge-gray';
    if (type === 'icmp') {
        colorClass = value == 1 ? 'badge-green' : 'badge-red';
        return `<span class="badge ${colorClass}">${value == 1 ? 'UP' : 'DOWN'}</span>`;
    }
    
    const numValue = parseFloat(value);
    if (type === 'cpu' || type === 'disk') {
        if (numValue < 80) colorClass = 'badge-green';
        else if (numValue <= 90) colorClass = 'badge-yellow';
        else colorClass = 'badge-red';
    } else if (type === 'memory') {
        if (numValue > 10) colorClass = 'badge-green';
        else if (numValue > 5) colorClass = 'badge-yellow';
        else colorClass = 'badge-red';
    }
    
    return `<span class="badge ${colorClass}">${value}%</span>`;
}

function renderServersTable(data) {
    const body = document.getElementById('servers-body');
    body.innerHTML = '';
    data.forEach(item => {
        body.innerHTML += `<tr>
            <td>${item.host}</td>
            <td>${getBadge(item.icmp, 'icmp')}</td>
            <td>${getBadge(item.cpu, 'cpu')}</td>
            <td>${getBadge(item.memory, 'memory')}</td>
            <td>${getBadge(item.disk, 'disk')}</td>
        </tr>`;
    });
}

function renderTopTriggersTable(data) {
    const body = document.getElementById('top-triggers-body');
    body.innerHTML = '';
    
    const triggersList = Array.isArray(data) ? data : [];

    if (triggersList.length === 0) {
        body.innerHTML = '<tr><td colspan="5">No data</td></tr>';
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
