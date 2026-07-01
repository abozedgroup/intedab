# نظام جمع بيانات انتدابات الموظفين

تطبيق ويب داخلي باللغة العربية (RTL) لإدخال بيانات الموظفين وانتداباتهم، مع إمكانية العودة لاحقًا للتعديل والتصدير إلى Excel.

## التقنيات

- Backend: Node.js + Express
- Database: SQLite (ملف محلي داخل `backend/data.sqlite`)
- Frontend: React + Vite
- Excel Export: `exceljs`

## المتطلبات

- Node.js 18 أو أحدث
- npm

## طريقة التشغيل

1. تثبيت جميع الحزم:

```bash
npm run install:all
```

2. تشغيل الواجهة والخادم معًا:

```bash
npm run dev
```

3. فتح التطبيق:

- الواجهة: [http://localhost:5173](http://localhost:5173)
- الخادم: [http://localhost:4000](http://localhost:4000)

## النشر على Railway (للوصول العام)

التطبيق مهيأ للنشر كخدمة واحدة: `Express` يقدّم API وواجهة React معًا.

1. ارفع المشروع إلى GitHub.
2. في Railway:
   - New Project -> Deploy from GitHub Repo
   - اختر نفس المستودع
3. أضف متغيرات البيئة في الخدمة:
   - `EXPORT_PASSWORD` = كلمة مرور التصدير
   - `DB_PATH` = `/data/entedab.sqlite`
   - `NIXPACKS_NODE_VERSION` = `20.19.0`
4. أضف **Volume** داخل نفس الخدمة، واجعل مساره: `/data`
5. نفّذ Deploy.

بعد النشر:
- الرابط العام سيكون من Railway (مثل: `https://your-app.up.railway.app`)
- رابط تصدير صاحب النظام يكون:
  - `https://your-app.up.railway.app/owner-export-2026`

## الإعدادات

يمكنك إنشاء ملف `.env` داخل `backend` وتحديد:

```env
PORT=4000
EXPORT_PASSWORD=123456
DB_PATH=backend/data.sqlite
```

> إذا لم يتم تحديد `EXPORT_PASSWORD` فالقيمة الافتراضية هي `123456`.
> إذا لم يتم تحديد `DB_PATH` سيستخدم التطبيق `backend/data.sqlite`.

## المزايا المنفذة

- إدخال بيانات الموظف لمرة واحدة.
- إضافة عدد غير محدود من الانتدابات في نفس الجلسة.
- تحميل بيانات الموظف لاحقًا عبر الرقم الوظيفي والتعديل عليها.
- التحقق من:
  - رقم الهوية الوطنية (10 أرقام فقط).
  - صحة البريد الإلكتروني.
  - الحقول المطلوبة.
  - أن تاريخ النهاية أكبر أو يساوي تاريخ البداية.
- منع تكرار نفس الانتداب لنفس الموظف.
- تصدير البيانات إلى Excel (كل صف يمثل انتدابًا واحدًا) عبر رابط محمي بكلمة مرور.

## هيكل المشروع

```text
.
├── backend
│   ├── src
│   │   ├── db.js
│   │   ├── db-utils.js
│   │   ├── routes.js
│   │   ├── server.js
│   │   └── validation.js
│   └── data.sqlite
├── frontend
│   └── src
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       └── main.jsx
└── package.json
```
