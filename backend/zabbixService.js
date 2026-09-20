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

    async call(method, params) {
        try {
            const requestBody = {
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: 1
            };
            if (this.authToken) {
                requestBody.auth = this.authToken;
            }
            
            console.log(`Calling Zabbix API: ${method}`);
            const response = await axios.post(this.apiUrl, requestBody);

            if (response.data.error) {
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

    async getTopMemoryUsage(hostIds, timeFrom, timeTill) {
        // Implementación para obtener TOP 10 Memoria
        return await this.call('trend.get', {
            hostids: hostIds,
            output: ['itemid', 'value_avg'],
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: 'value_avg',
            sortorder: 'DESC',
            limit: 10
        });
    }

    async getTopCpuUsage(hostIds, timeFrom, timeTill) {
        // Implementación para obtener TOP 10 CPU
        return await this.call('trend.get', {
            hostids: hostIds,
            output: ['itemid', 'value_avg'],
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: 'value_avg',
            sortorder: 'DESC',
            limit: 10
        });
    }

    async getTopDiskUsage(hostIds) {
        // Implementación para obtener TOP 10 Discos
        return await this.call('item.get', {
            hostids: hostIds,
            search: { key_: 'vfs.fs.size' },
            output: ['itemid', 'name', 'lastvalue']
        });
    }

    async getAlerts(hostIds, timeFrom, timeTill) {
        // Implementación para obtener Alertas
        return await this.call('problem.get', {
            hostids: hostIds,
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend'
        });
    }

    async getIcmpLoss(hostIds, timeFrom, timeTill) {
        // Implementación para obtener Pérdida ICMP
        return await this.call('history.get', {
            hostids: hostIds,
            search: { key_: 'icmpping' },
            time_from: timeFrom,
            time_till: timeTill,
            output: 'extend'
        });
    }
}
module.exports = ZabbixService;
