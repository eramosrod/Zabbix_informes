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
    
    document.getElementById('total-alerts').textContent = data.alerts.length;
    
    renderCpuTable(data.cpu);
    renderMemoryTable(data.memory);
    renderDiskTable(data.disk);
    renderAlertsTable(data.alerts);
}

function renderCpuTable(data) {
    const table = document.getElementById('cpu-table');
    table.innerHTML = '<tr><th>Host</th><th>CPU (%)</th><th>Carga</th></tr>';
    data.forEach(item => {
        table.innerHTML += `<tr><td>${item.host}</td><td>${item.cpu_load}%</td><td>-</td></tr>`;
    });
}

function renderMemoryTable(data) {
    const table = document.getElementById('memory-table');
    table.innerHTML = '<tr><th>Host</th><th>Memòria (%)</th><th>Barra</th></tr>';
    data.forEach(item => {
        const color = item.percentage < 75 ? 'green' : (item.percentage < 90 ? 'orange' : 'red');
        table.innerHTML += `<tr><td>${item.host}</td><td>${item.percentage}%</td><td><div class="progress-bar"><div class="progress-fill" style="width:${item.percentage}%; background-color:${color}"></div></div></td></tr>`;
    });
}

function renderDiskTable(data) {
    const table = document.getElementById('disk-table');
    table.innerHTML = '<tr><th>Host</th><th>Disc</th><th>Ocupació (%)</th></tr>';
    data.forEach(item => {
        table.innerHTML += `<tr><td>${item.host}</td><td>${item.disk}</td><td>${item.usage}%</td></tr>`;
    });
}

function renderAlertsTable(data) {
    const body = document.getElementById('alerts-body');
    body.innerHTML = '';
    data.forEach(alert => {
        const severityClass = `severity-${alert.severity.toLowerCase()}`;
        body.innerHTML += `<tr>
            <td>${new Date(alert.clock * 1000).toLocaleString()}</td>
            <td>${alert.r_clock ? new Date(alert.r_clock * 1000).toLocaleString() : 'Problem'}</td>
            <td>${alert.r_clock ? 'RESOLVED' : 'PROBLEM'}</td>
            <td>${alert.host}</td>
            <td class="${severityClass}">${alert.description}</td>
            <td>${alert.duration}</td>
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
