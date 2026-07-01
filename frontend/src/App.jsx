import { useMemo, useState } from "react";
import "./App.css";

const HOSPITAL_OPTIONS = ["شقراء", "مرات", "ثادق"];
const DELEGATION_TYPE_OPTIONS = ["حالة اسعافية", "مهمة داخلية"];
const INITIAL_EMPLOYEE = {
  employee_number: "",
  national_id: "",
  full_name: "",
  job_title: "",
  email: "",
  phone: "",
  hospital: HOSPITAL_OPTIONS[0],
};

const INITIAL_DELEGATION = {
  start_date: "",
  end_date: "",
  delegation_type: DELEGATION_TYPE_OPTIONS[0],
  from_entity: "",
  to_entity: "",
};
const EXPORT_PAGE_PATH = "/owner-export-2026";

function App() {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const isExportPage = currentPath === EXPORT_PAGE_PATH;
  const [employee, setEmployee] = useState(INITIAL_EMPLOYEE);
  const [delegations, setDelegations] = useState([{ ...INITIAL_DELEGATION }]);
  const [employeeLookup, setEmployeeLookup] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [commitmentAccepted, setCommitmentAccepted] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "info" });
  const [loading, setLoading] = useState(false);

  const canSave = useMemo(
    () => employee.employee_number.trim() && employee.full_name.trim(),
    [employee]
  );

  function showMessage(text, type = "info") {
    setMessage({ text, type });
  }

  function updateEmployeeField(field, value) {
    setEmployee((prev) => ({ ...prev, [field]: value }));
  }

  function normalizeEmailLocalPart(value) {
    return value.trim().split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
  }

  function updateDelegationField(index, field, value) {
    setDelegations((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addDelegationRow() {
    setDelegations((prev) => [...prev, { ...INITIAL_DELEGATION }]);
  }

  function removeDelegationRow(index) {
    setDelegations((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function loadEmployeeData() {
    if (!employeeLookup.trim()) {
      showMessage("أدخل الرقم الوظيفي أولاً.", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/employees/${encodeURIComponent(employeeLookup.trim())}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "تعذر تحميل بيانات الموظف.");
      }

      const data = await response.json();
      setEmployee({
        employee_number: data.employee.employee_number || "",
        national_id: data.employee.national_id || "",
        full_name: data.employee.full_name || "",
        job_title: data.employee.job_title || "",
        email: normalizeEmailLocalPart(data.employee.email || ""),
        phone: data.employee.phone || "",
        hospital: data.employee.hospital || HOSPITAL_OPTIONS[0],
      });
      setDelegations(
        data.delegations.length > 0 ? data.delegations : [{ ...INITIAL_DELEGATION }]
      );
      showMessage("تم تحميل بيانات الموظف بنجاح.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveAllData(event) {
    event.preventDefault();
    if (!commitmentAccepted) {
      showMessage(
        "يرجى الإقرار بصحة البيانات وعدم إدخال الانتدابات في موارد سابقًا أو ترصيدها كإجازات.",
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/employees/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee: {
            ...employee,
            email: normalizeEmailLocalPart(employee.email),
          },
          delegations,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        const details =
          Array.isArray(result.errors) && result.errors.length > 0
            ? `\n- ${result.errors.join("\n- ")}`
            : "";
        throw new Error((result.message || "تعذر حفظ البيانات.") + details);
      }

      setEmployee({
        employee_number: result.employee.employee_number,
        national_id: result.employee.national_id,
        full_name: result.employee.full_name,
        job_title: result.employee.job_title,
        email: normalizeEmailLocalPart(result.employee.email),
        phone: result.employee.phone,
        hospital: result.employee.hospital,
      });
      setDelegations(
        result.delegations.length > 0 ? result.delegations : [{ ...INITIAL_DELEGATION }]
      );
      setEmployeeLookup(result.employee.employee_number);
      showMessage("تم حفظ بيانات الموظف والانتدابات بنجاح.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    if (!exportPassword.trim()) {
      showMessage("أدخل كلمة مرور التصدير.", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/export?password=${encodeURIComponent(exportPassword.trim())}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "فشل التصدير.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `delegations-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      showMessage("تم تجهيز ملف التصدير بنجاح.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (isExportPage) {
    return (
      <main className="page" dir="rtl">
        <section className="card export-card">
          <h1>تصدير البيانات</h1>
          <p className="subtitle">هذه صفحة التصدير الخاصة بصاحب النظام فقط.</p>
          {message.text ? (
            <div className={`message ${message.type === "error" ? "error" : ""}`}>
              {message.text}
            </div>
          ) : null}
          <div className="lookup-inputs">
            <input
              type="password"
              value={exportPassword}
              onChange={(event) => setExportPassword(event.target.value)}
              placeholder="أدخل كلمة المرور"
            />
            <button type="button" onClick={downloadExcel} disabled={loading}>
              {loading ? "جاري تجهيز الملف..." : "تصدير إلى Excel"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page" dir="rtl">
      <section className="card">
        <h1>نظام جمع بيانات الانتدابات</h1>
        <p className="subtitle">
          أدخل بيانات الموظف مرة واحدة ثم أضف أو عدّل أي عدد من الانتدابات.
        </p>

        {message.text ? (
          <div className={`message ${message.type === "error" ? "error" : ""}`}>
            {message.text}
          </div>
        ) : null}

        <div className="lookup-row">
          <label htmlFor="employeeLookup">الدخول بالرقم الوظيفي</label>
          <p className="lookup-hint">
            إذا كنت قد أدخلت بيانات انتداباتك سابقًا، يمكنك إدخال رقم الموظف ثم
            الضغط على "تحميل البيانات" لإكمال أو تعديل الانتدابات.
          </p>
          <div className="lookup-inputs">
            <input
              id="employeeLookup"
              type="text"
              value={employeeLookup}
              onChange={(event) => setEmployeeLookup(event.target.value)}
              placeholder="مثال: 10255"
            />
            <button type="button" onClick={loadEmployeeData} disabled={loading}>
              تحميل البيانات
            </button>
          </div>
        </div>

        <form onSubmit={saveAllData}>
          <h2>البيانات الشخصية</h2>
          <div className="grid">
            <div className="field">
              <label>الاسم الكامل *</label>
              <input
                required
                type="text"
                value={employee.full_name}
                onChange={(event) => updateEmployeeField("full_name", event.target.value)}
              />
            </div>
            <div className="field">
              <label>الرقم الوظيفي * (فريد)</label>
              <input
                required
                type="text"
                value={employee.employee_number}
                onChange={(event) =>
                  updateEmployeeField("employee_number", event.target.value)
                }
              />
            </div>
            <div className="field">
              <label>رقم الهوية الوطنية * (10 أرقام)</label>
              <input
                required
                type="text"
                pattern="\d{10}"
                maxLength={10}
                value={employee.national_id}
                onChange={(event) =>
                  updateEmployeeField(
                    "national_id",
                    event.target.value.replace(/[^\d]/g, "")
                  )
                }
              />
            </div>
            <div className="field">
              <label>المسمى الوظيفي *</label>
              <input
                required
                type="text"
                value={employee.job_title}
                onChange={(event) => updateEmployeeField("job_title", event.target.value)}
              />
            </div>
            <div className="field">
              <label>البريد الإلكتروني * (قبل @ فقط)</label>
              <input
                required
                type="text"
                inputMode="email"
                autoCapitalize="none"
                dir="ltr"
                pattern="^[A-Za-z0-9._-]+$"
                title="أدخل أحرفًا إنجليزية/أرقام فقط قبل @ (يسمح بـ . _ -)"
                placeholder="username (English only)"
                value={employee.email}
                onChange={(event) =>
                  updateEmployeeField("email", normalizeEmailLocalPart(event.target.value))
                }
              />
            </div>
            <div className="field">
              <label>رقم الجوال *</label>
              <input
                required
                type="text"
                value={employee.phone}
                onChange={(event) => updateEmployeeField("phone", event.target.value)}
              />
            </div>
            <div className="field">
              <label>المستشفى *</label>
              <select
                value={employee.hospital}
                onChange={(event) => updateEmployeeField("hospital", event.target.value)}
              >
                {HOSPITAL_OPTIONS.map((hospital) => (
                  <option value={hospital} key={hospital}>
                    {hospital}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="delegations-header">
            <h2>قسم الانتدابات</h2>
            <button type="button" onClick={addDelegationRow}>
              + إضافة انتداب
            </button>
          </div>

          {delegations.map((delegation, index) => (
            <div className="delegation-row" key={index}>
              {/* كل صف يمثل انتدابًا مستقلًا يمكن تعديله أو حذفه */}
              <div className="grid">
                <div className="field">
                  <label>تاريخ البداية *</label>
                  <input
                    required
                    type="date"
                    value={delegation.start_date}
                    onChange={(event) =>
                      updateDelegationField(index, "start_date", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label>تاريخ النهاية *</label>
                  <input
                    required
                    type="date"
                    value={delegation.end_date}
                    onChange={(event) =>
                      updateDelegationField(index, "end_date", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label>نوع الانتداب *</label>
                  <select
                    value={delegation.delegation_type}
                    onChange={(event) =>
                      updateDelegationField(
                        index,
                        "delegation_type",
                        event.target.value
                      )
                    }
                  >
                    {DELEGATION_TYPE_OPTIONS.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>الجهة (من) *</label>
                  <input
                    required
                    type="text"
                    value={delegation.from_entity}
                    onChange={(event) =>
                      updateDelegationField(index, "from_entity", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label>الجهة (إلى) *</label>
                  <input
                    required
                    type="text"
                    value={delegation.to_entity}
                    onChange={(event) =>
                      updateDelegationField(index, "to_entity", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="delegation-actions">
                <button type="button" className="danger" onClick={() => removeDelegationRow(index)}>
                  حذف الانتداب
                </button>
              </div>
            </div>
          ))}

          <div className="form-actions">
            <label className="commitment-check">
              <input
                type="checkbox"
                checked={commitmentAccepted}
                onChange={(event) => setCommitmentAccepted(event.target.checked)}
              />
              <span>
                أتعهد بأن كافة البيانات صحيحة ولم يتم إدخال الانتدابات في موارد سابقًا أو
                ترصيدها كإجازات.
              </span>
            </label>
            <button type="submit" disabled={loading || !canSave || !commitmentAccepted}>
              {loading ? "جاري الحفظ..." : "حفظ كل البيانات"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default App;
