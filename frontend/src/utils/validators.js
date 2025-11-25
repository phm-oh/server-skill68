export const required = (value) => {
  return !!value || 'กรุณากรอกข้อมูล';
};

export const email = (value) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value) || 'รูปแบบอีเมลไม่ถูกต้อง';
};

export const minLength = (min) => {
  return (value) => {
    return (value && value.length >= min) || `ต้องมีอย่างน้อย ${min} ตัวอักษร`;
  };
};

export const maxLength = (max) => {
  return (value) => {
    return !value || value.length <= max || `ต้องไม่เกิน ${max} ตัวอักษร`;
  };
};

export const numeric = (value) => {
  return !isNaN(value) || 'กรุณากรอกตัวเลข';
};

export const range = (min, max) => {
  return (value) => {
    const num = Number(value);
    return (num >= min && num <= max) || `ต้องอยู่ระหว่าง ${min} - ${max}`;
  };
};

export const url = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return 'รูปแบบ URL ไม่ถูกต้อง';
  }
};
