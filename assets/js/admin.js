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

async function init() {
  const session = await requireAdmin();
  if (!session) return;

  await Promise.all([
    loadCount('chapters', 'chapter-count'),
    loadCount('topics', 'topic-count'),
    loadCount('notes', 'note-count'),
    loadCount('exercises', 'exercise-count')
  ]);

  document.getElementById('logout-button')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
}

init();
