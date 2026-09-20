const axios = require('axios');

class ZabbixService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.authToken = null;
    }

    async login(username, password) {
        try {
            // Intentar amb "username" (Zabbix 6.4/7.0+)
            this.authToken = await this.call('user.login', {
                username: username,
                password: password
            });
        } catch (error) {
            console.log('Retrying login with "user" parameter (fallback)...');
            // Fallback a "user" (versions antigues)
            this.authToken = await this.call('user.login', {
                user: username,
                password: password
            });
        }
        return this.authToken;
    }

    async call(method, params, useAuthInBody = false) {
        const requestBody = {
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        };
        const headers = { 'Content-Type': 'application/json-rpc' };

        if (this.authToken) {
            if (useAuthInBody) {
                requestBody.auth = this.authToken;
            } else {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
        }

        try {
            console.log(`Calling Zabbix API: ${method}`);
            const response = await axios.post(this.apiUrl, requestBody, { headers });

            if (response.data.error) {
                // Si falla per autorització, provar fallback
                if (!useAuthInBody && (response.data.error.code === -32500 || response.data.error.message.includes('Not authorized'))) {
                    console.log('Retrying with auth in body (fallback)...');
                    return await this.call(method, params, true);
                }
                console.error('Zabbix API Error Details:', JSON.stringify(response.data.error, null, 2));
                throw new Error(`Zabbix API Error: ${response.data.error.message}`);
            }

            return response.data.result;
        } catch (error) {
            console.error(`Error calling Zabbix API (${method}):`, error.message);
            if (error.response && error.response.data) {
                console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async getHostGroupIds(groupName) {
        const result = await this.call('hostgroup.get', {
            filter: { name: groupName }
        });
        return result.map(group => group.groupid);
    }

    async getHostsInGroup(groupIds) {
        const result = await this.call('host.get', {
            groupids: groupIds,
            output: ['hostid', 'name']
        });
        return result;
    }

    async getHostsConsolidatedMetrics(hostIds, timeFrom, timeTill) {
        // Obtenir dades consolidades per a la taula de servidors
        // CPU, MEM, DISK, ICMP, ALERTS
        const [cpu, memory, disk, icmp, alerts] = await Promise.all([
            this.getMetricData(hostIds, 'system.cpu.util', timeFrom, timeTill),
            this.getMetricData(hostIds, 'vm.memory.size[pused]', timeFrom, timeTill),
            this.getMetricData(hostIds, 'vfs.fs.size[/,pused]', timeFrom, timeTill),
            this.getIcmpLoss(hostIds, timeFrom, timeTill),
            this.getTopTriggers(hostIds, timeFrom, timeTill)
        ]);

        return { cpu, memory, disk, icmp, alerts };
    }

    async getMetricData(hostIds, key, timeFrom, timeTill) {
        const items = await this.call('item.get', {
            hostids: hostIds,
            search: { key_: key },
            output: ['itemid', 'hostid']
        });

        const itemIds = items.map(item => item.itemid);
        if (itemIds.length === 0) return [];

        return await this.call('history.get', {
            itemids: itemIds,
            history: 0, // 0 per a float
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend',
            sortfield: 'clock',
            sortorder: 'ASC'
        });
    }

    async getTopTriggers(hostIds, timeFrom, timeTill) {
        // Implementació per obtenir Top Triggers
        const problems = await this.call('problem.get', {
            hostids: hostIds,
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend'
        });
        
        console.log('Problems returned from Zabbix:', JSON.stringify(problems, null, 2));
        
        // Processar i agrupar
        return problems;
    }

    async getIcmpLoss(hostIds, timeFrom, timeTill) {
        // 1. Obtenir els itemids per a 'icmpping'
        const items = await this.call('item.get', {
            hostids: hostIds,
            search: { key_: 'icmpping' },
            output: ['itemid']
        });

        const itemIds = items.map(item => item.itemid);

        if (itemIds.length === 0) {
            return [];
        }

        // 2. Obtenir l'historial
        return await this.call('history.get', {
            itemids: itemIds,
            history: 3, // 3 per a enter (icmpping)
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend',
            sortfield: 'clock',
            sortorder: 'ASC'
        });
    }
}
module.exports = ZabbixService;
