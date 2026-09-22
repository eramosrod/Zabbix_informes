const express = require('express');
const path = require('path');
const ZabbixService = require('./backend/zabbixService');
const DataProcessor = require('./backend/dataProcessor');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/dashboard', async (req, res) => {
    console.log('--- Iniciant petició /api/dashboard ---');
    console.log('Paràmetres rebuts:', JSON.stringify(req.body, null, 2));
    
    if (!zabbixService) return res.status(401).json({ error: 'No autenticat' });
    
    try {
        const { groupIds, timeFrom, timeTill } = req.body;
        const hosts = await zabbixService.getHostsInGroup(groupIds);
        const servers = await zabbixService.getHostsConsolidatedMetrics(hosts);
        const rawActiveProblems = await zabbixService.getActiveProblems(
            groupIds,
            timeFrom,
            timeTill
        );

        const activeProblems = rawActiveProblems.map(p => ({
            eventid: p.eventid,
            time: p.clock,
            recovery_time: p.r_clock,
            status: p.status,
            host: p.host,
            problem: p.problem,
            severity: p.severity,
            acknowledged: p.acknowledged
        }));
        
        // Aplicar umbrales de estado según especificaciones
        const activeProblemsCount = {};
        activeProblems.forEach(p => {
            if (p.status === 'PROBLEM') {
                activeProblemsCount[p.host] = (activeProblemsCount[p.host] || 0) + 1;
            }
        });

        const processedServers = servers.map(server => {
            const processed = { ...server };
            
            processed.activeAlerts = activeProblemsCount[processed.name] || 0;
            
            // ICMP status: Green for 1 or Red for 0
            if (processed.icmp === 1) {
                processed.icmpStatus = 'green';
            } else if (processed.icmp === 0) {
                processed.icmpStatus = 'red';
            } else {
                processed.icmpStatus = 'gray';
            }
            
            // CPU utilization: Green for < 80%, Yellow for 80-90%, Red for > 90%
            if (processed.cpu !== null && processed.cpu !== undefined) {
                if (processed.cpu < 80) {
                    processed.cpuStatus = 'green';
                } else if (processed.cpu >= 80 && processed.cpu <= 90) {
                    processed.cpuStatus = 'yellow';
                } else {
                    processed.cpuStatus = 'red';
                }
            } else {
                processed.cpuStatus = 'gray';
            }
            
            // Memory availability: Green for > 10%, Yellow for 5-10%, Red for <= 5%
            if (processed.memory !== null && processed.memory !== undefined) {
                if (processed.memory > 10) {
                    processed.memoryStatus = 'green';
                } else if (processed.memory >= 5 && processed.memory <= 10) {
                    processed.memoryStatus = 'yellow';
                } else {
                    processed.memoryStatus = 'red';
                }
            } else {
                processed.memoryStatus = 'gray';
            }
            
            return processed;
        });
        
        const responsePayload = {
            success: true,
            servers: processedServers,
            activeProblems: activeProblems
        };
        
        console.log('[DEBUG] Final payload preview (first 3 problems):', JSON.stringify(responsePayload.activeProblems.slice(0, 3), null, 2));
        console.log('[DEBUG 4] JSON final dashboard enviado al frontend:', JSON.stringify(responsePayload, null, 2));
        
        res.json(responsePayload);
    } catch (err) {
        console.error('Error en /api/dashboard:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});