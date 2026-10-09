// StudentHub RMS — Student Registration & Result Management System
// MCA Full Stack Assignment | HTML5 + CSS3 + Vanilla JavaScript + LocalStorage

'use strict';

// ─── Curriculum & Course Constants ───
const SUBJECT_CONFIG = {
  sub1: { code: 'MCA-301', name: 'Advanced Data Structures & Algorithms', credits: 4, max: 100, minPass: 40 },
  sub2: { code: 'MCA-302', name: 'Database Management & NoSQL Systems', credits: 4, max: 100, minPass: 40 },
  sub3: { code: 'MCA-303', name: 'Web Technologies & Full Stack Dev', credits: 4, max: 100, minPass: 40 },
  sub4: { code: 'MCA-304', name: 'Software Engineering & Cloud Computing', credits: 4, max: 100, minPass: 40 },
  sub5: { code: 'MCA-305', name: 'Python Programming & Machine Learning', credits: 4, max: 100, minPass: 40 }
};

const STORAGE_KEY = 'studenthub_records_v1';

// ─── Academic Evaluation Engine (Pure Functions) ───

// Map a mark (0-100) to a grade letter, grade point, and label (10-point scale)
function calculateSubjectGrade(mark) {
  if (mark >= 90) return { grade: 'O', point: 10, description: 'Outstanding' };
  if (mark >= 80) return { grade: 'A+', point: 9, description: 'Excellent' };
  if (mark >= 70) return { grade: 'A', point: 8, description: 'Very Good' };
  if (mark >= 60) return { grade: 'B+', point: 7, description: 'Good' };
  if (mark >= 50) return { grade: 'B', point: 6, description: 'Above Average' };
  if (mark >= 40) return { grade: 'C', point: 5, description: 'Pass' };
  return { grade: 'F', point: 0, description: 'Fail' };
}

// Evaluate a student's marks — calculates total, percentage, grade, SGPA, pass/fail
// A student must score >= 40 in every subject AND have >= 40% aggregate to pass
function evaluateStudentMarks(marks) {
  const subjectKeys = Object.keys(SUBJECT_CONFIG);
  let totalMarks = 0;
  let totalCredits = 0;
  let weightedPoints = 0;
  let hasFailedSubject = false;
  const subjectBreakdown = {};

  subjectKeys.forEach(subKey => {
    const rawVal = marks[subKey];
    const score = Number.isFinite(rawVal) ? Math.min(100, Math.max(0, rawVal)) : 0;
    const config = SUBJECT_CONFIG[subKey];
    const gradeObj = calculateSubjectGrade(score);

    totalMarks += score;
    totalCredits += config.credits;
    weightedPoints += gradeObj.point * config.credits;

    const isPassed = score >= config.minPass;
    if (!isPassed) {
      hasFailedSubject = true;
    }

    subjectBreakdown[subKey] = {
      ...config,
      score: score,
      grade: gradeObj.grade,
      point: gradeObj.point,
      description: gradeObj.description,
      isPassed: isPassed
    };
  });

  const maxTotal = subjectKeys.length * 100;
  const percentage = parseFloat(((totalMarks / maxTotal) * 100).toFixed(2));
  const isPassedOverall = !hasFailedSubject && percentage >= 40.0;
  const sgpa = parseFloat((weightedPoints / totalCredits).toFixed(2));

  let overallGrade = 'F';
  let division = 'Fail';

  if (isPassedOverall) {
    if (percentage >= 90) overallGrade = 'O';
    else if (percentage >= 80) overallGrade = 'A+';
    else if (percentage >= 70) overallGrade = 'A';
    else if (percentage >= 60) overallGrade = 'B+';
    else if (percentage >= 50) overallGrade = 'B';
    else overallGrade = 'C';

    if (percentage >= 75) {
      division = 'First Class with Distinction';
    } else if (percentage >= 60) {
      division = 'First Class';
    } else if (percentage >= 50) {
      division = 'Second Class';
    } else {
      division = 'Pass Class';
    }
  }

  return {
    totalMarks,
    maxTotal,
    percentage,
    result: isPassedOverall ? 'Pass' : 'Fail',
    overallGrade,
    sgpa,
    division,
    subjectBreakdown
  };
}

