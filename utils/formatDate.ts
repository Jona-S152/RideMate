const isValidDate = (dateString: string): { isValid: boolean; message?: string } => {
  // 1. Verificar el formato exacto AAAA-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return { isValid: false, message: "El formato debe ser AAAA-MM-DD (Ej. 2028-12-31)." };
  }

  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 2. Validar rango de año
  const currentYear = new Date().getFullYear();
  if (year < currentYear || year > currentYear + 20) {
    return { isValid: false, message: `El año debe estar entre ${currentYear} y ${currentYear + 20}.` };
  }

  // 3. Validar rango de mes (1 - 12)
  if (month < 1 || month > 12) {
    return { isValid: false, message: "El mes debe ser un valor válido entre 01 y 12." };
  }

  // 4. Validar días reales usando el objeto Date nativo de JS
  // JS ajusta automáticamente las fechas inválidas (ej. 2028-02-31 pasa a 2028-03-02),
  // por lo que comparamos los valores desglosados para asegurar precisión estricta.
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() + 1 !== month ||
    dateObj.getDate() !== day
  ) {
    return { isValid: false, message: "El día ingresado no es válido para el mes especificado." };
  }

  return { isValid: true };
};

const formatDateInput = (text: string): string => {
  // 1. Remover cualquier carácter que no sea un número
  const cleaned = text.replace(/\D/g, "");

  // 2. Limitar a máximo 8 dígitos (AAAAMMDD)
  const truncated = cleaned.slice(0, 8);

  // 3. Aplicar la máscara AAAA-MM-DD según la cantidad de dígitos ingresados
  if (truncated.length <= 4) {
    return truncated;
  }
  if (truncated.length <= 6) {
    return `${truncated.slice(0, 4)}-${truncated.slice(4)}`;
  }
  return `${truncated.slice(0, 4)}-${truncated.slice(4, 6)}-${truncated.slice(6)}`;
};

export {
    formatDateInput, isValidDate
};
