const form = document.querySelector("#attendanceForm");
const rows = document.querySelector("#attendanceRows");
const emptyState = document.querySelector("#emptyState");
const workDate = document.querySelector("#workDate");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const exportExcel = document.querySelector("#exportExcel");
const clearDay = document.querySelector("#clearDay");

const fields = {
  employeeName: document.querySelector("#employeeName"),
  department: document.querySelector("#department"),
  arrivalTime: document.querySelector("#arrivalTime"),
  status: document.querySelector("#status"),
  note: document.querySelector("#note"),
};

const counters = {
  total: document.querySelector("#totalCount"),
  present: document.querySelector("#presentCount"),
  late: document.querySelector("#lateCount"),
  absent: document.querySelector("#absentCount"),
};

const STORAGE_KEY = "corporate-university-attendance";
let records = loadRecords();

workDate.value = new Date().toISOString().slice(0, 10);
fields.arrivalTime.value = new Date().toTimeString().slice(0, 5);

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusClass(status) {
  if (status === "На работе") return "status-present";
  if (status === "Опоздал") return "status-late";
  if (status === "Отсутствует") return "status-absent";
  return "status-away";
}

function getDayRecords() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;

  return records
    .filter((record) => record.date === workDate.value)
    .filter((record) => filter === "Все" || record.status === filter)
    .filter((record) => {
      const searchable = (record.employeeName + " " + record.department).toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
}

function updateCounters() {
  const dayRecords = records.filter((record) => record.date === workDate.value);

  counters.total.textContent = dayRecords.length;
  counters.present.textContent = dayRecords.filter((record) => record.status === "На работе").length;
  counters.late.textContent = dayRecords.filter((record) => record.status === "Опоздал").length;
  counters.absent.textContent = dayRecords.filter((record) => record.status === "Отсутствует").length;
}

function render() {
  const visibleRecords = getDayRecords();

  rows.innerHTML = visibleRecords
    .map((record) =>
      '<tr>' +
        '<td>' + escapeHtml(record.employeeName) + '</td>' +
        '<td>' + escapeHtml(record.department) + '</td>' +
        '<td>' + escapeHtml(record.arrivalTime) + '</td>' +
        '<td><span class="status-pill ' + statusClass(record.status) + '">' + escapeHtml(record.status) + '</span></td>' +
        '<td>' + escapeHtml(record.note || "-") + '</td>' +
        '<td><button class="delete-button" type="button" data-id="' + record.id + '">Удалить</button></td>' +
      '</tr>'
    )
    .join("");

  emptyState.classList.toggle("visible", visibleRecords.length === 0);
  updateCounters();
}

function makeExcelCell(value) {
  return "<td>" + escapeHtml(value ?? "") + "</td>";
}

function downloadExcel() {
  const dayRecords = records.filter((record) => record.date === workDate.value);
  const header = ["Дата", "ФИО", "Подразделение", "Время прихода", "Статус", "Примечание"];
  const bodyRows = dayRecords
    .map((record) =>
      "<tr>" +
        [record.date, record.employeeName, record.department, record.arrivalTime, record.status, record.note]
          .map(makeExcelCell)
          .join("") +
      "</tr>",
    )
    .join("");

  const headerRow = header.map((item) => "<th>" + escapeHtml(item) + "</th>").join("");
  const workbook = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<meta charset=\"UTF-8\" />",
    "<style>",
    "table { border-collapse: collapse; font-family: Arial, sans-serif; }",
    "th, td { border: 1px solid #9aa6b2; padding: 8px; text-align: left; }",
    "th { background: #dff3ef; font-weight: 700; }",
    "</style>",
    "</head>",
    "<body>",
    "<table>",
    "<thead><tr>" + headerRow + "</tr></thead>",
    "<tbody>" + bodyRows + "</tbody>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");

  const blob = new Blob(["\uFEFF" + workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "явка-" + workDate.value + ".xls";
  link.click();
  URL.revokeObjectURL(link.href);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  records.push({
    id: crypto.randomUUID(),
    date: workDate.value,
    employeeName: fields.employeeName.value.trim(),
    department: fields.department.value.trim(),
    arrivalTime: fields.arrivalTime.value,
    status: fields.status.value,
    note: fields.note.value.trim(),
  });

  saveRecords();
  form.reset();
  fields.arrivalTime.value = new Date().toTimeString().slice(0, 5);
  fields.status.value = "На работе";
  fields.employeeName.focus();
  render();
});

rows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  records = records.filter((record) => record.id !== button.dataset.id);
  saveRecords();
  render();
});

clearDay.addEventListener("click", () => {
  const dayRecords = records.filter((record) => record.date === workDate.value);
  if (dayRecords.length === 0) return;
  if (!confirm("Удалить все записи за выбранную дату?")) return;

  records = records.filter((record) => record.date !== workDate.value);
  saveRecords();
  render();
});

workDate.addEventListener("change", render);
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
exportExcel.addEventListener("click", downloadExcel);

render();
