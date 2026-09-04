import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '../login.html'; return null; }
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (error || profile?.role !== 'admin') { await supabase.auth.signOut(); window.location.href = '../login.html'; return null; }
  return session;
}

async function loadCount(table, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  element.textContent = error ? '—' : String(count ?? 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]));
}

function truncateQuestion(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function chapterLabel(chapter) {
  return `Form ${chapter.form} · Chapter ${chapter.chapter_number} — ${chapter.title}`;
}

async function loadChapters(selectId = 'chapter-input') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const { data, error } = await supabase.from('chapters').select('id,form,chapter_number,title,display_order').order('form').order('display_order', { ascending: true, nullsFirst: false }).order('chapter_number');
  if (error) { select.innerHTML = '<option value="">Unable to load chapters</option>'; return; }
  if (!data?.length) { select.innerHTML = '<option value="">No chapters found</option>'; return; }
  select.innerHTML = '<option value="">Select a chapter</option>' + data.map(chapter => `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapterLabel(chapter))}</option>`).join('');
}

async function getChapterQuestions(chapterId, excludeId = null) {
  let query = supabase.from('exercises').select('id,display_order,created_at').eq('chapter_id', chapterId).order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  return { data: data || [], error };
}

async function renumberChapter(chapterId) {
  if (!chapterId) return { error: null };
  const { data, error } = await getChapterQuestions(chapterId);
  if (error) return { error };
  for (let index = 0; index < data.length; index += 1) {
    const desired = index + 1;
    if (data[index].display_order !== desired) {
      const { error: updateError } = await supabase.from('exercises').update({ display_order: desired }).eq('id', data[index].id);
      if (updateError) return { error: updateError };
    }
  }
  return { error: null };
}

async function loadQuestions() {
  const body = document.getElementById('question-bank-body');
  const message = document.getElementById('admin-message');
  if (!body) return;
  const { data: questions, error } = await supabase.from('exercises').select('id,question,difficulty,display_order,is_published,chapter_id,created_at,chapters(form,chapter_number,title)').order('chapter_id').order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  if (error) { body.innerHTML = `<tr><td colspan="6" class="question-bank-empty">Unable to load questions.</td></tr>`; if (message) message.textContent = error.message; return; }
  if (!questions?.length) { body.innerHTML = '<tr><td colspan="6" class="question-bank-empty">No questions found.</td></tr>'; return; }
  body.innerHTML = questions.map((q) => {
    const chapter = Array.isArray(q.chapters) ? q.chapters[0] : q.chapters;
    const chapterText = chapter ? chapterLabel(chapter) : '—';
    const status = q.is_published ? '<span class="status-badge status-published">Published</span>' : '<span class="status-badge status-draft">Draft</span>';
    return `<tr><td>${escapeHtml(q.display_order ?? '—')}</td><td>${escapeHtml(chapterText)}</td><td class="question-bank-question">${escapeHtml(truncateQuestion(q.question))}</td><td>${q.difficulty ? escapeHtml(q.difficulty) : '—'}</td><td>${status}</td><td class="question-bank-actions-cell"><a class="edit-question-link" href="edit-question.html?id=${encodeURIComponent(q.id)}">Edit</a><button class="delete-question-button" type="button" data-question-id="${escapeHtml(q.id)}">Delete</button></td></tr>`;
  }).join('');
  body.querySelectorAll('.delete-question-button').forEach(button => button.addEventListener('click', () => deleteQuestion(button.dataset.questionId)));
}

async function deleteQuestion(id) {
  if (!id) return;
  const confirmed = window.confirm('Delete this question? The remaining questions in the same chapter will be renumbered automatically.');
  if (!confirmed) return;
  const message = document.getElementById('admin-message');
  if (message) message.textContent = 'Deleting question...';
  const { data: question, error: fetchError } = await supabase.from('exercises').select('chapter_id').eq('id', id).single();
  if (fetchError || !question) { if (message) message.textContent = `Unable to find question: ${fetchError?.message || 'Question not found'}`; return; }
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) { if (message) message.textContent = `Unable to delete question: ${error.message}`; return; }
  const { error: renumberError } = await renumberChapter(question.chapter_id);
  if (renumberError) { if (message) message.textContent = `Question deleted, but numbering could not be updated: ${renumberError.message}`; }
  else if (message) message.textContent = 'Question deleted and the remaining questions were renumbered.';
  await loadQuestions();
  await loadCount('exercises', 'exercise-count');
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.focus();
  const cursor = start + text.length;
  textarea.setSelectionRange(cursor, cursor);
}

