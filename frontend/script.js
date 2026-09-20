document.getElementById('export-pdf').addEventListener('click', () => {
    const element = document.getElementById('dashboard');
    const opt = {
        margin: 1,
        filename: 'informe-zabbix.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
});
