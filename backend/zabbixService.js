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
            console.log(`API Response for ${method}:`, JSON.stringify(response.data, null, 2));

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
            output: ['hostid', 'name', 'host'],
            filter: { status: 0 }
        });
        console.log('Hosts encontrados:', result.length, result);
        return result;
    }

    async getHostsConsolidatedMetrics(hosts, timeFrom, timeTill) {
        const hostIds = hosts.map(h => h.hostid);
        
        // 1. Fetch all items for these hosts
        const allItems = await this.call('item.get', {
            hostids: hostIds,
            output: ['itemid', 'hostid', 'key_', 'lastvalue', 'units', 'value_type']
        });

        // 2. Filter items based on patterns
        const icmpItems = allItems.filter(i => i.key_.includes('icmpping') || i.key_.includes('agent.ping'));
        const cpuItems = allItems.filter(i => i.key_.includes('system.cpu.util') || i.key_.includes('cpu.util') || i.key_.includes('cpu.load'));
        const memItems = allItems.filter(i => i.key_.includes('vm.memory.size[pavailable]') || i.key_.includes('memory.size[pavailable]') || i.key_.includes('memory.available'));
        const diskItems = allItems.filter(i => i.key_.includes('vfs.fs.size') && i.key_.includes(',pfree]'));

        // 3. Fetch history for all items
        const allItemIds = allItems.map(i => i.itemid);
        const history = await this.call('history.get', {
            itemids: allItemIds,
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend',
            sortfield: 'clock',
            sortorder: 'ASC'
        });

        // Helper to get latest value for a host and a set of items
        const getLatestValue = (hostid, items) => {
            const itemIds = items.filter(i => i.hostid === hostid).map(i => i.itemid);
            const itemHistory = history.filter(h => itemIds.includes(h.itemid));
            if (itemHistory.length === 0) {
                // Fallback to lastvalue
                const item = items.find(i => i.hostid === hostid);
                return item ? item.lastvalue : null;
            }
            return itemHistory[itemHistory.length - 1].value;
        };

        // 4. Process and normalize
        return hosts.map(host => {
            const cpuVal = getLatestValue(host.hostid, cpuItems);
            const memVal = getLatestValue(host.hostid, memItems);
            const icmpVal = getLatestValue(host.hostid, icmpItems);
            
            const hostDiskItems = diskItems.filter(i => i.hostid === host.hostid);
            const diskData = hostDiskItems.map(i => ({
                name: i.key_.split(']')[0].split('[')[1].split(',')[0], // Extract disk name from key
                pfree: parseFloat(getLatestValue(host.hostid, [i]))
            }));

            return {
                hostid: host.hostid,
                name: host.name,
                icmp: icmpVal !== null ? (parseInt(icmpVal) === 1 ? 1 : 0) : null,
                cpu: cpuVal !== null ? parseFloat(cpuVal) : null,
                memory: memVal !== null ? parseFloat(memVal) : null,
                disk: diskData
            };
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
        
        // Processar i agrupar
        return Array.isArray(problems) ? problems : [];
    }
}
module.exports = ZabbixService;