async function ensureMathLive() {
  if (customElements.get('math-field')) return true;
  const existing = document.querySelector('script[data-mathlive-loader]');
  if (existing) {
    await customElements.whenDefined('math-field');
    return true;
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/mathlive';
    script.async = true;
    script.dataset.mathliveLoader = 'true';
    script.onload = async () => {
      try { await customElements.whenDefined('math-field'); resolve(true); }
      catch { resolve(false); }
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function setupEquationEditor() {
  const modal = document.getElementById('equation-modal');
  const mathField = document.getElementById('equation-input');
  const preview = document.getElementById('equation-preview');
  const cancel = document.getElementById('equation-cancel');
  const insert = document.getElementById('equation-insert');
  if (!modal || !mathField || !cancel || !insert) return;
  let target = null;

  const updatePreview = () => {
    if (!preview) return;
    preview.innerHTML = '';
    if (!mathField.value) return;
    const previewField = document.createElement('math-field');
    previewField.readOnly = true;
    previewField.value = mathField.value;
    previewField.style.cssText = 'display:block;width:100%;border:0;background:transparent;font-size:22px;';
    preview.appendChild(previewField);
  };

  document.querySelectorAll('[data-equation-target]').forEach(button => {
    button.addEventListener('click', async () => {
      target = document.getElementById(button.dataset.equationTarget);
      if (!target) return;
      const ready = await ensureMathLive();
      if (!ready) {
        window.alert('The equation editor could not be loaded. Please check your internet connection and try again.');
        target = null;
        return;
      }
      mathField.value = '';
      updatePreview();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      setTimeout(() => mathField.focus(), 50);
    });
  });

  mathField.addEventListener('input', updatePreview);
  cancel.addEventListener('click', () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    target = null;
  });
  insert.addEventListener('click', () => {
    const latex = typeof mathField.getValue === 'function' ? mathField.getValue('latex') : mathField.value;
    if (!target || !latex?.trim()) return;
    insertAtCursor(target, `\\(${latex.trim()}\\)`);
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    target = null;
  });
  modal.addEventListener('click', event => {
    if (event.target === modal) cancel.click();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) cancel.click();
  });
}

async function addQuestion(event) {
  event.preventDefault();
  const form = document.getElementById('question-form');
  const button = document.getElementById('add-question-button');
  const message = document.getElementById('question-form-message');
  if (!form || !button || !message) return;
  const question = document.getElementById('question-input')?.value.trim();
  const chapter_id = document.getElementById('chapter-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;
  if (!question || !chapter_id) { message.textContent = 'Please enter a question and select a chapter.'; return; }
  button.disabled = true;
  message.textContent = 'Adding question...';
  const { error: normalizeError } = await renumberChapter(chapter_id);
  if (normalizeError) { message.textContent = `Unable to check question numbering: ${normalizeError.message}`; button.disabled = false; return; }
  const { data: existing, error: existingError } = await getChapterQuestions(chapter_id);
  if (existingError) { message.textContent = `Unable to check question numbering: ${existingError.message}`; button.disabled = false; return; }
  const payload = { question, chapter_id, difficulty, display_order: existing.length + 1, hint, answer, solution, is_published };
  const { error } = await supabase.from('exercises').insert(payload);
  if (error) { message.textContent = `Unable to add question: ${error.message}`; button.disabled = false; return; }
  form.reset();
  message.textContent = is_published ? 'Question added and published.' : 'Question added as draft.';
  button.disabled = false;
}

async function editQuestion(event) {
  event.preventDefault();
  const form = document.getElementById('question-form');
  const button = document.getElementById('save-question-button');
  const message = document.getElementById('question-form-message');
  const id = new URLSearchParams(window.location.search).get('id');
  if (!form || !button || !message || !id) return;
  const question = document.getElementById('question-input')?.value.trim();
  const newChapterId = document.getElementById('chapter-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;
  if (!question || !newChapterId) { message.textContent = 'Please enter a question and select a chapter.'; return; }
  button.disabled = true;
  message.textContent = 'Saving changes...';
  const { data: current, error: currentError } = await supabase.from('exercises').select('chapter_id').eq('id', id).single();
  if (currentError || !current) { message.textContent = `Unable to find question: ${currentError?.message || 'Question not found'}`; button.disabled = false; return; }
  const { data: targetQuestions, error: targetError } = await getChapterQuestions(newChapterId, id);
  if (targetError) { message.textContent = `Unable to check question numbering: ${targetError.message}`; button.disabled = false; return; }
  const payload = { question, chapter_id: newChapterId, difficulty, display_order: targetQuestions.length + 1, hint, answer, solution, is_published };
  const { error } = await supabase.from('exercises').update(payload).eq('id', id);
  if (error) { message.textContent = `Unable to save changes: ${error.message}`; button.disabled = false; return; }
  if (current.chapter_id !== newChapterId) {
    const { error: oldChapterError } = await renumberChapter(current.chapter_id);
    if (oldChapterError) { message.textContent = `Question updated, but old chapter numbering could not be updated: ${oldChapterError.message}`; button.disabled = false; return; }
  }
  const { error: newChapterError } = await renumberChapter(newChapterId);
  if (newChapterError) { message.textContent = `Question updated, but numbering could not be updated: ${newChapterError.message}`; button.disabled = false; return; }
  message.textContent = 'Question updated successfully.';
  button.disabled = false;
}

async function loadQuestionForEdit() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  await loadChapters();
  const { data: q, error } = await supabase.from('exercises').select('question,chapter_id,difficulty,hint,answer,solution,is_published').eq('id', id).single();
  if (error || !q) {
    const message = document.getElementById('question-form-message');
    if (message) message.textContent = 'Question not found.';
    return;
  }
  document.getElementById('question-input').value = q.question ?? '';
  document.getElementById('chapter-input').value = q.chapter_id ?? '';
  document.getElementById('difficulty-input').value = q.difficulty ?? 'easy';
  document.getElementById('hint-input').value = q.hint ?? '';
  document.getElementById('answer-input').value = q.answer ?? '';
  document.getElementById('solution-input').value = q.solution ?? '';
  document.getElementById('publish-input').checked = Boolean(q.is_published);
}

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  setupEquationEditor();
  const isEditPage = Boolean(document.getElementById('save-question-button'));
  const isAddPage = Boolean(document.getElementById('add-question-button'));
  if (isEditPage) {
    await loadQuestionForEdit();
    document.getElementById('question-form')?.addEventListener('submit', editQuestion);
  } else if (isAddPage) {
    await loadChapters();
    document.getElementById('question-form')?.addEventListener('submit', addQuestion);
  } else {
    await Promise.all([loadCount('chapters', 'chapter-count'), loadCount('topics', 'topic-count'), loadCount('notes', 'note-count'), loadCount('exercises', 'exercise-count'), loadQuestions()]);
  }
  document.getElementById('logout-button')?.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '../login.html'; });
}

init();
