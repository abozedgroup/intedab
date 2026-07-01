const HOSPITALS = ["شقراء", "مرات", "ثادق"];
const DELEGATION_TYPES = ["حالة اسعافية", "مهمة داخلية"];
const NATIONAL_ID_REGEX = /^\d{10}$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOH_EMAIL_SUFFIX_REGEX = /@moh\.gov\.sa$/i;

/**
 * تنظيف النصوص المدخلة.
 * @param {unknown} value
 * @returns {string}
 */
function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * التحقق من بيانات الموظف الأساسية.
 * @param {Record<string, unknown>} employee
 * @returns {string[]}
 */
function validateEmployee(employee) {
  const errors = [];
  const requiredFields = [
    "employee_number",
    "national_id",
    "full_name",
    "job_title",
    "email",
    "phone",
    "hospital",
  ];

  requiredFields.forEach((field) => {
    if (!cleanString(employee[field])) {
      errors.push(`الحقل ${field} مطلوب.`);
    }
  });

  if (!NATIONAL_ID_REGEX.test(cleanString(employee.national_id))) {
    errors.push("رقم الهوية يجب أن يحتوي على 10 أرقام فقط.");
  }

  if (!SIMPLE_EMAIL_REGEX.test(cleanString(employee.email))) {
    errors.push("صيغة البريد الإلكتروني غير صحيحة.");
  } else if (!MOH_EMAIL_SUFFIX_REGEX.test(cleanString(employee.email))) {
    errors.push("البريد الإلكتروني يجب أن ينتهي بـ @MOH.GOV.SA.");
  }

  if (!HOSPITALS.includes(cleanString(employee.hospital))) {
    errors.push("المستشفى المختار غير صالح.");
  }

  return errors;
}

/**
 * التحقق من كل انتداب.
 * @param {Record<string, unknown>} delegation
 * @returns {string[]}
 */
function validateDelegation(delegation) {
  const errors = [];
  const requiredFields = [
    "start_date",
    "end_date",
    "delegation_type",
    "from_entity",
    "to_entity",
  ];

  requiredFields.forEach((field) => {
    if (!cleanString(delegation[field])) {
      errors.push(`الحقل ${field} مطلوب في الانتداب.`);
    }
  });

  const startDate = new Date(cleanString(delegation.start_date));
  const endDate = new Date(cleanString(delegation.end_date));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    errors.push("صيغة التاريخ غير صحيحة.");
  } else if (endDate < startDate) {
    errors.push("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.");
  }

  if (!DELEGATION_TYPES.includes(cleanString(delegation.delegation_type))) {
    errors.push("نوع الانتداب غير صالح.");
  }

  return errors;
}

module.exports = {
  HOSPITALS,
  DELEGATION_TYPES,
  cleanString,
  validateEmployee,
  validateDelegation,
};