// ─── LocalStorage & JSON Persistence Manager ───
const StorageManager = {
  // Get all student records from localStorage
  getAll() {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return [];
      const parsed = JSON.parse(dataStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('LocalStorage Read Error:', err);
      showToast('Error reading records from LocalStorage.', 'error');
      return [];
    }
  },

  // Save the full list to localStorage using JSON.stringify
  saveAll(studentsList) {
    try {
      const serialized = JSON.stringify(studentsList, null, 2);
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (err) {
      console.error('LocalStorage Save Error:', err);
      showToast('Failed to save to LocalStorage (Storage quota exceeded).', 'error');
      return false;
    }
  },

  // Add a new record or update an existing one (matched by ID)
  saveStudent(student) {
    const records = this.getAll();
    const existingIndex = records.findIndex(s => s.id === student.id);

    if (existingIndex >= 0) {
      student.updatedAt = new Date().toISOString();
      records[existingIndex] = student;
    } else {
      student.createdAt = new Date().toISOString();
      student.updatedAt = student.createdAt;
      records.unshift(student); // newest first
    }

    this.saveAll(records);
  },

  // Delete a single record by ID
  deleteStudent(id) {
    const records = this.getAll().filter(s => s.id !== id);
    this.saveAll(records);
  },

  // Wipe everything from localStorage
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// ─── UI Controller & DOM Elements Cache ───
const DOM = {
  // Navigation Tabs
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  recordCountBadge: document.getElementById('record-count-badge'),

  // KPI Header Counters
  kpiTotalStudents: document.getElementById('kpi-total-students'),
  kpiPassRate: document.getElementById('kpi-pass-rate'),
  kpiPassedCount: document.getElementById('kpi-passed-count'),
  kpiFailedCount: document.getElementById('kpi-failed-count'),
  kpiClassAvg: document.getElementById('kpi-class-avg'),
  kpiTopScore: document.getElementById('kpi-top-score'),
  kpiTopperName: document.getElementById('kpi-topper-name'),

  // Registration Form
  studentForm: document.getElementById('student-form'),
  editStudentId: document.getElementById('edit-student-id'),
  formHeadingTitle: document.getElementById('form-heading-title'),
  submitBtn: document.getElementById('submit-btn'),
  submitBtnText: document.getElementById('submit-btn-text'),
  resetFormBtn: document.getElementById('reset-form-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),

  // Input Fields
  nameInput: document.getElementById('student-name'),
  rollInput: document.getElementById('student-roll'),
  emailInput: document.getElementById('student-email'),
  phoneInput: document.getElementById('student-phone'),
  branchInput: document.getElementById('student-branch'),
  semesterInput: document.getElementById('student-semester'),
  genderInput: document.getElementById('student-gender'),

  // Error Messages
  nameError: document.getElementById('name-error'),
  rollError: document.getElementById('roll-error'),
  emailError: document.getElementById('email-error'),
  phoneError: document.getElementById('phone-error'),
  branchError: document.getElementById('branch-error'),
  marksGeneralError: document.getElementById('marks-general-error'),

  // Subject Inputs & Status Tags
  subInputs: {
    sub1: document.getElementById('sub1-marks'),
    sub2: document.getElementById('sub2-marks'),
    sub3: document.getElementById('sub3-marks'),
    sub4: document.getElementById('sub4-marks'),
    sub5: document.getElementById('sub5-marks')
  },
  subStatusTags: {
    sub1: document.getElementById('sub1-status'),
    sub2: document.getElementById('sub2-status'),
    sub3: document.getElementById('sub3-status'),
    sub4: document.getElementById('sub4-status'),
    sub5: document.getElementById('sub5-status')
  },

  // Live Preview Elements
  liveResultStamp: document.getElementById('live-result-stamp'),
  liveStatusText: document.getElementById('live-status-text'),
  liveStatusSub: document.getElementById('live-status-sub'),
  liveTotalMarks: document.getElementById('live-total-marks'),
  liveTotalBar: document.getElementById('live-total-bar'),
  livePercentage: document.getElementById('live-percentage'),
  livePercentBar: document.getElementById('live-percent-bar'),
  liveGrade: document.getElementById('live-grade'),
  liveDivision: document.getElementById('live-division'),
  liveSgpaEst: document.getElementById('live-sgpa-est'),

  // Records Table & Filter Controls
  studentsTable: document.getElementById('students-table'),
  studentsTableBody: document.getElementById('students-table-body'),
  emptyTableState: document.getElementById('empty-table-state'),
  tableShowingText: document.getElementById('table-showing-text'),
  filterSearch: document.getElementById('filter-search'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  filterStatus: document.getElementById('filter-status'),
  filterBranch: document.getElementById('filter-branch'),
  sortBy: document.getElementById('sort-by'),
  exportJsonBtn: document.getElementById('export-json-btn'),
  importJsonInput: document.getElementById('import-json-input'),
  clearAllBtn: document.getElementById('clear-all-btn'),

  // Analytics Tab
  analyticsGradeBars: document.getElementById('analytics-grade-bars'),
  analyticsBranchList: document.getElementById('analytics-branch-list'),
  analyticsSubjectGrid: document.getElementById('analytics-subject-grid'),

  // Marksheet Modal
  marksheetModal: document.getElementById('marksheet-modal'),
  closeMarksheetBtn: document.getElementById('close-marksheet-btn'),
  printMarksheetBtn: document.getElementById('print-marksheet-btn'),
  msStudentName: document.getElementById('ms-student-name'),
  msStudentRoll: document.getElementById('ms-student-roll'),
  msStudentEmail: document.getElementById('ms-student-email'),
  msStudentBranch: document.getElementById('ms-student-branch'),
  msStudentSem: document.getElementById('ms-student-sem'),
  msIssuedDate: document.getElementById('ms-issued-date'),
  msTableBody: document.getElementById('ms-table-body'),
  msTotalMarks: document.getElementById('ms-total-marks'),
  msFinalGrade: document.getElementById('ms-final-grade'),
  msPercentage: document.getElementById('ms-percentage'),
  msSgpa: document.getElementById('ms-sgpa'),
  msDivision: document.getElementById('ms-division'),
  msResultStamp: document.getElementById('ms-result-stamp'),

  // Delete Modal
  deleteModal: document.getElementById('delete-modal'),
  deleteModalMessage: document.getElementById('delete-modal-message'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

// Application State
let currentPendingDeleteId = null;
let isBulkClear = false;

// ─── Toast Notification Helper ───
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Form Validation Logic ───
const Validators = {
  isValidName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 3 && /^[a-zA-Z\s.'-]+$/.test(trimmed);
  },

  isValidRoll(roll) {
    const trimmed = roll.trim();
    return /^[a-zA-Z0-9\-_/]{3,20}$/.test(trimmed);
  },

  isValidEmail(email) {
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  },

  isValidPhone(phone) {
    const trimmed = phone.trim();
    // 10-digit mobile number check
    return /^[6-9]\d{9}$/.test(trimmed);
  },

  isValidMark(val) {
    if (val === '' || val === null || val === undefined) return false;
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 && num <= 100;
  }
};

// Validate all form fields — returns { isValid, data } where data is the student object
function validateStudentForm() {
  let isValid = true;
  const currentEditId = DOM.editStudentId.value.trim();
  const existingStudents = StorageManager.getAll();

  // 1. Name validation
  const nameVal = DOM.nameInput.value;
  if (!Validators.isValidName(nameVal)) {
    DOM.nameError.textContent = 'Enter a valid name (at least 3 alphabetic characters).';
    DOM.nameInput.classList.add('is-invalid');
    isValid = false;
  } else {
    DOM.nameError.textContent = '';
    DOM.nameInput.classList.remove('is-invalid');
  }

  // 2. Roll / PRN validation (Check format and uniqueness)
  const rollVal = DOM.rollInput.value.trim().toUpperCase();
  if (!Validators.isValidRoll(rollVal)) {
    DOM.rollError.textContent = 'Valid PRN/Roll required (3-20 letters/digits, hyphens allowed).';
    DOM.rollInput.classList.add('is-invalid');
    isValid = false;
  } else {
    const duplicate = existingStudents.find(
      s => s.roll.toUpperCase() === rollVal && s.id !== currentEditId
    );
    if (duplicate) {
      DOM.rollError.textContent = `PRN "${rollVal}" is already registered to ${duplicate.name}.`;
      DOM.rollInput.classList.add('is-invalid');
      isValid = false;
    } else {
      DOM.rollError.textContent = '';
      DOM.rollInput.classList.remove('is-invalid');
    }
  }

  // 3. Email validation
  const emailVal = DOM.emailInput.value.trim().toLowerCase();
  if (!Validators.isValidEmail(emailVal)) {
    DOM.emailError.textContent = 'Enter a valid email address (e.g., student@domain.com).';
    DOM.emailInput.classList.add('is-invalid');
    isValid = false;
  } else {
    DOM.emailError.textContent = '';
    DOM.emailInput.classList.remove('is-invalid');
  }

  // 4. Phone validation
  const phoneVal = DOM.phoneInput.value.trim();
  if (!Validators.isValidPhone(phoneVal)) {
    DOM.phoneError.textContent = 'Enter a valid 10-digit mobile number starting with 6-9.';
    DOM.phoneInput.classList.add('is-invalid');
    isValid = false;
  } else {
    DOM.phoneError.textContent = '';
    DOM.phoneInput.classList.remove('is-invalid');
  }

  // 5. Subject Marks validation
  const marks = {};
  let marksValid = true;

  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    const inputEl = DOM.subInputs[subKey];
    const val = inputEl.value.trim();
    if (!Validators.isValidMark(val)) {
      inputEl.style.borderColor = 'var(--color-fail)';
      marksValid = false;
    } else {
      inputEl.style.borderColor = '';
      marks[subKey] = parseFloat(val);
    }
  });

  if (!marksValid) {
    DOM.marksGeneralError.textContent = 'All subject marks must be provided as numbers between 0 and 100.';
    isValid = false;
  } else {
    DOM.marksGeneralError.textContent = '';
  }

  if (!isValid) {
    return { isValid: false, data: null };
  }

  return {
    isValid: true,
    data: {
      id: currentEditId || `stud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: nameVal.trim(),
      roll: rollVal,
      email: emailVal,
      phone: phoneVal,
      branch: DOM.branchInput.value,
      semester: DOM.semesterInput.value,
      gender: DOM.genderInput.value,
      marks: marks
    }
  };
}

// ─── Live Calculation & Preview Synchronization ───
function updateLivePreview() {
  const marks = {};
  let hasValidInputs = false;
  let allSubjectsFilled = true;

  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    const inputEl = DOM.subInputs[subKey];
    const statusTag = DOM.subStatusTags[subKey];
    const cardEl = inputEl.closest('.mark-input-card');
    const fillTrack = document.getElementById(`${subKey}-fill`);
    const val = inputEl.value.trim();

    if (val !== '' && Validators.isValidMark(val)) {
      const num = parseFloat(val);
      marks[subKey] = num;
      hasValidInputs = true;

      // Animate fill bar based on score
      if (fillTrack) fillTrack.style.width = `${num}%`;

      // Update per-subject status badge
      if (num >= 40) {
        statusTag.textContent = `${num} — Pass`;
        statusTag.className = 'mark-status-tag pass';
        if (cardEl) { cardEl.classList.add('pass'); cardEl.classList.remove('fail'); }
      } else {
        statusTag.textContent = `${num} — Fail`;
        statusTag.className = 'mark-status-tag fail';
        if (cardEl) { cardEl.classList.add('fail'); cardEl.classList.remove('pass'); }
      }
    } else {
      marks[subKey] = 0;
      allSubjectsFilled = false;
      statusTag.textContent = 'Pending';
      statusTag.className = 'mark-status-tag';
      if (fillTrack) fillTrack.style.width = '0%';
      if (cardEl) { cardEl.classList.remove('pass', 'fail'); }
    }
  });

  if (!hasValidInputs) {
    // Reset Live Preview Meters to Default Awaiting State
    DOM.liveResultStamp.className = 'result-badge-display';
    DOM.liveStatusText.textContent = 'Awaiting Marks';
    DOM.liveStatusSub.textContent = 'Enter all 5 subject marks (≥40 to Pass)';
    DOM.liveTotalMarks.textContent = '--';
    DOM.liveTotalBar.style.width = '0%';
    DOM.livePercentage.textContent = '--%';
    DOM.livePercentBar.style.width = '0%';
    DOM.liveGrade.textContent = '--';
    DOM.liveDivision.textContent = '--';
    DOM.liveSgpaEst.textContent = 'SGPA: --';
    return;
  }

  // Calculate Evaluation
  const evalResult = evaluateStudentMarks(marks);

  // Update Dynamic Result Stamp
  if (allSubjectsFilled) {
    if (evalResult.result === 'Pass') {
      DOM.liveResultStamp.className = 'result-badge-display pass';
      DOM.liveStatusText.textContent = `PASSED (${evalResult.overallGrade})`;
      DOM.liveStatusSub.textContent = `${evalResult.division} • SGPA ${evalResult.sgpa}`;
    } else {
      DOM.liveResultStamp.className = 'result-badge-display fail';
      DOM.liveStatusText.textContent = 'RESULT: FAILED';
      DOM.liveStatusSub.textContent = 'Arrear in one or more courses (< 40 marks)';
    }
  } else {
    DOM.liveResultStamp.className = 'result-badge-display';
    DOM.liveStatusText.textContent = 'Evaluating...';
    DOM.liveStatusSub.textContent = 'Fill remaining subject marks for final status';
  }

  // Update Meters
  DOM.liveTotalMarks.textContent = evalResult.totalMarks;
  const totalPercent = Math.min(100, (evalResult.totalMarks / 500) * 100);
  DOM.liveTotalBar.style.width = `${totalPercent}%`;

  DOM.livePercentage.textContent = `${evalResult.percentage}%`;
  DOM.livePercentBar.style.width = `${Math.min(100, evalResult.percentage)}%`;

  DOM.liveGrade.textContent = allSubjectsFilled ? evalResult.overallGrade : '--';
  DOM.liveDivision.textContent = allSubjectsFilled ? evalResult.division : 'In Progress';
  DOM.liveSgpaEst.textContent = `SGPA: ${evalResult.sgpa}`;
}

// ─── Records Table Rendering & Multi-Filter / Sort Engine ───
function renderRecordsTable() {
  const students = StorageManager.getAll();
  const totalCount = students.length;

  // Update records count badge in navbar tab
  DOM.recordCountBadge.textContent = totalCount;

  // Read current filters
  const searchTerm = DOM.filterSearch.value.trim().toLowerCase();
  const statusFilter = DOM.filterStatus.value;
  const branchFilter = DOM.filterBranch.value;
  const sortMode = DOM.sortBy.value;

  // Filter pipeline
  let filtered = students.filter(student => {
    // Search match
    if (searchTerm) {
      const matchName = (student.name || '').toLowerCase().includes(searchTerm);
      const matchRoll = (student.roll || '').toLowerCase().includes(searchTerm);
      const matchEmail = (student.email || '').toLowerCase().includes(searchTerm);
      if (!matchName && !matchRoll && !matchEmail) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && student.result !== statusFilter) {
      return false;
    }

    // Branch filter
    if (branchFilter !== 'all' && student.branch !== branchFilter) {
      return false;
    }

    return true;
  });

  // Sort pipeline
  filtered.sort((a, b) => {
    switch (sortMode) {
      case 'percentage-desc':
        return b.percentage - a.percentage;
      case 'percentage-asc':
        return a.percentage - b.percentage;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'roll-asc':
        return a.roll.localeCompare(b.roll);
      case 'created-desc':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  // Empty state handling
  if (filtered.length === 0) {
    DOM.studentsTable.style.display = totalCount === 0 ? 'none' : 'table';
    DOM.emptyTableState.style.display = 'flex';

    if (totalCount === 0) {
      document.getElementById('empty-state-title').textContent = 'No Student Records Found';
      document.getElementById('empty-state-desc').textContent = 'Register candidate details and subject marks in the Registration tab to generate and manage results.';
    } else {
      document.getElementById('empty-state-title').textContent = 'No Matching Records';
      document.getElementById('empty-state-desc').textContent = 'Try adjusting your search query or filter options.';
    }
    DOM.studentsTableBody.innerHTML = '';
  } else {
    DOM.studentsTable.style.display = 'table';
    DOM.emptyTableState.style.display = 'none';
    DOM.studentsTableBody.innerHTML = '';

    filtered.forEach(student => {
      const row = document.createElement('tr');
      const isPass = student.result === 'Pass';

      row.innerHTML = `
        <td><span class="student-roll-text">${escapeHtml(student.roll)}</span></td>
        <td>
          <div class="student-meta-cell">
            <span class="student-name-text">${escapeHtml(student.name)}</span>
            <span class="student-email-text">${escapeHtml(student.email)}</span>
          </div>
        </td>
        <td>
          <div class="student-meta-cell">
            <span class="student-name-text" style="font-size:0.8rem">${escapeHtml(student.branch)}</span>
            <span class="branch-sem-badge">${escapeHtml(student.semester)}</span>
          </div>
        </td>
        <td><strong>${student.totalMarks}</strong> <span class="text-muted">/ 500</span></td>
        <td>
          <span class="mono" style="font-weight:700; color: ${isPass ? 'var(--color-pass)' : 'var(--color-fail)'}">
            ${student.percentage}%
          </span>
        </td>
        <td>
          <span class="badge ${isPass ? 'badge-accent' : 'badge-fail'}">
            Grade ${student.overallGrade} • ${student.sgpa} SGPA
          </span>
        </td>
        <td>
          <span class="badge ${isPass ? 'badge-pass' : 'badge-fail'}">
            ${student.result}
          </span>
        </td>
        <td class="text-right">
          <div class="actions-cell">
            <button class="btn-icon" title="View & Print Official Marksheet" onclick="openMarksheetModal('${student.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="btn-icon" title="Edit Student Record" onclick="editStudentRecord('${student.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon danger" title="Delete Record" onclick="confirmDeleteRecord('${student.id}', '${escapeHtml(student.name)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      DOM.studentsTableBody.appendChild(row);
    });
  }

  // Update footer text
  DOM.tableShowingText.textContent = `Showing ${filtered.length} of ${totalCount} student records`;
}

// ─── KPI Dashboard & Analytics Insights Computation ───
function updateDashboardKPIs() {
  const students = StorageManager.getAll();
  const total = students.length;

  DOM.kpiTotalStudents.textContent = total;

  if (total === 0) {
    DOM.kpiPassRate.textContent = '0.0%';
    DOM.kpiPassedCount.textContent = '0';
    DOM.kpiFailedCount.textContent = '0';
    DOM.kpiClassAvg.textContent = '0.0%';
    DOM.kpiTopScore.textContent = 'N/A';
    DOM.kpiTopperName.textContent = 'No records yet';
    renderAnalytics(students);
    return;
  }

  let passedCount = 0;
  let aggregateMarks = 0;
  let highestStudent = null;

  students.forEach(student => {
    if (student.result === 'Pass') passedCount++;
    aggregateMarks += student.totalMarks || 0;

    if (!highestStudent || (student.totalMarks || 0) > (highestStudent.totalMarks || 0)) {
      highestStudent = student;
    }
  });

  const passRate = ((passedCount / total) * 100).toFixed(1);
  const classAvgPercent = (((aggregateMarks / (total * 500))) * 100).toFixed(1);

  DOM.kpiPassRate.textContent = `${passRate}%`;
  DOM.kpiPassedCount.textContent = passedCount;
  DOM.kpiFailedCount.textContent = total - passedCount;
  DOM.kpiClassAvg.textContent = `${classAvgPercent}%`;

  if (highestStudent) {
    DOM.kpiTopScore.textContent = `${highestStudent.percentage}%`;
    DOM.kpiTopperName.textContent = `${highestStudent.name} (${highestStudent.roll})`;
  } else {
    DOM.kpiTopScore.textContent = 'N/A';
    DOM.kpiTopperName.textContent = 'None';
  }

  // Update Analytics Tab visualizations
  renderAnalytics(students);
}

function renderAnalytics(students) {
  const total = students.length;

  // 1. Grade Distribution
  const gradeBands = [
    { grade: 'O (90-100%)', count: 0, color: '#10b981' },
    { grade: 'A+ (80-89%)', count: 0, color: '#f97316' },
    { grade: 'A (70-79%)', count: 0, color: '#ea580c' },
    { grade: 'B+ (60-69%)', count: 0, color: '#fb923c' },
    { grade: 'B (50-59%)', count: 0, color: '#d97706' },
    { grade: 'C (40-49%)', count: 0, color: '#b45309' },
    { grade: 'F (<40%)', count: 0, color: '#ef4444' }
  ];

  students.forEach(s => {
    const g = s.overallGrade;
    if (g === 'O') gradeBands[0].count++;
    else if (g === 'A+') gradeBands[1].count++;
    else if (g === 'A') gradeBands[2].count++;
    else if (g === 'B+') gradeBands[3].count++;
    else if (g === 'B') gradeBands[4].count++;
    else if (g === 'C') gradeBands[5].count++;
    else gradeBands[6].count++;
  });

  DOM.analyticsGradeBars.innerHTML = '';
  gradeBands.forEach(band => {
    const pct = total > 0 ? ((band.count / total) * 100).toFixed(0) : 0;
    const row = document.createElement('div');
    row.className = 'grade-bar-row';
    row.innerHTML = `
      <span class="grade-bar-label">${band.grade}</span>
      <div class="grade-bar-track">
        <div class="grade-bar-fill" style="width: ${pct}%; background: ${band.color};"></div>
      </div>
      <span class="grade-bar-count">${band.count} (${pct}%)</span>
    `;
    DOM.analyticsGradeBars.appendChild(row);
  });

  // 2. Programme Breakdown
  const branches = {};
  students.forEach(s => {
    const b = s.branch;
    if (!branches[b]) {
      branches[b] = { count: 0, passed: 0, totalPct: 0 };
    }
    branches[b].count++;
    if (s.result === 'Pass') branches[b].passed++;
    branches[b].totalPct += s.percentage;
  });

  DOM.analyticsBranchList.innerHTML = '';
  const branchKeys = Object.keys(branches);
  if (branchKeys.length === 0) {
    DOM.analyticsBranchList.innerHTML = '<p class="text-muted" style="font-size:0.85rem">No records available for programme analysis. Register students to view analytics.</p>';
  } else {
    branchKeys.forEach(branch => {
      const data = branches[branch];
      const meanPct = (data.totalPct / data.count).toFixed(1);
      const passRate = ((data.passed / data.count) * 100).toFixed(0);

      const item = document.createElement('div');
      item.className = 'branch-stat-item';
      item.innerHTML = `
        <div>
          <div class="branch-stat-title">${escapeHtml(branch)}</div>
          <div class="branch-stat-sub">${data.count} Registered Candidates</div>
        </div>
        <div class="branch-stat-metrics">
          <div class="branch-metric-box">
            <span class="branch-metric-val" style="color:var(--color-pass)">${passRate}%</span>
            <span class="branch-metric-lbl">Pass Rate</span>
          </div>
          <div class="branch-metric-box">
            <span class="branch-metric-val text-orange">${meanPct}%</span>
            <span class="branch-metric-lbl">Mean Score</span>
          </div>
        </div>
      `;
      DOM.analyticsBranchList.appendChild(item);
    });
  }

  // 3. Subject-wise Class Averages
  DOM.analyticsSubjectGrid.innerHTML = '';
  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    const config = SUBJECT_CONFIG[subKey];
    let subSum = 0;
    let subPassCount = 0;

    students.forEach(s => {
      const score = (s.marks && Number.isFinite(s.marks[subKey])) ? s.marks[subKey] : 0;
      subSum += score;
      if (score >= config.minPass) subPassCount++;
    });

    const avgScore = total > 0 ? (subSum / total).toFixed(1) : 0;
    const passPct = total > 0 ? ((subPassCount / total) * 100).toFixed(0) : 0;

    const card = document.createElement('div');
    card.className = 'subject-stat-card';
    card.innerHTML = `
      <span class="sub-stat-code">${config.code}</span>
      <div class="sub-stat-name">${config.name}</div>
      <div class="sub-stat-avg">${avgScore} <span style="font-size:0.75rem; color:var(--text-muted)">/ 100</span></div>
      <div class="sub-stat-status">${total > 0 ? `${passPct}% Passed Course` : 'No data yet'}</div>
    `;
    DOM.analyticsSubjectGrid.appendChild(card);
  });
}

// ─── Marksheet Certificate Modal Logic ───
function openMarksheetModal(studentId) {
  const students = StorageManager.getAll();
  const student = students.find(s => s.id === studentId);
  if (!student) {
    showToast('Student record not found.', 'error');
    return;
  }

  // Ensure evaluation object is fresh
  const evalResult = evaluateStudentMarks(student.marks);

  // Populate Meta Info
  DOM.msStudentName.textContent = student.name;
  DOM.msStudentRoll.textContent = student.roll;
  DOM.msStudentEmail.textContent = student.email;
  DOM.msStudentBranch.textContent = student.branch;
  DOM.msStudentSem.textContent = student.semester;
  DOM.msIssuedDate.textContent = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Populate Subject Breakdown Table
  DOM.msTableBody.innerHTML = '';
  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    const details = evalResult.subjectBreakdown[subKey];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono"><strong>${details.code}</strong></td>
      <td>${details.name}</td>
      <td class="text-center">${details.max}</td>
      <td class="text-center">${details.minPass}</td>
      <td class="text-center text-bold" style="color: ${details.isPassed ? 'inherit' : 'var(--color-fail)'}">
        ${details.score}
      </td>
      <td class="text-center mono text-bold">${details.grade}</td>
    `;
    DOM.msTableBody.appendChild(tr);
  });

  // Populate Summary
  DOM.msTotalMarks.textContent = evalResult.totalMarks;
  DOM.msFinalGrade.textContent = evalResult.overallGrade;
  DOM.msPercentage.textContent = `${evalResult.percentage}%`;
  DOM.msSgpa.textContent = evalResult.sgpa;
  DOM.msDivision.textContent = evalResult.division;

  if (evalResult.result === 'Pass') {
    DOM.msResultStamp.textContent = 'PASSED';
    DOM.msResultStamp.className = 'ms-status-stamp pass';
  } else {
    DOM.msResultStamp.textContent = 'FAILED';
    DOM.msResultStamp.className = 'ms-status-stamp fail';
  }

  // Display Modal
  DOM.marksheetModal.classList.add('active');
  DOM.marksheetModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeMarksheetModal() {
  DOM.marksheetModal.classList.remove('active');
  DOM.marksheetModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ─── Edit & Delete Record Handlers ───
function editStudentRecord(studentId) {
  const students = StorageManager.getAll();
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  // Switch to Registration Tab
  switchTab('registration-tab');

  // Populate Form Fields
  DOM.editStudentId.value = student.id;
  DOM.formHeadingTitle.textContent = `Edit Record: ${student.name}`;
  DOM.submitBtnText.textContent = 'Update Student Record';
  DOM.cancelEditBtn.style.display = 'inline-flex';

  DOM.nameInput.value = student.name;
  DOM.rollInput.value = student.roll;
  DOM.emailInput.value = student.email;
  DOM.phoneInput.value = student.phone || '';
  DOM.branchInput.value = student.branch;
  DOM.semesterInput.value = student.semester;
  DOM.genderInput.value = student.gender || 'Male';

  // Populate Marks
  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    DOM.subInputs[subKey].value = student.marks[subKey] !== undefined ? student.marks[subKey] : '';
  });

  // Trigger Live Preview Update
  updateLivePreview();

  // Scroll to form smoothly
  DOM.studentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast(`Editing records for ${student.name}`, 'info');
}

function cancelEditMode() {
  DOM.editStudentId.value = '';
  DOM.formHeadingTitle.textContent = 'Student Registration & Marks Entry';
  DOM.submitBtnText.textContent = 'Compute & Save Student Record';
  DOM.cancelEditBtn.style.display = 'none';
  DOM.studentForm.reset();
  clearValidationErrors();
  updateLivePreview();
}

function clearValidationErrors() {
  DOM.nameError.textContent = '';
  DOM.nameInput.classList.remove('is-invalid');
  DOM.rollError.textContent = '';
  DOM.rollInput.classList.remove('is-invalid');
  DOM.emailError.textContent = '';
  DOM.emailInput.classList.remove('is-invalid');
  DOM.phoneError.textContent = '';
  DOM.phoneInput.classList.remove('is-invalid');
  DOM.marksGeneralError.textContent = '';

  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    DOM.subInputs[subKey].style.borderColor = '';
  });
}

function confirmDeleteRecord(studentId, studentName) {
  currentPendingDeleteId = studentId;
  isBulkClear = false;
  DOM.deleteModalMessage.textContent = `Are you sure you want to permanently delete the academic evaluation record for "${studentName}"?`;
  DOM.deleteModal.classList.add('active');
  DOM.deleteModal.setAttribute('aria-hidden', 'false');
}

function confirmClearAllRecords() {
  const students = StorageManager.getAll();
  if (students.length === 0) {
    showToast('Storage is already empty.', 'info');
    return;
  }
  isBulkClear = true;
  DOM.deleteModalMessage.textContent = `Are you sure you want to permanently erase all ${students.length} student records from LocalStorage?`;
  DOM.deleteModal.classList.add('active');
  DOM.deleteModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  DOM.deleteModal.classList.remove('active');
  DOM.deleteModal.setAttribute('aria-hidden', 'true');
  currentPendingDeleteId = null;
  isBulkClear = false;
}

// ─── Tab Navigation Controller ───
function switchTab(targetTabId) {
  DOM.navTabs.forEach(tab => {
    const isTarget = tab.getAttribute('data-tab') === targetTabId;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  DOM.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === targetTabId);
  });

  // If navigating to Records or Analytics, ensure latest data is refreshed
  if (targetTabId === 'records-tab') {
    renderRecordsTable();
  } else if (targetTabId === 'analytics-tab') {
    updateDashboardKPIs();
  }
}

// ─── JSON Export & Import Logic ───
function exportRecordsAsJSON() {
  const students = StorageManager.getAll();
  if (students.length === 0) {
    showToast('No records available to export.', 'warning');
    return;
  }

  const jsonStr = JSON.stringify(students, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `StudentHub_Results_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Successfully exported ${students.length} student records as JSON.`, 'success');
}

function importRecordsFromJSON(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        throw new Error('Imported JSON must contain an array of student records.');
      }

      // Validate each student structure and recalculate
      const validRecords = [];
      imported.forEach(item => {
        if (item.name && item.roll && item.marks) {
          const evalResult = evaluateStudentMarks(item.marks);
          validRecords.push({
            id: item.id || `stud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: String(item.name).trim(),
            roll: String(item.roll).trim().toUpperCase(),
            email: String(item.email || 'student@univ.edu').trim(),
            phone: String(item.phone || '9876543210').trim(),
            branch: item.branch || 'Master of Computer Applications (MCA)',
            semester: item.semester || 'Semester III',
            gender: item.gender || 'Male',
            marks: item.marks,
            ...evalResult,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });

      if (validRecords.length === 0) {
        showToast('No valid student records found in JSON file.', 'error');
        return;
      }

      // Merge with existing records by Roll No
      const existing = StorageManager.getAll();
      const existingMap = new Map();
      existing.forEach(s => existingMap.set(s.roll.toUpperCase(), s));

      validRecords.forEach(s => existingMap.set(s.roll.toUpperCase(), s));
      const mergedList = Array.from(existingMap.values());

      StorageManager.saveAll(mergedList);
      updateDashboardKPIs();
      renderRecordsTable();
      showToast(`Imported ${validRecords.length} student records successfully!`, 'success');
    } catch (err) {
      console.error('Import parse error:', err);
      showToast('Invalid JSON file format: ' + err.message, 'error');
    } finally {
      // Clear input so same file can be selected again
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

// ─── Event Listeners Registration ───
function setupEventListeners() {
  // Navigation Tabs
  DOM.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Form Submit (Compute & Save)
  DOM.studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const validation = validateStudentForm();

    if (!validation.isValid) {
      showToast('Please fix the highlighted validation errors.', 'error');
      return;
    }

    const studentData = validation.data;
    // Calculate final metrics
    const evalResult = evaluateStudentMarks(studentData.marks);
    const completeStudentRecord = {
      ...studentData,
      ...evalResult
    };

    const isEdit = Boolean(DOM.editStudentId.value);
    StorageManager.saveStudent(completeStudentRecord);

    // Update UI
    updateDashboardKPIs();
    renderRecordsTable();

    // Success feedback
    const toastMsg = isEdit
      ? `Updated results for ${completeStudentRecord.name} (PRN: ${completeStudentRecord.roll})`
      : `Saved registration & result for ${completeStudentRecord.name} (${completeStudentRecord.result})`;
    showToast(toastMsg, 'success');

    // Reset Form & Switch to Records Table
    cancelEditMode();
    switchTab('records-tab');
  });

  // Form Reset Button
  DOM.resetFormBtn.addEventListener('click', () => {
    cancelEditMode();
    showToast('Form has been reset.', 'info');
  });

  // Cancel Edit Button
  DOM.cancelEditBtn.addEventListener('click', cancelEditMode);

  // Real-time Input Listeners for live evaluation & validation clear
  [DOM.nameInput, DOM.rollInput, DOM.emailInput, DOM.phoneInput, DOM.branchInput, DOM.semesterInput].forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      updateLivePreview();
    });
  });

  // Subject Marks Real-time Calculation
  Object.keys(SUBJECT_CONFIG).forEach(subKey => {
    const inputEl = DOM.subInputs[subKey];
    inputEl.addEventListener('input', () => {
      inputEl.style.borderColor = '';
      DOM.marksGeneralError.textContent = '';
      updateLivePreview();
    });
  });


  // Filters & Search
  DOM.filterSearch.addEventListener('input', (e) => {
    DOM.clearSearchBtn.classList.toggle('visible', Boolean(e.target.value.trim()));
    renderRecordsTable();
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.filterSearch.value = '';
    DOM.clearSearchBtn.classList.remove('visible');
    renderRecordsTable();
  });

  DOM.filterStatus.addEventListener('change', renderRecordsTable);
  DOM.filterBranch.addEventListener('change', renderRecordsTable);
  DOM.sortBy.addEventListener('change', renderRecordsTable);

  // Export & Import JSON
  DOM.exportJsonBtn.addEventListener('click', exportRecordsAsJSON);
  DOM.importJsonInput.addEventListener('change', importRecordsFromJSON);

  // Clear All Records Button
  DOM.clearAllBtn.addEventListener('click', confirmClearAllRecords);

  // Delete Modal Confirmation
  DOM.confirmDeleteBtn.addEventListener('click', () => {
    if (isBulkClear) {
      StorageManager.clearAll();
      showToast('All student records have been cleared from LocalStorage.', 'info');
    } else if (currentPendingDeleteId) {
      StorageManager.deleteStudent(currentPendingDeleteId);
      showToast('Student record deleted permanently.', 'info');
    }
    closeDeleteModal();
    updateDashboardKPIs();
    renderRecordsTable();
  });

  DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Marksheet Modal Print & Close
  DOM.closeMarksheetBtn.addEventListener('click', closeMarksheetModal);
  DOM.printMarksheetBtn.addEventListener('click', () => {
    window.print();
  });

  // Close modals on overlay backdrop click
  [DOM.marksheetModal, DOM.deleteModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeMarksheetModal();
        closeDeleteModal();
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMarksheetModal();
      closeDeleteModal();
    }
  });
}

// Expose modal openers to global window for inline onclick attributes
window.openMarksheetModal = openMarksheetModal;
window.editStudentRecord = editStudentRecord;
window.confirmDeleteRecord = confirmDeleteRecord;

// ─── Application Entrypoint ───
document.addEventListener('DOMContentLoaded', () => {
  // Clear any old mock data key if present
  try {
    localStorage.removeItem('edu_grade_mca_students_v1');
    localStorage.removeItem('edu_grade_theme_v1');
  } catch (e) {
    // Ignore storage errors
  }

  // Setup Event Handlers
  setupEventListeners();

  // Initial Render of Tables & Dashboards (starts fresh with 0 records)
  updateDashboardKPIs();
  renderRecordsTable();
  updateLivePreview();

  console.log('StudentHub RMS initialized successfully.');
});
