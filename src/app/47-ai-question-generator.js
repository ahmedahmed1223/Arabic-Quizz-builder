// ============================================================
// 47-ai-question-generator.js — AI-powered question generation
// Phase 4 (T-041) — Generates quiz questions from a topic
// ============================================================
// Uses the z-ai-web-dev-sdk (available in the runtime) to call an LLM
// that generates culturally-appropriate Arabic questions.
//
// API:
//   AIQuestionGenerator.generate({
//     topic: 'التاريخ الإسلامي',
//     count: 10,
//     difficulty: 'medium',  // easy|medium|hard|mixed
//     type: 'mcq',           // mcq|tf|fitb|mixed
//     language: 'ar'         // ar|en|fr|ur
//   })
// ============================================================

window.AIQuestionGenerator = (function() {
  'use strict';

  const DEFAULTS = {
    count: 10,
    difficulty: 'medium',
    type: 'mcq',
    language: 'ar',
  };

  // ── Main generation function ──
  async function generate(options) {
    const opts = { ...DEFAULTS, ...options };

    // Validate inputs
    if (!opts.topic || typeof opts.topic !== 'string' || opts.topic.trim().length < 2) {
      throw new Error('Topic is required (minimum 2 characters)');
    }
    if (opts.count < 1 || opts.count > 30) {
      throw new Error('Count must be between 1 and 30');
    }

    // Build the prompt
    const prompt = _buildPrompt(opts);

    try {
      // Use the z-ai-web-dev-sdk if available (runtime environment)
      if (typeof ZAI !== 'undefined' && ZAI.chat) {
        const response = await ZAI.chat.completions.create({
          messages: [
            { role: 'system', content: _systemPrompt(opts.language) },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });
        return _parseResponse(response.choices[0].message.content, opts);
      }

      // Fallback: if SDK not available, return a stub
      console.warn('[AI] ZAI SDK not available — returning stub questions');
      return _generateStubQuestions(opts);
    } catch (err) {
      console.error('[AI] Generation failed:', err);
      throw err;
    }
  }

  // ── System prompt (sets the AI's behavior) ──
  function _systemPrompt(lang) {
    const prompts = {
      ar: `أنت مساعد ذكي متخصص في إنشاء أسئلة تعليمية عربية عالية الجودة. تنشئ أسئلة دقيقة ثقافياً، متنوعة، ومناسبة للجمهور العربي. تتجنب المواضيع الحساسة أو المثيرة للجدل. تُرجع الإجابات بصيغة JSON صالحة فقط دون نص إضافي.`,
      en: `You are an AI assistant specialized in creating high-quality Arabic educational quiz questions. You create culturally accurate, diverse questions appropriate for an Arab audience. You avoid sensitive or controversial topics. Return answers as valid JSON only, with no additional text.`,
      fr: `Vous êtes un assistant IA spécialisé dans la création de questions de quiz éducatives arabes de haute qualité. Vous créez des questions culturellement précises et appropriées. Retournez les réponses en JSON valide uniquement.`,
      ur: `آپ اعلیٰ معیار کے عربی تعلیمی کوئز سوالات بنانے میں ماہر AI اسسٹنٹ ہیں۔ آپ ثقافتی طور پر درست سوالات بناتے ہیں۔ جوابات صرف JSON میں دیں۔`,
    };
    return prompts[lang] || prompts.ar;
  }

  // ── Build the user prompt ──
  function _buildPrompt(opts) {
    const diffLabel = {
      easy: 'سهل (مناسبة للمبتدئين)',
      medium: 'متوسط',
      hard: 'صعب (متقدم)',
      mixed: 'متنوع الصعوبة',
    }[opts.difficulty] || 'متوسط';

    const typeLabel = {
      mcq: 'اختيار من متعدد (4 خيارات، إجابة واحدة صحيحة)',
      tf: 'صح أو خطأ',
      fitb: 'أكمل الفراغ',
      mixed: 'متنوع الأنواع (MCQ، صح/خطأ، أكمل الفراغ)',
    }[opts.type] || 'اختيار من متعدد';

    return `أنشئ ${opts.count} سؤالاً تعليمياً حول الموضوع التالي:

الموضوع: "${opts.topic}"
الصعوبة: ${diffLabel}
النوع: ${typeLabel}
اللغة: ${opts.language === 'ar' ? 'العربية' : opts.language}

الشروط:
1. كل سؤال يجب أن يكون دقيقاً علمياً وثقافياً
2. الخيارات الخاطئة يجب أن تكون معقولة (ليست واضحة الخطأ)
3. تجنب المواضيع الحساسة السياسية أو الدينية المثيرة للجدل
4. متنوع المحتوى (لا تكرر نفس نوع السؤال)
5. كل سؤال له تفسير مختصر يوضح الإجابة الصحيحة

أرجع النتيجة بصيغة JSON بالشكل التالي بالضبط (بدون نص قبل أو بعد):
{
  "questions": [
    {
      "type": "mcq",
      "text": "نص السؤال هنا؟",
      "options": ["الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4"],
      "correct": 0,
      "difficulty": "medium",
      "explanation": "شرح موجز للإجابة",
      "time": 30
    },
    {
      "type": "tf",
      "text": "عبارة للتحقق منها.",
      "correct": true,
      "difficulty": "easy",
      "explanation": "شرح",
      "time": 20
    },
    {
      "type": "fitb",
      "text": "أكمل الفراغ: العاصمة هي ____",
      "answer": "القاهرة",
      "difficulty": "easy",
      "explanation": "القاهرة عاصمة مصر",
      "time": 25
    }
  ]
}

ملاحظة: "correct" لـ MCQ هو رقم الخيار (0-3)، لـ tf هو true/false.`;
  }

  // ── Parse the AI response ──
  function _parseResponse(content, opts) {
    let parsed;
    try {
      // Try direct JSON parse first
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from the response (in case AI added text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          throw new Error('AI response was not valid JSON: ' + content.slice(0, 200));
        }
      } else {
        throw new Error('No JSON found in AI response');
      }
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('AI response missing "questions" array');
    }

    // Normalize each question to match the app's expected format
    const questions = parsed.questions.map((q, idx) => {
      const id = 'ai_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2, 8);
      return {
        id,
        type: q.type || opts.type,
        text: q.text || '(سؤال بدون نص)',
        options: q.options || [],
        correct: q.correct !== undefined ? q.correct : 0,
        answer: q.answer || '',
        difficulty: q.difficulty || opts.difficulty,
        explanation: q.explanation || '',
        time: q.time || 30,
        catId: null,  // Will be set by caller
        source: 'ai-generated',
        generatedAt: new Date().toISOString(),
      };
    });

    return {
      questions,
      topic: opts.topic,
      count: questions.length,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Stub generator (fallback when SDK not available) ──
  function _generateStubQuestions(opts) {
    const stubs = [];
    for (let i = 0; i < opts.count; i++) {
      stubs.push({
        id: 'ai_stub_' + Date.now() + '_' + i,
        type: opts.type === 'mixed' ? 'mcq' : opts.type,
        text: `[سؤال تجريبي ${i + 1}] ${opts.topic} — يرجى الاتصال بالخادم لتوليد أسئلة حقيقية`,
        options: ['خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'],
        correct: 0,
        difficulty: opts.difficulty,
        explanation: 'هذا سؤال تجريبي. فعّل ZAI SDK للحصول على أسئلة حقيقية.',
        time: 30,
        catId: null,
        source: 'ai-stub',
        generatedAt: new Date().toISOString(),
      });
    }
    return { questions: stubs, topic: opts.topic, count: stubs.length, generatedAt: new Date().toISOString() };
  }

  // ── UI: Open generation modal ──
  function openGeneratorModal(catId) {
    if (typeof openModal !== 'function') {
      console.error('[AI] openModal not available');
      return;
    }

    // Create modal if it doesn't exist
    let modal = document.getElementById('modal-ai-generator');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-ai-generator';
      modal.className = 'modal-overlay hidden';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:500px">
          <div class="modal-header">
            <h2>🤖 توليد الأسئلة بالذكاء الاصطناعي</h2>
            <button class="btn btn-ghost" onclick="closeModal('modal-ai-generator')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>الموضوع</label>
              <input type="text" id="ai-topic" placeholder="مثال: التاريخ الإسلامي، العلوم، الجغرافيا" class="form-input">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>عدد الأسئلة</label>
                <input type="number" id="ai-count" value="10" min="1" max="30" class="form-input">
              </div>
              <div class="form-group">
                <label>الصعوبة</label>
                <select id="ai-difficulty" class="form-input">
                  <option value="easy">سهل</option>
                  <option value="medium" selected>متوسط</option>
                  <option value="hard">صعب</option>
                  <option value="mixed">متنوع</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>نوع السؤال</label>
              <select id="ai-type" class="form-input">
                <option value="mcq" selected>اختيار من متعدد</option>
                <option value="tf">صح أو خطأ</option>
                <option value="fitb">أكمل الفراغ</option>
                <option value="mixed">متنوع</option>
              </select>
            </div>
            <div id="ai-status" style="margin-top:12px;padding:8px;border-radius:6px;display:none"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeModal('modal-ai-generator')">إلغاء</button>
            <button class="btn btn-primary" id="ai-generate-btn" onclick="AIQuestionGenerator._generateFromModal('${catId}')">🤖 توليد</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    openModal('modal-ai-generator');
  }

  // ── Generate from modal inputs ──
  async function _generateFromModal(catId) {
    const topic = document.getElementById('ai-topic').value.trim();
    const count = parseInt(document.getElementById('ai-count').value) || 10;
    const difficulty = document.getElementById('ai-difficulty').value;
    const type = document.getElementById('ai-type').value;
    const statusEl = document.getElementById('ai-status');
    const btn = document.getElementById('ai-generate-btn');

    if (!topic) {
      statusEl.style.display = 'block';
      statusEl.style.background = 'rgba(255,99,132,.1)';
      statusEl.textContent = '⚠️ يرجى إدخال موضوع';
      return;
    }

    // Show loading
    statusEl.style.display = 'block';
    statusEl.style.background = 'rgba(0,212,255,.1)';
    statusEl.textContent = '⏳ جارٍ التوليد... قد يستغرق 10-30 ثانية';
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ التوليد...';

    try {
      const result = await generate({ topic, count, difficulty, type });

      // Add questions to the category
      const cat = state.categories.find(c => c.id === catId);
      if (!cat) throw new Error('Category not found: ' + catId);

      result.questions.forEach(q => {
        q.catId = catId;
        cat.questions.push(q);
      });

      try { saveState(); } catch (e) {}
      if (typeof renderQuestionsAdmin === 'function') renderQuestionsAdmin(catId);
      if (typeof renderStatsGrid === 'function') renderStatsGrid();

      statusEl.style.background = 'rgba(0,230,118,.1)';
      statusEl.textContent = `✅ تم توليد ${result.questions.length} سؤال بنجاح!`;

      setTimeout(() => {
        closeModal('modal-ai-generator');
      }, 1500);

    } catch (err) {
      statusEl.style.background = 'rgba(255,99,132,.1)';
      statusEl.textContent = '❌ فشل التوليد: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 توليد';
    }
  }

  return {
    generate,
    openGeneratorModal,
    _generateFromModal,
  };
})();

console.info('[AI] V15.0 AI Question Generator loaded');
