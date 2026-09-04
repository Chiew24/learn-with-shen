import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  return session;
}

async function loadCount(table, elementId) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  const element = document.getElementById(elementId);
  if (element) element.textContent = error ? '—' : String(count ?? 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function truncateQuestion(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

async function loadQuestions() {
  const body = document.getElementById('question-bank-body');
  const message = document.getElementById('admin-message');
  if (!body) return;

  const { data: questions, error } = await supabase
    .from('exercises')
    .select('id, question, difficulty, answer, solution, display_order, created_at')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    body.innerHTML = `<tr><td colspan="5" class="question-bank-empty">Unable to load questions.</td></tr>`;
    if (message) message.textContent = error.message;
    return;
  }

  if (!questions?.length) {
    body.innerHTML = '<tr><td colspan="5" class="question-bank-empty">No questions found.</td></tr>';
    return;
  }

  body.innerHTML = questions.map((q, index) => `
    <tr>
      <td>${escapeHtml(q.display_order ?? index + 1)}</td>
      <td class="question-bank-question">${escapeHtml(truncateQuestion(q.question))}</td>
      <td>${q.difficulty ? escapeHtml(q.difficulty) : '—'}</td>
      <td>${q.answer ? escapeHtml(truncateQuestion(q.answer, 80)) : '—'}</td>
      <td>${q.solution ? escapeHtml(truncateQuestion(q.solution, 80)) : '—'}</td>
    </tr>
  `).join('');
}

async function init() {
  const session = await requireAdmin();
  if (!session) return;

  await Promise.all([
    loadCount('chapters', 'chapter-count'),
    loadCount('topics', 'topic-count'),
    loadCount('notes', 'note-count'),
    loadCount('exercises', 'exercise-count'),
    loadQuestions()
  ]);

  document.getElementById('logout-button')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
}

init();
