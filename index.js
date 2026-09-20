const express = require('express');
const path = require('path');
const ZabbixService = require('./backend/zabbixService');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

let zabbixService = null;

app.post('/api/login', (req, res) => {
    const { apiUrl, authToken } = req.body;
    zabbixService = new ZabbixService(apiUrl, authToken);
    res.json({ success: true });
});

app.get('/api/hostgroups', async (req, res) => {
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    const groups = await zabbixService.call('hostgroup.get', { output: 'extend' });
    res.json(groups);
});

app.post('/api/report', async (req, res) => {
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    const { groupIds, timeFrom, timeTill } = req.body;
    const hostIds = (await zabbixService.getHostsInGroup(groupIds)).map(h => h.hostid);
    
    const data = {
        cpu: await zabbixService.getTopCpuUsage(hostIds, timeFrom, timeTill),
        memory: await zabbixService.getTopMemoryUsage(hostIds, timeFrom, timeTill),
        disk: await zabbixService.getTopDiskUsage(hostIds),
        alerts: await zabbixService.getAlerts(hostIds, timeFrom, timeTill),
        icmp: await zabbixService.getIcmpLoss(hostIds, timeFrom, timeTill)
    };
    res.json(data);
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});
