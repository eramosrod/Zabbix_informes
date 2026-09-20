const axios = require('axios');

class ZabbixService {
    constructor(apiUrl, authToken) {
        this.apiUrl = apiUrl;
        this.authToken = authToken;
    }

    async call(method, params) {
        try {
            const response = await axios.post(this.apiUrl, {
                jsonrpc: '2.0',
                method: method,
                params: { ...params, auth: this.authToken },
                id: 1
            });

            if (response.data.error) {
                throw new Error(`Zabbix API Error: ${response.data.error.message} - ${response.data.error.data}`);
            }

            return response.data.result;
        } catch (error) {
            console.error('Error calling Zabbix API:', error);
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
