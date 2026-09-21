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
    console.log('--- Iniciant petició /api/report ---');
    console.log('Paràmetres rebuts:', JSON.stringify(req.body, null, 2));
    
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    
    try {
        const { groupIds, timeFrom, timeTill } = req.body;
        const hosts = await zabbixService.getHostsInGroup(groupIds);
        console.log(`Hosts localitzats: ${hosts.length}`);
        const hostIds = hosts.map(h => h.hostid);
        
        const rawData = await zabbixService.getHostsConsolidatedMetrics(hostIds, timeFrom, timeTill);
        console.log('Dades consolidades obtingudes de Zabbix');
        
        const processedData = {
            success: true,
            hostGroupName: 'Desconegut', // Hauríem de buscar el nom del grup
            timeRange: { from: timeFrom, till: timeTill },
            servers: [], // S'ha de consolidar aquí
            cpu: DataProcessor.processCpuData(rawData.cpu),
            memory: DataProcessor.processMemoryData(rawData.memory),
            disk: DataProcessor.processDiskData(rawData.disk),
            alerts: rawData.alerts,
            icmp: rawData.icmp,
            topTriggers: rawData.alerts || []
        };
        
        console.log('Resposta final preparada:', JSON.stringify(processedData, null, 2));
        res.json(processedData);
    } catch (err) {
        console.error('Error en /api/report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});
