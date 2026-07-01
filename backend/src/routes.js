const express = require("express");
const ExcelJS = require("exceljs");
const { all, get, run } = require("./db-utils");
const {
  cleanString,
  validateDelegation,
  validateEmployee,
} = require("./validation");

const router = express.Router();
const MOH_EMAIL_SUFFIX = "@MOH.GOV.SA";
const MOH_EMAIL_SUFFIX_LOWER = MOH_EMAIL_SUFFIX.toLowerCase();

/**
 * استخراج الجزء الأول من البريد (قبل @) بصيغة موحدة.
 * @param {unknown} email
 * @returns {string}
 */
function extractEmailLocalPart(email) {
  const cleaned = cleanString(email).toLowerCase();
  if (!cleaned) {
    return "";
  }
  if (cleaned.endsWith(MOH_EMAIL_SUFFIX_LOWER)) {
    return cleaned.slice(0, -MOH_EMAIL_SUFFIX_LOWER.length);
  }
  const atIndex = cleaned.indexOf("@");
  return atIndex === -1 ? cleaned : cleaned.slice(0, atIndex);
}

/**
 * بناء البريد الرسمي للموظف بصيغة الوزارة.
 * @param {string} localPart
 * @returns {string}
 */
function buildMohEmail(localPart) {
  return `${extractEmailLocalPart(localPart)}${MOH_EMAIL_SUFFIX}`;
}

/**
 * تجهيز بيانات الموظف بشكل موحد قبل الحفظ.
 * @param {Record<string, unknown>} employee
 */
function normalizeEmployee(employee) {
  return {
    employee_number: cleanString(employee.employee_number),
    national_id: cleanString(employee.national_id),
    full_name: cleanString(employee.full_name),
    job_title: cleanString(employee.job_title),
    email: extractEmailLocalPart(employee.email),
    phone: cleanString(employee.phone),
    hospital: cleanString(employee.hospital),
  };
}

/**
 * تجهيز بيانات الانتداب بشكل موحد قبل الحفظ.
 * @param {Record<string, unknown>} delegation
 */
function normalizeDelegation(delegation) {
  return {
    start_date: cleanString(delegation.start_date),
    end_date: cleanString(delegation.end_date),
    delegation_type: cleanString(delegation.delegation_type),
    from_entity: cleanString(delegation.from_entity),
    to_entity: cleanString(delegation.to_entity),
  };
}

/**
 * جلب الموظف وانتداباته باستخدام الرقم الوظيفي.
 */
router.get("/employees/:employeeNumber", async (req, res) => {
  try {
    const employeeNumber = cleanString(req.params.employeeNumber);
    const employee = await get(
      "SELECT * FROM employees WHERE employee_number = ?",
      [employeeNumber]
    );

    if (!employee) {
      res.status(404).json({ message: "لا يوجد موظف بهذا الرقم الوظيفي." });
      return;
    }

    const delegations = await all(
      `
      SELECT id, start_date, end_date, delegation_type, from_entity, to_entity
      FROM delegations
      WHERE employee_id = ?
      ORDER BY start_date ASC
      `,
      [employee.id]
    );

    res.json({
      employee: {
        ...employee,
        email: extractEmailLocalPart(employee.email),
      },
      delegations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "حدث خطأ أثناء تحميل البيانات." });
  }
});

/**
 * إنشاء/تحديث بيانات الموظف وانتداباته في عملية واحدة.
 */
