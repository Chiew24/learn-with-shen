import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (error || profile?.role !== 'admin') { await supabase.auth.signOut(); window.location.href = 'login.html'; return null; }
  return session;
}

async function loadCount(table, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  element.textContent = error ? '—' : String(count ?? 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function truncateQuestion(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

async function loadTopics(selectId = 'topic-input') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const { data, error } = await supabase.from('topics').select('id,title,chapter_id').order('chapter_id').order('display_order', { ascending: true, nullsFirst: false });
  if (error) { select.innerHTML = '<option value="">Unable to load topics</option>'; return; }
  if (!data?.length) { select.innerHTML = '<option value="">No topics found</option>'; return; }
  select.innerHTML = '<option value="">Select a topic</option>' + data.map(topic => `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.title)}</option>`).join('');
}

async function loadQuestions() {
  const body = document.getElementById('question-bank-body');
  const message = document.getElementById('admin-message');
  if (!body) return;
  const { data: questions, error } = await supabase.from('exercises').select('id, question, difficulty, answer, solution, display_order, created_at').order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  if (error) { body.innerHTML = `<tr><td colspan="6" class="question-bank-empty">Unable to load questions.</td></tr>`; if (message) message.textContent = error.message; return; }
  if (!questions?.length) { body.innerHTML = '<tr><td colspan="6" class="question-bank-empty">No questions found.</td></tr>'; return; }
  body.innerHTML = questions.map((q, index) => `<tr><td>${escapeHtml(q.display_order ?? index + 1)}</td><td class="question-bank-question">${escapeHtml(truncateQuestion(q.question))}</td><td>${q.difficulty ? escapeHtml(q.difficulty) : '—'}</td><td class="question-bank-answer">${q.answer ? escapeHtml(truncateQuestion(q.answer, 80)) : '—'}</td><td class="question-bank-solution">${q.solution ? escapeHtml(truncateQuestion(q.solution, 80)) : '—'}</td><td class="question-bank-actions-cell"><a class="edit-question-link" href="edit-question.html?id=${encodeURIComponent(q.id)}">Edit</a><button class="delete-question-button" type="button" data-question-id="${escapeHtml(q.id)}">Delete</button></td></tr>`).join('');
  body.querySelectorAll('.delete-question-button').forEach(button => button.addEventListener('click', () => deleteQuestion(button.dataset.questionId)));
}

async function deleteQuestion(id) {
  if (!id) return;
  const confirmed = window.confirm('Delete this question? This action cannot be undone.');
  if (!confirmed) return;
  const message = document.getElementById('admin-message');
  if (message) message.textContent = 'Deleting question...';
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) { if (message) message.textContent = `Unable to delete question: ${error.message}`; return; }
  if (message) message.textContent = 'Question deleted.';
  await loadQuestions();
  await loadCount('exercises', 'exercise-count');
}

async function addQuestion(event) {
  event.preventDefault();
  const form = document.getElementById('question-form');
  const button = document.getElementById('add-question-button');
  const message = document.getElementById('question-form-message');
  if (!form || !button || !message) return;
  const question = document.getElementById('question-input')?.value.trim();
  const topic_id = document.getElementById('topic-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const marksValue = document.getElementById('marks-input')?.value;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;
  if (!question || !topic_id) { message.textContent = 'Please enter a question and select a topic.'; return; }
  button.disabled = true;
  message.textContent = 'Adding question...';
  const { error } = await supabase.from('exercises').insert({ question, topic_id, difficulty, marks: marksValue === '' ? null : Number(marksValue), hint, answer, solution, is_published });
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
  const topic_id = document.getElementById('topic-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const marksValue = document.getElementById('marks-input')?.value;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;
  if (!question || !topic_id) { message.textContent = 'Please enter a question and select a topic.'; return; }
  button.disabled = true;
  message.textContent = 'Saving changes...';
  const { error } = await supabase.from('exercises').update({ question, topic_id, difficulty, marks: marksValue === '' ? null : Number(marksValue), hint, answer, solution, is_published }).eq('id', id);
  if (error) { message.textContent = `Unable to save changes: ${error.message}`; button.disabled = false; return; }
  message.textContent = 'Question updated successfully.';
  button.disabled = false;
}

async function loadQuestionForEdit() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  const { data: q, error } = await supabase.from('exercises').select('question,topic_id,difficulty,marks,hint,answer,solution,is_published').eq('id', id).single();
  if (error || !q) {
    const message = document.getElementById('question-form-message');
    if (message) message.textContent = 'Question not found.';
    return;
  }
  await loadTopics();
  document.getElementById('question-input').value = q.question ?? '';
  document.getElementById('topic-input').value = q.topic_id ?? '';
  document.getElementById('difficulty-input').value = q.difficulty ?? 'easy';
  document.getElementById('marks-input').value = q.marks ?? '';
  document.getElementById('hint-input').value = q.hint ?? '';
  document.getElementById('answer-input').value = q.answer ?? '';
  document.getElementById('solution-input').value = q.solution ?? '';
  document.getElementById('publish-input').checked = Boolean(q.is_published);
}

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  const isEditPage = Boolean(document.getElementById('save-question-button'));
  const isAddPage = Boolean(document.getElementById('add-question-button'));
  if (isEditPage) {
    await loadQuestionForEdit();
    document.getElementById('question-form')?.addEventListener('submit', editQuestion);
  } else if (isAddPage) {
    await loadTopics();
    document.getElementById('question-form')?.addEventListener('submit', addQuestion);
  } else {
    await Promise.all([loadCount('chapters', 'chapter-count'), loadCount('topics', 'topic-count'), loadCount('notes', 'note-count'), loadCount('exercises', 'exercise-count'), loadQuestions()]);
  }
  document.getElementById('logout-button')?.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; });
}

init();
