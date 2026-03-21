import ExcelJS from 'exceljs';

export async function exportExpensesExcel(expenses, filename = 'expenses.xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Expenses');

    ws.columns = [
        { header: 'Description', key: 'title', width: 28 },
        { header: 'Category', key: 'category', width: 14 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Notes', key: 'notes', width: 30 },
    ];

    for (const e of expenses || []) {
        ws.addRow({
            title: e.title || '',
            category: e.category || 'Other',
            date: String(e.date || '').slice(0, 10),
            amount: Number(e.amount || 0),
            status: e.status || 'Approved',
            notes: e.notes || '',
        });
    }

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
