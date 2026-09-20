const express = require('express');
const path = require('path');
const ZabbixService = require('./backend/zabbixService');
const DataProcessor = require('./backend/dataProcessor');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

let zabbixService = null;

app.post('/api/login', async (req, res) => {
    const { apiUrl, username, password } = req.body;
    zabbixService = new ZabbixService(apiUrl);
    try {
        await zabbixService.login(username, password);
        res.json({ success: true });
    } catch (error) {
        res.status(401).json({ error: 'Autenticació fallida' });
    }
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
    
    const rawData = await zabbixService.getHostsConsolidatedMetrics(hostIds, timeFrom, timeTill);
    
    // Intentem reconstruir la llista de servidors a partir de les dades rebudes
    const hostMap = new Map();
    
    // Helper per afegir dades al mapa
    const addData = (data, key) => {
        data.forEach(item => {
            if (!hostMap.has(item.hostid)) {
                hostMap.set(item.hostid, { hostid: item.hostid, host: item.hostname || 'Desconegut', icmp: 'N/D', cpu: 'N/D', memory: 'N/D', disk: 'N/D' });
            }
            hostMap.get(item.hostid)[key] = item.lastvalue;
        });
    };

    // Això és una aproximació, depèn de com estiguin estructurades les dades de rawData
    // Caldria ajustar segons l'estructura real de rawData.cpu, rawData.memory, etc.
    
    const processedData = {
        servers: Array.from(hostMap.values()),
        cpu: DataProcessor.processCpuData(rawData.cpu),
        memory: DataProcessor.processMemoryData(rawData.memory),
        disk: DataProcessor.processDiskData(rawData.disk),
        alerts: rawData.alerts,
        icmp: rawData.icmp
    };
    res.json(processedData);
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});
