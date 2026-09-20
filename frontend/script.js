document.getElementById('login-btn').addEventListener('click', async () => {
    const apiUrl = document.getElementById('apiUrl').value;
    const authToken = document.getElementById('authToken').value;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, authToken })
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
    document.getElementById('total-alerts').textContent = data.alerts.length;
    // ... render tables ...
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
