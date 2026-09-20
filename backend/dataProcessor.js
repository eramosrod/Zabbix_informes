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
        // Lógica para procesar y estandarizar datos de memoria
        return data.map(item => ({
            ...item,
            value_avg: this.formatPercentage(item.value_avg)
        }));
    }

    static processCpuData(data) {
        // Lógica para procesar y estandarizar datos de CPU
        return data.map(item => ({
            ...item,
            value_avg: this.formatPercentage(item.value_avg)
        }));
    }

    static processDiskData(data) {
        // Lógica para procesar y estandarizar datos de discos
        return data.map(item => ({
            ...item,
            lastvalue: this.formatBytes(item.lastvalue)
        }));
    }
}

module.exports = DataProcessor;
