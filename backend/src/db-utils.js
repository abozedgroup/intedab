const { db } = require("./db");

/**
 * تنفيذ أمر إدخال/تحديث/حذف مع إرجاع معلومات التنفيذ.
 * @param {string} sql
 * @param {unknown[]} params
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * جلب سجل واحد.
 * @param {string} sql
 * @param {unknown[]} params
 * @returns {Promise<any>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * جلب عدة سجلات.
 * @param {string} sql
 * @param {unknown[]} params
 * @returns {Promise<any[]>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  run,
  get,
  all,
};
