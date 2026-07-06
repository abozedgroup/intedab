import "./App.css";

const EXPORT_PAGE_PATH = "/owner-export-2026";

function App() {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const isExportPage = currentPath === EXPORT_PAGE_PATH;

  if (isExportPage) {
    return (
      <main className="page closed-page">
        <section className="card closed-card">
          <h1>صفحة التصدير</h1>
          <p className="subtitle">هذه الصفحة مخصصة لصاحب النظام فقط.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page closed-page">
      <section className="card closed-card">
        <span className="status-badge">تنبيه</span>
        <h1>انتهت فترة التقديم</h1>
        <p className="subtitle">
          نعتذر، تم إغلاق استقبال الطلبات لهذا النموذج، ولن يكون بالإمكان إضافة أو تعديل البيانات في الوقت الحالي.
        </p>
      </section>
    </main>
  );
}

export default App;
