const express = require('express');
const path = require('path');
const ZabbixService = require('./backend/zabbixService');
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

app.post('/api/servers', async (req, res) => {
    console.log('--- Iniciant petició /api/servers ---');
    console.log('Paràmetres rebuts:', JSON.stringify(req.body, null, 2));
    
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    
    try {
        const { groupIds, timeFrom, timeTill } = req.body;
        const hosts = await zabbixService.getHostsInGroup(groupIds);
        console.log(`Hosts localitzats: ${hosts.length}`);
        
        const servers = await zabbixService.getHostsConsolidatedMetrics(hosts);
        console.log('Dades consolidades obtingudes de Zabbix');
        
        // Construir la carga útil JSON final según el Paso 3
        const responsePayload = {
            success: true,
            servers: servers.map(server => ({
                hostid: server.hostid,
                name: server.name,
                icmp: server.icmp !== undefined ? server.icmp : null,
                cpu: server.cpu !== undefined ? server.cpu : null,
                memory: server.memory !== undefined ? server.memory : null,
                disk: server.disk !== undefined ? server.disk : {
                    name: null,
                    pfree: null
                }
            })),
            topTriggers: [] // Por ahora vacío, se llenará después
        };
        
        console.log('[DEBUG 3] JSON final enviado al frontend:', JSON.stringify(responsePayload, null, 2));
        
        res.json(responsePayload);
    } catch (err) {
        console.error('Error en /api/servers:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/top-triggers', async (req, res) => {
    console.log('--- Iniciant petició /api/top-triggers ---');
    console.log('Paràmetres rebuts:', JSON.stringify(req.body, null, 2));
    
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    
    try {
        const { hostIds, timeFrom, timeTill } = req.body;
        const topTriggers = await zabbixService.getTopTriggers(hostIds, timeFrom, timeTill);
        console.log('Top triggers obtinguts:', topTriggers);
        
        res.json({ success: true, topTriggers });
    } catch (err) {
        console.error('Error en /api/top-triggers:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});
