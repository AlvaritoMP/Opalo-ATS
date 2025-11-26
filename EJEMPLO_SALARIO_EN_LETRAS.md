# Ejemplo: Salario Acordado en Letras

## Entrada: 1800

Cuando ingresas un salario acordado de **1800**, el sistema generará automáticamente:

### Resultado:
**"Mil ochocientos y 00/100 soles"**

---

## Ejemplos de diferentes formatos de entrada:

El sistema acepta varios formatos y todos generarán el mismo resultado:

| Entrada | Resultado generado |
|---------|-------------------|
| `1800` | "Mil ochocientos y 00/100 soles" |
| `S/1800` | "Mil ochocientos y 00/100 soles" |
| `S/ 1,800` | "Mil ochocientos y 00/100 soles" |
| `S/1,800.00` | "Mil ochocientos y 00/100 soles" |
| `1800.00` | "Mil ochocientos y 00/100 soles" |
| `$1,800` | "Mil ochocientos y 00/100 soles" |

---

## Otros ejemplos de montos:

| Monto | Salario en Letras |
|-------|------------------|
| `2500` | "Dos mil quinientos y 00/100 soles" |
| `3500` | "Tres mil quinientos y 00/100 soles" |
| `1200` | "Mil doscientos y 00/100 soles" |
| `5000` | "Cinco mil y 00/100 soles" |
| `12500` | "Doce mil quinientos y 00/100 soles" |
| `2500.50` | "Dos mil quinientos y 50/100 soles" |
| `1800.75` | "Mil ochocientos y 75/100 soles" |

---

## Características:

✅ **Generación automática**: Se genera automáticamente cuando guardas o actualizas el campo "Salario Acordado"

✅ **Soporta diferentes formatos**: Acepta símbolos de moneda (S/, $), comas, puntos, espacios

✅ **Formato peruano**: Utiliza el formato estándar peruano "XXXX y YY/100 soles"

✅ **Uso en plantillas**: Puedes usar el campo `{{Salarioacordadoletras}}` en tus plantillas de Word

---

## Nota importante:

El campo de salario en letras se genera **automáticamente** en segundo plano y no es visible en la interfaz de usuario. Está disponible para usar en las plantillas de cartas y documentos dinámicos.

