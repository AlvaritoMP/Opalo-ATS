// Script para generar plantilla Excel
import XLSX from 'xlsx';

// Datos de ejemplo
const templateData = [
    {
        'name': 'Juan Pérez',
        'email': 'juan.perez@email.com',
        'phone': '987654321',
        'description': 'Desarrollador Frontend con 5 años de experiencia',
        'source': 'LinkedIn',
        'salaryExpectation': '$50000',
        'agreedSalary': '$55000',
        'age': 30,
        'dni': '12345678',
        'linkedinUrl': 'https://linkedin.com/in/juanperez',
        'address': 'Lima',
        'province': 'LIMA',
        'district': 'MIRAFLORES'
    },
    {
        'name': 'María González',
        'email': 'maria.gonzalez@email.com',
        'phone': '987654322',
        'description': 'Ingeniera de Software especializada en React',
        'source': 'Referencia',
        'salaryExpectation': '$60000',
        'agreedSalary': '',
        'age': 28,
        'dni': '87654321',
        'linkedinUrl': 'https://linkedin.com/in/mariagonzalez',
        'address': 'Arequipa',
        'province': 'AREQUIPA',
        'district': 'YANAHUARA'
    },
    {
        'name': 'Carlos Rodríguez',
        'email': 'carlos.rodriguez@email.com',
        'phone': '987654323',
        'description': 'Diseñador UX/UI con experiencia en apps móviles',
        'source': 'Sitio web',
        'salaryExpectation': '$45000',
        'agreedSalary': '$48000',
        'age': 32,
        'dni': '11223344',
        'linkedinUrl': 'https://linkedin.com/in/carlosrodriguez',
        'address': 'Cusco',
        'province': 'CUSCO',
        'district': 'CUSCO'
    }
];

// Crear workbook
const wb = XLSX.utils.book_new();

// Convertir datos a worksheet
const ws = XLSX.utils.json_to_sheet(templateData);

// Agregar worksheet al workbook
XLSX.utils.book_append_sheet(wb, ws, 'Candidatos');

// Escribir archivo
XLSX.writeFile(wb, 'plantilla-importacion-candidatos.xlsx');

console.log('✅ Archivo Excel de plantilla creado: plantilla-importacion-candidatos.xlsx');

