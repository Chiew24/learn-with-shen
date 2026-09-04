import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabaseYear = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const yearInput = () => document.getElementById('year-input');

function escapeYearHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]));
}

function chapterYearLabel(chapter) {
  return `Form ${chapter.form} · Chapter ${chapter.chapter_number} — ${chapter.title}`;
}

function difficultyLabel(value) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

async function saveAdd(event) {
  const form = document.getElementById('question-form');
  const addButton = document.getElementById('add-question-button');
  if (!form || !addButton || event.target !== form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const message = document.getElementById('question-form-message');
  const question = document.getElementById('question-input')?.value.trim();
  const chapter_id = document.getElementById('chapter-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const yearValue = yearInput()?.value.trim();
  const year = yearValue ? Number(yearValue) : null;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;
  if (!question || !chapter_id) { if (message) message.textContent = 'Please enter a question and select a chapter.'; return; }
  if (yearValue && (!Number.isInteger(year) || year < 1900 || year > 2100)) { if (message) message.textContent = 'Please enter a valid year.'; return; }
  addButton.disabled = true;
  if (message) message.textContent = 'Adding question...';
  const { count, error: countError } = await supabaseYear.from('exercises').select('*', { count: 'exact', head: true }).eq('chapter_id', chapter_id);
  if (countError) { if (message) message.textContent = `Unable to check question numbering: ${countError.message}`; addButton.disabled = false; return; }
  const payload = { question, chapter_id, difficulty, year, display_order: (count ?? 0) + 1, hint, answer, solution, is_published };
  const { error } = await supabaseYear.from('exercises').insert(payload);
  if (error) { if (message) message.textContent = `Unable to add question: ${error.message}`; addButton.disabled = false; return; }
  form.reset();
  if (message) message.textContent = is_published ? 'Question added and published.' : 'Question added as draft.';
  addButton.disabled = false;
}

async function deleteQuestionWithYear(id) {
  if (!id) return;
  if (!window.confirm('Delete this question?')) return;
  const message = document.getElementById('admin-message');
  if (message) message.textContent = 'Deleting question...';
  const { data: question, error: fetchError } = await supabaseYear.from('exercises').select('chapter_id').eq('id', id).single();
  if (fetchError || !question) { if (message) message.textContent = 'Unable to find question.'; return; }
  const { error } = await supabaseYear.from('exercises').delete().eq('id', id);
  if (error) { if (message) message.textContent = `Unable to delete question: ${error.message}`; return; }
  const { data: remaining } = await supabaseYear.from('exercises').select('id').eq('chapter_id', question.chapter_id).order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  for (let i = 0; i < (remaining || []).length; i += 1) await supabaseYear.from('exercises').update({ display_order: i + 1 }).eq('id', remaining[i].id);
  if (message) message.textContent = 'Question deleted.';
  await loadQuestionBankWithYear();
}

async function loadQuestionBankWithYear() {
  const body = document.getElementById('question-bank-body');
  if (!body) return;
  const { data: questions, error } = await supabaseYear.from('exercises').select('id,question,difficulty,display_order,is_published,chapter_id,year,created_at,chapters(form,chapter_number,title)').order('chapter_id').order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
  if (error) { body.innerHTML = '<tr><td colspan="7">Unable to load questions.</td></tr>'; return; }
  if (!questions?.length) { body.innerHTML = '<tr><td colspan="7">No questions found.</td></tr>'; return; }
  body.innerHTML = questions.map(q => {
    const chapter = Array.isArray(q.chapters) ? q.chapters[0] : q.chapters;
    const chapterText = chapter ? chapterYearLabel(chapter) : '—';
    const status = q.is_published ? '<span class="status-badge status-published">Published</span>' : '<span class="status-badge status-draft">Draft</span>';
    return `<tr><td>${escapeYearHtml(q.display_order ?? '—')}</td><td>${escapeYearHtml(chapterText)}</td><td>${escapeYearHtml(q.year ?? '—')}</td><td class="question-bank-question">${escapeYearHtml(q.question ?? '')}</td><td>${escapeYearHtml(difficultyLabel(q.difficulty))}</td><td>${status}</td><td class="question-bank-actions-cell"><a class="edit-question-link" href="edit-question.html?id=${encodeURIComponent(q.id)}">Edit</a><button class="delete-question-button" type="button" data-question-id="${escapeYearHtml(q.id)}">Delete</button></td></tr>`;
  }).join('');
  body.querySelectorAll('.delete-question-button').forEach(button => button.addEventListener('click', () => deleteQuestionWithYear(button.dataset.questionId)));
  if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([body]).catch(() => {});
}

async function initYear() {
  const form = document.getElementById('question-form');
  if (form) {
    const isAdd = Boolean(document.getElementById('add-question-button'));
    if (isAdd) form.addEventListener('submit', saveAdd, true);
  }
  if (document.getElementById('question-bank-body')) await loadQuestionBankWithYear();
}

document.addEventListener('DOMContentLoaded', initYear);
