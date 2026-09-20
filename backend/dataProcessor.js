class DataProcessor {
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static formatPercentage(value) {
        return parseFloat(value).toFixed(2) + '%';
    }

    static processMemoryData(data) {
        const grouped = data.reduce((acc, item) => {
            if (!acc[item.hostid]) {
                acc[item.hostid] = { host: item.hostname, memory_used: 0, total: 0 };
            }
            // Asumimos que los ítems tienen un nombre que identifica si es usado o total
            if (item.name.includes('Used')) acc[item.hostid].memory_used = parseFloat(item.lastvalue);
            if (item.name.includes('Total')) acc[item.hostid].total = parseFloat(item.lastvalue);
            return acc;
        }, {});
        return Object.values(grouped).map(item => ({
            ...item,
            percentage: (item.memory_used / item.total * 100).toFixed(2)
        }));
    }

    static processCpuData(data) {
        const grouped = data.reduce((acc, item) => {
            if (!acc[item.hostid]) {
                acc[item.hostid] = { host: item.hostname, cpu_load: 0 };
            }
            acc[item.hostid].cpu_load = parseFloat(item.lastvalue);
            return acc;
        }, {});
        return Object.values(grouped);
    }

    static processDiskData(data) {
        const grouped = data.reduce((acc, item) => {
            if (!acc[item.hostid]) {
                acc[item.hostid] = { host: item.hostname, disk: item.name, usage: 0 };
            }
            acc[item.hostid].usage = parseFloat(item.lastvalue);
            return acc;
        }, {});
        return Object.values(grouped);
    }
}

module.exports = DataProcessor;
