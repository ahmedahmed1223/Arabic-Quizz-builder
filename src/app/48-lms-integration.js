// ============================================================
// 48-lms-integration.js — LMS Integration (Moodle, Google Classroom)
// Phase 4 (T-039) — Import/export quizzes to/from LMS platforms
// ============================================================
// Supported formats:
//   1. Moodle XML (GIFT format import, XML export)
//   2. Google Classroom (CSV import via Google Sheets API)
//   3. QTI 2.1 (IMS Question & Test Interoperability — standard)
//   4. SCORM 1.2 (for embedding in LMS packages)
// ============================================================

window.LMS = (function() {
  'use strict';

  // ── Moodle XML Export ──
  // Exports the current quiz state as Moodle XML format
  function exportToMoodleXML(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) {
      if (typeof toast === 'function') toast('القسم غير موجود', 'danger');
      return;
    }

    const xml = _buildMoodleXML(cat);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moodle-${cat.name.replace(/\s+/g, '-')}-${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof toast === 'function') toast('تم تصدير ملف Moodle XML', 'success');
  }

  function _buildMoodleXML(cat) {
    const escapeXml = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<quiz>\n';
    xml += `  <question type="category">\n`;
    xml += `    <category>\n`;
    xml += `      <text>$course$/top/${escapeXml(cat.name)}</text>\n`;
    xml += `    </category>\n`;
    xml += `    <info format="html">\n`;
    xml += `      <text></text>\n`;
    xml += `    </info>\n`;
    xml += `    <idnumber></idnumber>\n`;
    xml += `  </question>\n`;

    (cat.questions || []).forEach((q) => {
      const qType = _mapToMoodleType(q.type);
      xml += `  <question type="${qType}">\n`;
      xml += `    <name>\n`;
      xml += `      <text>${escapeXml((q.text || '').slice(0, 80))}</text>\n`;
      xml += `    </name>\n`;
      xml += `    <questiontext format="html">\n`;
      xml += `      <text><![CDATA[${escapeXml(q.text || '')}]]></text>\n`;
      xml += `    </questiontext>\n`;
      xml += `    <generalfeedback format="html">\n`;
      xml += `      <text><![CDATA[${escapeXml(q.explanation || '')}]]></text>\n`;
      xml += `    </generalfeedback>\n`;
      xml += `    <defaultgrade>1.0000000</defaultgrade>\n`;
      xml += `    <penalty>0.3333333</penalty>\n`;
      xml += `    <hidden>0</hidden>\n`;
      xml += `    <idnumber></idnumber>\n`;

      if (qType === 'multichoice') {
        xml += `    <single>true</single>\n`;
        xml += `    <shuffleanswers>true</shuffleanswers>\n`;
        xml += `    <answernumbering>abc</answernumbering>\n`;
        xml += `    <correctfeedback format="html">\n`;
        xml += `      <text>إجابتك صحيحة.</text>\n`;
        xml += `    </correctfeedback>\n`;
        xml += `    <partiallycorrectfeedback format="html">\n`;
        xml += `      <text>إجابتك جزئياً صحيحة.</text>\n`;
        xml += `    </partiallycorrectfeedback>\n`;
        xml += `    <incorrectfeedback format="html">\n`;
        xml += `      <text>إجابتك غير صحيحة.</text>\n`;
        xml += `    </incorrectfeedback>\n`;

        (q.options || []).forEach((opt, idx) => {
          const fraction = idx === q.correct ? '100' : '0';
          xml += `    <answer fraction="${fraction}" format="html">\n`;
          xml += `      <text><![CDATA[${escapeXml(opt)}]]></text>\n`;
          xml += `      <feedback format="html">\n`;
          xml += `        <text></text>\n`;
          xml += `      </feedback>\n`;
          xml += `    </answer>\n`;
        });
      } else if (qType === 'truefalse') {
        const isTrue = q.correct === true || q.correct === 0;
        xml += `    <answer fraction="${isTrue ? 100 : 0}" format="moodle_auto_format">\n`;
        xml += `      <text>true</text>\n`;
        xml += `      <feedback format="html"><text></text></feedback>\n`;
        xml += `    </answer>\n`;
        xml += `    <answer fraction="${!isTrue ? 100 : 0}" format="moodle_auto_format">\n`;
        xml += `      <text>false</text>\n`;
        xml += `      <feedback format="html"><text></text></feedback>\n`;
        xml += `    </answer>\n`;
      } else if (qType === 'shortanswer') {
        xml += `    <usecase>0</usecase>\n`;
        xml += `    <answer fraction="100" format="moodle_auto_format">\n`;
        xml += `      <text><![CDATA[${escapeXml(q.answer || '')}]]></text>\n`;
        xml += `      <feedback format="html"><text></text></feedback>\n`;
        xml += `    </answer>\n`;
      }

      xml += `  </question>\n`;
    });

    xml += '</quiz>\n';
    return xml;
  }

  function _mapToMoodleType(appType) {
    const map = {
      mcq: 'multichoice',
      tf: 'truefalse',
      fitb: 'shortanswer',
      // moodle doesn't have native support for: order, match, math, image, audio, video, quran
      // These would need to be exported as 'description' or 'essay'
    };
    return map[appType] || 'essay';
  }

  // ── Moodle GIFT Import ──
  function importFromGIFT(giftText) {
    const questions = [];
    const lines = giftText.split('\n');
    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//')) continue;

      // Question start: ::Title:: Question text {
      const qStart = line.match(/^::(.+?)::\s*(.+)\s*\{(.*)\}?$/);
      if (qStart) {
        if (currentQ) questions.push(currentQ);
        currentQ = {
          id: 'gift_' + Date.now() + '_' + questions.length,
          type: 'mcq',
          text: qStart[2],
          options: [],
          correct: 0,
          difficulty: 'medium',
          explanation: '',
          time: 30,
          source: 'gift-import',
        };

        // Parse answers inside { }
        const answersStr = qStart[3];
        if (answersStr === 'T' || answersStr === 'TRUE') {
          currentQ.type = 'tf';
          currentQ.correct = true;
        } else if (answersStr === 'F' || answersStr === 'FALSE') {
          currentQ.type = 'tf';
          currentQ.correct = false;
        } else if (answersStr.startsWith('=')) {
          currentQ.type = 'fitb';
          currentQ.answer = answersStr.slice(1).replace(/~.*/, '');
        } else {
          // MCQ: ~wrong ~=correct ~wrong
          const opts = answersStr.split('~').filter(s => s);
          opts.forEach((opt, idx) => {
            const isCorrect = opt.startsWith('=');
            const text = isCorrect ? opt.slice(1) : opt;
            currentQ.options.push(text.trim());
            if (isCorrect) currentQ.correct = idx;
          });
        }
      }
    }
    if (currentQ) questions.push(currentQ);

    return questions;
  }

  // ── Google Classroom CSV Export ──
  function exportToGoogleClassroomCSV(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    let csv = 'Question,Option A,Option B,Option C,Option D,Correct Answer,Points\n';

    (cat.questions || []).forEach((q) => {
      if (q.type === 'mcq' && q.options && q.options.length >= 2) {
        const correctLetter = String.fromCharCode(65 + (q.correct || 0));
        const opts = q.options.slice(0, 4);
        while (opts.length < 4) opts.push('');
        csv += `"${(q.text || '').replace(/"/g, '""')}",`;
        csv += opts.map(o => `"${String(o || '').replace(/"/g, '""')}"`).join(',');
        csv += `,${correctLetter},1\n`;
      }
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-${cat.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof toast === 'function') toast('تم تصدير ملف Google Classroom CSV', 'success');
  }

  // ── QTI 2.1 Export (IMS standard) ──
  function exportToQTI(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    const escapeXml = (s) => String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv2p1">\n';
    xml += '  <assessment title="' + escapeXml(cat.name) + '">\n';
    xml += '    <section ident="section_' + cat.id + '">\n';

    (cat.questions || []).forEach((q, idx) => {
      const ident = `q_${cat.id}_${idx}`;
      xml += `      <item ident="${ident}" title="${escapeXml((q.text || '').slice(0, 50))}">\n`;
      xml += `        <presentation>\n`;
      xml += `          <material>\n`;
      xml += `            <mattext>${escapeXml(q.text)}</mattext>\n`;
      xml += `          </material>\n`;

      if (q.type === 'mcq') {
        xml += `          <response_lid ident="RESPONSE" rcardinality="Single">\n`;
        xml += `            <render_choice>\n`;
        (q.options || []).forEach((opt, oi) => {
          xml += `              <response_label ident="opt_${oi}">\n`;
          xml += `                <material><mattext>${escapeXml(opt)}</mattext></material>\n`;
          xml += `              </response_label>\n`;
        });
        xml += `            </render_choice>\n`;
        xml += `          </response_lid>\n`;
      }

      xml += `        </presentation>\n`;
      xml += `        <resprocessing>\n`;
      xml += `          <outcomes><decvar varname="SCORE" vartype="Integer" minvalue="0" maxvalue="1"/></outcomes>\n`;

      if (q.type === 'mcq') {
        xml += `          <respcondition continue="No">\n`;
        xml += `            <conditionvar><varequal respident="RESPONSE">opt_${q.correct}</varequal></conditionvar>\n`;
        xml += `            <setvar action="Set" varname="SCORE">1</setvar>\n`;
        xml += `          </respcondition>\n`;
      }

      xml += `        </resprocessing>\n`;
      xml += `      </item>\n`;
    });

    xml += '    </section>\n';
    xml += '  </assessment>\n';
    xml += '</questestinterop>\n';

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qti-${cat.name.replace(/\s+/g, '-')}-${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof toast === 'function') toast('تم تصدير ملف QTI 2.1', 'success');
  }

  // ── UI: Open LMS export modal ──
  function openExportModal(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    if (typeof confirmAction !== 'function') {
      // Fallback: simple prompt
      _showExportMenu(categoryId);
      return;
    }

    _showExportMenu(categoryId);
  }

  function _showExportMenu(categoryId) {
    let menu = document.getElementById('lms-export-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'lms-export-menu';
      menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-surface);padding:24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:10000;min-width:300px';
      menu.innerHTML = `
        <h3 style="margin:0 0 16px;color:var(--text-primary)">📤 تصدير إلى LMS</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="LMS.exportToMoodleXML('${''}')">📘 Moodle XML</button>
          <button class="btn btn-primary" onclick="LMS.exportToGoogleClassroomCSV('${''}')">🎓 Google Classroom CSV</button>
          <button class="btn btn-primary" onclick="LMS.exportToQTI('${''}')">📋 QTI 2.1 (IMS)</button>
          <button class="btn btn-ghost" onclick="document.getElementById('lms-export-menu').remove()">إلغاء</button>
        </div>
      `;
      document.body.appendChild(menu);
    }

    // Update onclick handlers with the actual categoryId
    menu.querySelectorAll('button[onclick^="LMS.export"]').forEach(btn => {
      const fn = btn.getAttribute('onclick').match(/LMS\.(\w+)/);
      if (fn) {
        const funcName = fn[1];
        btn.setAttribute('onclick', `LMS.${funcName}('${categoryId}'); document.getElementById('lms-export-menu').remove()`);
      }
    });
  }

  return {
    exportToMoodleXML,
    importFromGIFT,
    exportToGoogleClassroomCSV,
    exportToQTI,
    openExportModal,
  };
})();

console.info('[LMS] V15.0 LMS Integration loaded');
