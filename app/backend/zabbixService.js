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

    async getHostsInGroup(selectedHostGroupId) {
        const params = {
            output: ['hostid', 'host', 'name'],
            groupids: selectedHostGroupId,
            filter: { status: '0' }   // solo hosts activados
        };
        const hosts = await this.call('host.get', params);
        console.log('[DEBUG 1] Hosts obtenidos de Zabbix:', hosts);
        if (hosts.length === 0) {
            console.log('[DEBUG 1] ADVERTENCIA: No se obtuvieron hosts para el groupid', selectedHostGroupId);
        }
        return hosts;
    }

    async getHostsConsolidatedMetrics(hosts) {
        const hostIds = hosts.map(h => h.hostid);
        const allItems = await this.call('item.get', {
            hostids: hostIds,
            output: ['itemid', 'hostid', 'key_', 'lastvalue', 'name']
        });

        const hostMetrics = hosts.map(host => {
            const hostItems = allItems.filter(i => i.hostid === host.hostid);

            const icmpItem = hostItems.find(i => i.key_ === 'icmpping' || i.key_.includes('icmpping'));
            const cpuItem = hostItems.find(i => i.key_ === 'system.cpu.util' || i.key_.includes('cpu.util'));
            const memItem = hostItems.find(i => i.key_ === 'vm.memory.size[pavailable]' || i.key_.includes('pavailable'));
            const diskItems = hostItems.filter(i => i.key_.includes('vfs.fs.size[') && i.key_.includes(',pfree]'));

            // Seleccionar el disco con el pfree más alto
            let bestDisk = null;
            if (diskItems.length > 0) {
                bestDisk = diskItems.reduce((prev, current) => {
                    return (parseFloat(current.lastvalue) > parseFloat(prev.lastvalue)) ? current : prev;
                });
            }

            return {
                hostid: host.hostid,
                name: host.name,
                icmp: icmpItem ? parseInt(icmpItem.lastvalue) : null,
                cpu: cpuItem ? parseFloat(cpuItem.lastvalue) : null,
                memory: memItem ? parseFloat(memItem.lastvalue) : null,
                disk: bestDisk ? {
                    name: bestDisk.key_.split(']')[0].split('[')[1].split(',')[0],
                    pfree: parseFloat(bestDisk.lastvalue)
                } : null
            };
        });

        console.log('[DEBUG 2] Ítems mapeados por host:', hostMetrics);
        return hostMetrics;
    }

    async getActiveProblems(groupIds, timeFrom, timeTill) {
        console.log('[DEBUG] getActiveProblems inputs:', { groupIds, timeFrom, timeTill });
        // Validate timestamps (seconds vs milliseconds)
        if (timeFrom > 1000000000000 || timeTill > 1000000000000) {
            console.warn('[DEBUG] WARNING: Timestamps might be in milliseconds!');
        }

        let events = await this.call('event.get', {
            output: ['eventid', 'source', 'object', 'objectid', 'clock', 'value', 'severity', 'name', 'r_eventid'],
            selectHosts: ['hostid', 'host', 'name'],
            selectAcknowledges: 'extend',
            source: 0,
            object: 0,
            groupids: groupIds,
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: ['clock', 'eventid'],
            sortorder: 'DESC',
            limit: 150
        });

        console.log(`[DEBUG] API event.get returned ${events.length} events.`);
        if (events.length > 0) {
            console.log('[DEBUG] First event:', JSON.stringify(events[0], null, 2));
        }

        // Fallback logic
        if (events.length === 0) {
            console.log('[DEBUG] No events found with filters. Running fallback query...');
            events = await this.call('event.get', {
                output: ['eventid', 'source', 'object', 'objectid', 'clock', 'value', 'severity', 'name', 'r_eventid'],
                selectHosts: ['hostid', 'host', 'name'],
                selectAcknowledges: 'extend',
                source: 0,
                object: 0,
                groupids: groupIds,
                // No time filters
                sortfield: ['clock', 'eventid'],
                sortorder: 'DESC',
                limit: 10
            });
            console.log(`[DEBUG] Fallback query returned ${events.length} events.`);
        }

        const rEventIds = [...new Set(events.filter(e => parseInt(e.r_eventid) > 0).map(e => e.r_eventid))];

        let recoveryEventsMap = {};
        if (rEventIds.length > 0) {
            const recoveryEvents = await this.call('event.get', {
                output: ['eventid', 'clock'],
                eventids: rEventIds
            });
            recoveryEvents.forEach(re => {
                recoveryEventsMap[re.eventid] = re.clock;
            });
        }

        return events.map(event => {
            const r_clock = recoveryEventsMap[event.r_eventid] || null;
            const isResolved = parseInt(event.r_eventid) > 0 || parseInt(event.value) === 0;

            return {
                eventid: event.eventid,
                clock: parseInt(event.clock),
                r_clock: r_clock ? parseInt(r_clock) : null,
                status: isResolved ? 'RESOLVED' : 'PROBLEM',
                host: event.hosts && event.hosts.length > 0 ? event.hosts[0].name : 'N/A',
                problem: event.name,
                severity: parseInt(event.severity),
                acknowledged: event.acknowledges && event.acknowledges.length > 0
            };
        });
    }
}
module.exports = ZabbixService;