router.post("/employees/upsert", async (req, res) => {
  try {
    const employeeInput = normalizeEmployee(req.body?.employee || {});
    const delegationsInput = Array.isArray(req.body?.delegations)
      ? req.body.delegations.map(normalizeDelegation)
      : [];
    const normalizedEmployeeEmail = buildMohEmail(employeeInput.email);

    const errors = validateEmployee(employeeInput);
    delegationsInput.forEach((delegation) => {
      errors.push(...validateDelegation(delegation));
    });

    const duplicateDelegationKeys = new Set();
    const repeated = delegationsInput.some((delegation) => {
      const key = [
        delegation.start_date,
        delegation.end_date,
        delegation.from_entity,
        delegation.to_entity,
      ].join("|");
      if (duplicateDelegationKeys.has(key)) {
        return true;
      }
      duplicateDelegationKeys.add(key);
      return false;
    });

    if (repeated) {
      errors.push("لا يمكن تكرار نفس الانتداب أكثر من مرة.");
    }

    if (errors.length > 0) {
      res.status(400).json({ message: "فشل التحقق من البيانات.", errors });
      return;
    }

    const existingEmployee = await get(
      "SELECT id FROM employees WHERE employee_number = ?",
      [employeeInput.employee_number]
    );

    await run("BEGIN TRANSACTION");

    let employeeId = existingEmployee?.id;
    if (employeeId) {
      await run(
        `
        UPDATE employees
        SET national_id = ?, full_name = ?, job_title = ?, email = ?, phone = ?, hospital = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          employeeInput.national_id,
          employeeInput.full_name,
          employeeInput.job_title,
          normalizedEmployeeEmail,
          employeeInput.phone,
          employeeInput.hospital,
          employeeId,
        ]
      );
    } else {
      const created = await run(
        `
        INSERT INTO employees (employee_number, national_id, full_name, job_title, email, phone, hospital)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          employeeInput.employee_number,
          employeeInput.national_id,
          employeeInput.full_name,
          employeeInput.job_title,
          normalizedEmployeeEmail,
          employeeInput.phone,
          employeeInput.hospital,
        ]
      );
      employeeId = created.lastID;
    }

    await run("DELETE FROM delegations WHERE employee_id = ?", [employeeId]);

    for (const delegation of delegationsInput) {
      await run(
        `
        INSERT INTO delegations (employee_id, start_date, end_date, delegation_type, from_entity, to_entity)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          employeeId,
          delegation.start_date,
          delegation.end_date,
          delegation.delegation_type,
          delegation.from_entity,
          delegation.to_entity,
        ]
      );
    }

    await run("COMMIT");

    const employee = await get("SELECT * FROM employees WHERE id = ?", [employeeId]);
    const delegations = await all(
      `
      SELECT id, start_date, end_date, delegation_type, from_entity, to_entity
      FROM delegations
      WHERE employee_id = ?
      ORDER BY start_date ASC
      `,
      [employeeId]
    );

    res.json({
      message: "تم حفظ البيانات بنجاح.",
      employee: {
        ...employee,
        email: extractEmailLocalPart(employee.email),
      },
      delegations,
    });
  } catch (error) {
    await run("ROLLBACK").catch(() => null);

    if (error?.code === "SQLITE_CONSTRAINT") {
      res.status(409).json({
        message: "يوجد تعارض في البيانات. تأكد من عدم تكرار نفس الانتداب.",
      });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "حدث خطأ أثناء حفظ البيانات." });
  }
});

/**
 * تصدير جميع البيانات إلى ملف إكسل.
 */
router.get("/export", async (req, res) => {
  try {
    const password = cleanString(req.query.password);
    const expectedPassword = process.env.EXPORT_PASSWORD || "123456";

    if (password !== expectedPassword) {
      res.status(401).json({ message: "كلمة المرور غير صحيحة." });
      return;
    }

    const rows = await all(
      `
      SELECT
        e.full_name,
        e.employee_number,
        e.national_id,
        e.job_title,
        e.email,
        e.phone,
        e.hospital,
        d.start_date,
        d.end_date,
        d.delegation_type,
        d.from_entity,
        d.to_entity
      FROM employees e
      JOIN delegations d ON d.employee_id = e.id
      ORDER BY e.full_name ASC, d.start_date ASC
      `
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Delegations");

    worksheet.columns = [
      { header: "الاسم", key: "full_name", width: 24 },
      { header: "الرقم الوظيفي", key: "employee_number", width: 16 },
      { header: "رقم الهوية", key: "national_id", width: 16 },
      { header: "المسمى الوظيفي", key: "job_title", width: 20 },
      { header: "البريد", key: "email", width: 28 },
      { header: "الجوال", key: "phone", width: 16 },
      { header: "المستشفى", key: "hospital", width: 14 },
      { header: "تاريخ البداية", key: "start_date", width: 16 },
      { header: "تاريخ النهاية", key: "end_date", width: 16 },
      { header: "نوع الانتداب", key: "delegation_type", width: 20 },
      { header: "الجهة من", key: "from_entity", width: 24 },
      { header: "الجهة إلى", key: "to_entity", width: 24 },
    ];

    rows.forEach((row) => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ rightToLeft: true }];

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="delegations-${Date.now()}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "حدث خطأ أثناء التصدير." });
  }
});

module.exports = router;
