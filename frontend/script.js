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
    
    renderServersTable(data.servers);
    renderTopTriggersTable(data.topTriggers);
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
    data.forEach(item => {
        const severityClass = `severity-${item.severity.toLowerCase()}`;
        body.innerHTML += `<tr>
            <td>${item.trigger}</td>
            <td><span class="badge ${severityClass}">${item.severity}</span></td>
            <td>${item.hosts.join(', ')}</td>
            <td>${item.count}</td>
            <td>${item.lastState}</td>
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
