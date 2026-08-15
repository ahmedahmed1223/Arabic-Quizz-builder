// ============================================================
// 46-analytics-dashboard.js — Teacher Analytics Dashboard
// Phase 4 (T-038) — Educational analytics for teachers
// ============================================================
// Provides:
//   1. Per-student performance breakdown (strengths/weaknesses)
//   2. Per-category difficulty analysis (which categories students struggle with)
//   3. Per-question success rate (identify poorly-written questions)
//   4. Session history with trends over time
//   5. Export to PDF (via jsPDF) and Excel (via SheetJS)
// Loaded as a new IIFE module — registered as window.Analytics
// ============================================================

window.Analytics = (function() {
  'use strict';

  // ── Data Collection ──
  // Records are stored in state.sessionStats (existing structure)
  // and a new state.analytics structure for detailed per-question data.

  function _ensureAnalyticsState() {
    if (!state.analytics) {
      state.analytics = {
        questionStats: {},  // {qId: {correct, wrong, skipped, totalTime, lastAnswered}}
        categoryStats: {},  // {catId: {correct, wrong, avgTime}}
        studentProgress: {},  // {studentId: {name, sessions, totalCorrect, totalWrong, weakCategories}}
        sessionHistory: [],  // [{date, duration, students, avgScore, topCategory, weakCategory}]
      };
    }
    return state.analytics;
  }

  // ── Record a single answer ──
  function recordAnswer(qId, catId, isCorrect, timeSpent, studentName) {
    var a = _ensureAnalyticsState();

    // Question stats
    if (!a.questionStats[qId]) {
      a.questionStats[qId] = { correct: 0, wrong: 0, skipped: 0, totalTime: 0, count: 0, lastAnswered: null };
    }
    var qs = a.questionStats[qId];
    if (isCorrect === true) qs.correct++;
    else if (isCorrect === false) qs.wrong++;
    else qs.skipped++;
    qs.totalTime += timeSpent || 0;
    qs.count++;
    qs.lastAnswered = new Date().toISOString();

    // Category stats
    if (!a.categoryStats[catId]) {
      a.categoryStats[catId] = { correct: 0, wrong: 0, skipped: 0, totalTime: 0, count: 0 };
    }
    var cs = a.categoryStats[catId];
    if (isCorrect === true) cs.correct++;
    else if (isCorrect === false) cs.wrong++;
    else cs.skipped++;
    cs.totalTime += timeSpent || 0;
    cs.count++;

    // Student progress
    if (studentName) {
      var sid = btoa(unescape(encodeURIComponent(studentName))).slice(0, 16);
      if (!a.studentProgress[sid]) {
        a.studentProgress[sid] = {
          name: studentName,
          sessions: 0,
          totalCorrect: 0,
          totalWrong: 0,
          weakCategories: {},
          strongCategories: {},
          lastActive: null,
        };
      }
      var sp = a.studentProgress[sid];
      if (isCorrect === true) {
        sp.totalCorrect++;
        sp.strongCategories[catId] = (sp.strongCategories[catId] || 0) + 1;
      } else if (isCorrect === false) {
        sp.totalWrong++;
        sp.weakCategories[catId] = (sp.weakCategories[catId] || 0) + 1;
      }
      sp.lastActive = new Date().toISOString();
    }

    // Persist
    try { saveState(); } catch (e) { console.warn('[Analytics] saveState failed:', e); }
  }

  // ── Record a session end ──
  function recordSessionEnd(duration, students, avgScore, topCategory, weakCategory) {
    var a = _ensureAnalyticsState();
    a.sessionHistory.push({
      date: new Date().toISOString(),
      duration: duration,
      studentCount: students,
      avgScore: avgScore,
      topCategory: topCategory,
      weakCategory: weakCategory,
    });
    // Keep last 100 sessions
    if (a.sessionHistory.length > 100) {
      a.sessionHistory = a.sessionHistory.slice(-100);
    }
    // Increment session count for all active students
    try { saveState(); } catch (e) {}
  }

  // ── Get computed analytics ──
  function getQuestionAnalytics() {
    var a = _ensureAnalyticsState();
    var results = [];
    var catMap = {};
    state.categories.forEach(function(c) { catMap[c.id] = c.name; });

    Object.keys(a.questionStats).forEach(function(qId) {
      var qs = a.questionStats[qId];
      var successRate = qs.count > 0 ? (qs.correct / qs.count * 100) : 0;
      var avgTime = qs.count > 0 ? Math.round(qs.totalTime / qs.count) : 0;
      var q = _findQuestion(qId);
      results.push({
        qId: qId,
        text: q ? (q.text || '').slice(0, 80) : '(محذوف)',
        category: q ? (catMap[q.catId] || 'غير معروف') : 'غير معروف',
        correct: qs.correct,
        wrong: qs.wrong,
        skipped: qs.skipped,
        total: qs.count,
        successRate: Math.round(successRate),
        avgTime: avgTime,
        difficulty: successRate >= 70 ? 'easy' : successRate >= 40 ? 'medium' : 'hard',
        lastAnswered: qs.lastAnswered,
      });
    });

    results.sort(function(a, b) { return a.successRate - b.successRate; });
    return results;
  }

  function getCategoryAnalytics() {
    var a = _ensureAnalyticsState();
    var results = [];
    var catMap = {};
    state.categories.forEach(function(c) { catMap[c.id] = c.name; });

    Object.keys(a.categoryStats).forEach(function(catId) {
      var cs = a.categoryStats[catId];
      var successRate = cs.count > 0 ? (cs.correct / cs.count * 100) : 0;
      var avgTime = cs.count > 0 ? Math.round(cs.totalTime / cs.count) : 0;
      results.push({
        catId: catId,
        name: catMap[catId] || 'غير معروف',
        correct: cs.correct,
        wrong: cs.wrong,
        skipped: cs.skipped,
        total: cs.count,
        successRate: Math.round(successRate),
        avgTime: avgTime,
      });
    });

    results.sort(function(a, b) { return a.successRate - b.successRate; });
    return results;
  }

  function getStudentAnalytics() {
    var a = _ensureAnalyticsState();
    var results = [];
    var catMap = {};
    state.categories.forEach(function(c) { catMap[c.id] = c.name; });

    Object.keys(a.studentProgress).forEach(function(sid) {
      var sp = a.studentProgress[sid];
      var total = sp.totalCorrect + sp.totalWrong;
      var successRate = total > 0 ? (sp.totalCorrect / total * 100) : 0;

      // Find weakest category
      var weakCat = null, weakCount = 0;
      Object.keys(sp.weakCategories).forEach(function(catId) {
        if (sp.weakCategories[catId] > weakCount) {
          weakCount = sp.weakCategories[catId];
          weakCat = catMap[catId] || catId;
        }
      });

      // Find strongest category
      var strongCat = null, strongCount = 0;
      Object.keys(sp.strongCategories).forEach(function(catId) {
        if (sp.strongCategories[catId] > strongCount) {
          strongCount = sp.strongCategories[catId];
          strongCat = catMap[catId] || catId;
        }
      });

      results.push({
        name: sp.name,
        totalAnswered: total,
        correct: sp.totalCorrect,
        wrong: sp.totalWrong,
        successRate: Math.round(successRate),
        weakestCategory: weakCat,
        strongestCategory: strongCat,
        lastActive: sp.lastActive,
      });
    });

    results.sort(function(a, b) { return b.successRate - a.successRate; });
    return results;
  }

  function getSessionHistory() {
    var a = _ensureAnalyticsState();
    return a.sessionHistory.slice().reverse();  // Most recent first
  }

  function _findQuestion(qId) {
    for (var i = 0; i < state.categories.length; i++) {
      var qs = state.categories[i].questions || [];
      for (var j = 0; j < qs.length; j++) {
        if (qs[j].id === qId) {
          return qs[j];
        }
      }
    }
    return null;
  }

  // ── Export to PDF (uses jsPDF) ──
  function exportToPDF() {
    try {
      if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
        toast('مكتبة jsPDF غير محمّلة', 'danger');
        return;
      }
      var { jsPDF } = window.jspdf;
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Title (Arabic text — jsPDF needs a font that supports Arabic)
      doc.setFontSize(18);
      doc.text('Arabic Quiz Builder - Analytics Report', 20, 20);
      doc.setFontSize(10);
      doc.text('Generated: ' + new Date().toLocaleString('ar'), 20, 28);

      // Summary
      var qA = getQuestionAnalytics();
      var cA = getCategoryAnalytics();
      var sA = getStudentAnalytics();

      doc.setFontSize(14);
      doc.text('Summary', 20, 45);
      doc.setFontSize(10);
      doc.text('Total Questions Answered: ' + qA.reduce((s, q) => s + q.total, 0), 20, 55);
      doc.text('Total Students: ' + sA.length, 20, 62);
      doc.text('Categories Analyzed: ' + cA.length, 20, 69);

      // Category breakdown
      doc.setFontSize(14);
      doc.text('Category Performance', 20, 85);
      doc.setFontSize(9);
      var y = 95;
      doc.text('Category', 20, y);
      doc.text('Correct', 80, y);
      doc.text('Wrong', 105, y);
      doc.text('Success %', 130, y);
      y += 5;
      cA.forEach(function(c) {
        doc.text((c.name || '').slice(0, 25), 20, y);
        doc.text(String(c.correct), 80, y);
        doc.text(String(c.wrong), 105, y);
        doc.text(c.successRate + '%', 130, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = 20; }
      });

      // Student breakdown
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Student Performance', 20, 20);
      doc.setFontSize(9);
      y = 30;
      doc.text('Name', 20, y);
      doc.text('Correct', 80, y);
      doc.text('Wrong', 100, y);
      doc.text('Success %', 125, y);
      doc.text('Weakest Cat', 150, y);
      y += 5;
      sA.forEach(function(s) {
        doc.text((s.name || '').slice(0, 20), 20, y);
        doc.text(String(s.correct), 80, y);
        doc.text(String(s.wrong), 100, y);
        doc.text(s.successRate + '%', 125, y);
        doc.text((s.weakestCategory || '-').slice(0, 20), 150, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = 20; }
      });

      doc.save('analytics-report-' + new Date().toISOString().slice(0, 10) + '.pdf');
      toast('تم تصدير تقرير PDF', 'success');
    } catch (e) {
      console.error('[Analytics] PDF export failed:', e);
      toast('فشل تصدير PDF: ' + e.message, 'danger');
    }
  }

  // ── Export to Excel (uses SheetJS) ──
  function exportToExcel() {
    try {
      if (typeof XLSX === 'undefined') {
        toast('مكتبة SheetJS غير محمّلة', 'danger');
        return;
      }
      var wb = XLSX.utils.book_new();

      // Sheet 1: Questions
      var qData = getQuestionAnalytics();
      var qSheet = XLSX.utils.json_to_sheet(qData);
      XLSX.utils.book_append_sheet(wb, qSheet, 'Questions');

      // Sheet 2: Categories
      var cData = getCategoryAnalytics();
      var cSheet = XLSX.utils.json_to_sheet(cData);
      XLSX.utils.book_append_sheet(wb, cSheet, 'Categories');

      // Sheet 3: Students
      var sData = getStudentAnalytics();
      var sSheet = XLSX.utils.json_to_sheet(sData);
      XLSX.utils.book_append_sheet(wb, sSheet, 'Students');

      // Sheet 4: Session History
      var hData = getSessionHistory();
      var hSheet = XLSX.utils.json_to_sheet(hData);
      XLSX.utils.book_append_sheet(wb, hSheet, 'Sessions');

      XLSX.writeFile(wb, 'analytics-' + new Date().toISOString().slice(0, 10) + '.xlsx');
      toast('تم تصدير ملف Excel', 'success');
    } catch (e) {
      console.error('[Analytics] Excel export failed:', e);
      toast('فشل تصدير Excel: ' + e.message, 'danger');
    }
  }

  // ── Clear all analytics ──
  function clearAnalytics() {
    if (typeof confirmAction === 'function') {
      confirmAction(
        'هل أنت متأكد من مسح جميع بيانات التحليلات؟ لا يمكن التراجع.',
        function() {
          state.analytics = null;
          _ensureAnalyticsState();
          try { saveState(); } catch (e) {}
          toast('تم مسح بيانات التحليلات', 'info');
          if (typeof renderAnalyticsPanel === 'function') renderAnalyticsPanel();
        }
      );
    }
  }

  // ── Render Analytics Panel (UI) ──
  function renderAnalyticsPanel() {
    var container = document.getElementById('analytics-panel');
    if (!container) return;

    var qA = getQuestionAnalytics();
    var cA = getCategoryAnalytics();
    var sA = getStudentAnalytics();
    var hA = getSessionHistory();

    var html = `
      <div class="analytics-dashboard">
        <div class="analytics-header">
          <h2>📊 لوحة التحليلات التعليمية</h2>
          <div class="analytics-actions">
            <button class="btn btn-primary" onclick="Analytics.exportToPDF()">📄 تصدير PDF</button>
            <button class="btn btn-primary" onclick="Analytics.exportToExcel()">📊 تصدير Excel</button>
            <button class="btn btn-danger" onclick="Analytics.clearAnalytics()">🗑️ مسح البيانات</button>
          </div>
        </div>

        <div class="analytics-summary">
          <div class="summary-card">
            <div class="summary-value">${qA.reduce((s, q) => s + q.total, 0)}</div>
            <div class="summary-label">إجمالي الإجابات</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${sA.length}</div>
            <div class="summary-label">الطلاب</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${cA.length}</div>
            <div class="summary-label">الأقسام</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${hA.length}</div>
            <div class="summary-label">الجلسات</div>
          </div>
        </div>

        <div class="analytics-section">
          <h3>📉 الأسئلة الأصعب</h3>
          <div class="analytics-table-wrapper">
            ${_renderQuestionsTable(qA.slice(0, 10))}
          </div>
        </div>

        <div class="analytics-section">
          <h3>📁 أداء الأقسام</h3>
          <div class="analytics-table-wrapper">
            ${_renderCategoriesTable(cA)}
          </div>
        </div>

        <div class="analytics-section">
          <h3>👥 أداء الطلاب</h3>
          <div class="analytics-table-wrapper">
            ${_renderStudentsTable(sA)}
          </div>
        </div>

        ${hA.length > 0 ? `
        <div class="analytics-section">
          <h3>📈 آخر الجلسات</h3>
          <div class="analytics-table-wrapper">
            ${_renderSessionsTable(hA.slice(0, 10))}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
  }

  function _renderQuestionsTable(questions) {
    if (!questions.length) return '<div class="empty-state">لا توجد بيانات بعد</div>';
    var rows = questions.map(function(q) {
      var diffClass = q.difficulty === 'hard' ? 'diff-hard' : q.difficulty === 'medium' ? 'diff-medium' : 'diff-easy';
      var diffLabel = q.difficulty === 'hard' ? 'صعب' : q.difficulty === 'medium' ? 'متوسط' : 'سهل';
      return `
        <tr>
          <td>${q.text}...</td>
          <td>${q.category}</td>
          <td>${q.correct}</td>
          <td>${q.wrong}</td>
          <td><span class="diff-badge ${diffClass}">${q.successRate}%</span></td>
          <td>${q.avgTime}ث</td>
        </tr>
      `;
    }).join('');
    return `
      <table class="analytics-table">
        <thead><tr><th>السؤال</th><th>القسم</th><th>صحيح</th><th>خطأ</th><th>نسبة النجاح</th><th>متوسط الوقت</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function _renderCategoriesTable(categories) {
    if (!categories.length) return '<div class="empty-state">لا توجد بيانات بعد</div>';
    var rows = categories.map(function(c) {
      var diffClass = c.successRate < 40 ? 'diff-hard' : c.successRate < 70 ? 'diff-medium' : 'diff-easy';
      return `
        <tr>
          <td>${c.name}</td>
          <td>${c.correct}</td>
          <td>${c.wrong}</td>
          <td>${c.skipped}</td>
          <td><span class="diff-badge ${diffClass}">${c.successRate}%</span></td>
          <td>${c.avgTime}ث</td>
        </tr>
      `;
    }).join('');
    return `
      <table class="analytics-table">
        <thead><tr><th>القسم</th><th>صحيح</th><th>خطأ</th><th>تخطّي</th><th>نسبة النجاح</th><th>متوسط الوقت</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function _renderStudentsTable(students) {
    if (!students.length) return '<div class="empty-state">لا توجد بيانات بعد</div>';
    var rows = students.map(function(s) {
      var diffClass = s.successRate < 40 ? 'diff-hard' : s.successRate < 70 ? 'diff-medium' : 'diff-easy';
      return `
        <tr>
          <td>${s.name}</td>
          <td>${s.correct}</td>
          <td>${s.wrong}</td>
          <td><span class="diff-badge ${diffClass}">${s.successRate}%</span></td>
          <td>${s.weakestCategory || '-'}</td>
          <td>${s.strongestCategory || '-'}</td>
        </tr>
      `;
    }).join('');
    return `
      <table class="analytics-table">
        <thead><tr><th>الطالب</th><th>صحيح</th><th>خطأ</th><th>نسبة النجاح</th><th>أضعف قسم</th><th>أقوى قسم</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function _renderSessionsTable(sessions) {
    if (!sessions.length) return '<div class="empty-state">لا توجد جلسات بعد</div>';
    var rows = sessions.map(function(s) {
      var date = new Date(s.date).toLocaleString('ar');
      return `
        <tr>
          <td>${date}</td>
          <td>${Math.round(s.duration / 60)} دقيقة</td>
          <td>${s.studentCount}</td>
          <td>${s.avgScore}%</td>
          <td>${s.topCategory || '-'}</td>
          <td>${s.weakCategory || '-'}</td>
        </tr>
      `;
    }).join('');
    return `
      <table class="analytics-table">
        <thead><tr><th>التاريخ</th><th>المدة</th><th>الطلاب</th><th>متوسط النقاط</th><th>أفضل قسم</th><th>أضعف قسم</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  return {
    recordAnswer,
    recordSessionEnd,
    getQuestionAnalytics,
    getCategoryAnalytics,
    getStudentAnalytics,
    getSessionHistory,
    exportToPDF,
    exportToExcel,
    clearAnalytics,
    renderAnalyticsPanel,
  };
})();

console.info('[Analytics] V15.0 analytics dashboard loaded');
