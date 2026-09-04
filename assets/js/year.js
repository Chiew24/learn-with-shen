import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabaseYear = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const yearInput = () => document.getElementById('year-input');

async function loadYearForEdit() {
  const id = new URLSearchParams(window.location.search).get('id');
  const input = yearInput();
  if (!id || !input) return;
  const { data, error } = await supabaseYear.from('exercises').select('year').eq('id', id).single();
  if (!error && data) input.value = data.year ?? '';
}

async function saveAdd(event) {
  const form = document.getElementById('question-form');
  const addButton = document.getElementById('add-question-button');
  if (!form || !addButton || !event.target || event.target !== form) return;

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

  if (!question || !chapter_id) {
    if (message) message.textContent = 'Please enter a question and select a chapter.';
    return;
  }
  if (yearValue && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    if (message) message.textContent = 'Please enter a valid year.';
    return;
  }

  addButton.disabled = true;
  if (message) message.textContent = 'Adding question...';

  const { count, error: countError } = await supabaseYear
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', chapter_id);

  if (countError) {
    if (message) message.textContent = `Unable to check question numbering: ${countError.message}`;
    addButton.disabled = false;
    return;
  }

  const payload = { question, chapter_id, difficulty, year, display_order: (count ?? 0) + 1, hint, answer, solution, is_published };
  const { error } = await supabaseYear.from('exercises').insert(payload);

  if (error) {
    if (message) message.textContent = `Unable to add question: ${error.message}`;
    addButton.disabled = false;
    return;
  }

  form.reset();
  if (message) message.textContent = is_published ? 'Question added and published.' : 'Question added as draft.';
  addButton.disabled = false;
}

async function saveEdit(event) {
  const form = document.getElementById('question-form');
  const saveButton = document.getElementById('save-question-button');
  const id = new URLSearchParams(window.location.search).get('id');
  if (!form || !saveButton || !id || event.target !== form) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const message = document.getElementById('question-form-message');
  const question = document.getElementById('question-input')?.value.trim();
  const newChapterId = document.getElementById('chapter-input')?.value;
  const difficulty = document.getElementById('difficulty-input')?.value || null;
  const yearValue = yearInput()?.value.trim();
  const year = yearValue ? Number(yearValue) : null;
  const hint = document.getElementById('hint-input')?.value.trim() || null;
  const answer = document.getElementById('answer-input')?.value.trim() || null;
  const solution = document.getElementById('solution-input')?.value.trim() || null;
  const is_published = document.getElementById('publish-input')?.checked ?? false;

  if (!question || !newChapterId) {
    if (message) message.textContent = 'Please enter a question and select a chapter.';
    return;
  }
  if (yearValue && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    if (message) message.textContent = 'Please enter a valid year.';
    return;
  }

  saveButton.disabled = true;
  if (message) message.textContent = 'Saving changes...';

  const { error } = await supabaseYear.from('exercises').update({ question, chapter_id: newChapterId, difficulty, year, hint, answer, solution, is_published }).eq('id', id);

  if (error) {
    if (message) message.textContent = `Unable to save changes: ${error.message}`;
    saveButton.disabled = false;
    return;
  }

  if (message) message.textContent = 'Question updated successfully.';
  saveButton.disabled = false;
}

async function initYear() {
  const form = document.getElementById('question-form');
  if (!form) return;

  const isEdit = Boolean(document.getElementById('save-question-button'));
  const isAdd = Boolean(document.getElementById('add-question-button'));

  if (isEdit) await loadYearForEdit();

  form.addEventListener('submit', isEdit ? saveEdit : saveAdd, true);
}

document.addEventListener('DOMContentLoaded', initYear);
