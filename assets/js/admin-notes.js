import { supabase } from './supabase.js';

const body = document.querySelector('#notes-body');
const formPanel = document.querySelector('#note-form-panel');
const form = document.querySelector('#note-form');
const topicSelect = document.querySelector('#topic-id');
const message = document.querySelector('#admin-message');
const formMessage = document.querySelector('#form-message');

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; return false; }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') { location.href = 'login.html'; return false; }
  return true;
}

async function loadTopics() {
  const { data, error } = await supabase.from('topics').select('id, topic_number, title, chapters(title)').order('id');
  if (error) { topicSelect.innerHTML = '<option value="">Unable to load topics</option>'; return; }
  topicSelect.innerHTML = '<option value="">Select a topic</option>' + data.map(t => `<option value="${t.id}">${t.topic_number} — ${t.title}</option>`).join('');
}

async function loadNotes() {
  body.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  const { data, error } = await supabase.from('notes').select('id,title,is_published,topics(topic_number,title)').order('created_at', { ascending: false });
  if (error) { body.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`; return; }
  if (!data.length) { body.innerHTML = '<tr><td colspan="4">No notes yet. Click + Add Note.</td></tr>'; return; }
  body.innerHTML = data.map(n => `<tr><td>${escapeHtml(n.title)}</td><td>${escapeHtml(n.topics?.topic_number || '')} ${escapeHtml(n.topics?.title || '')}</td><td>${n.is_published ? 'Published' : 'Draft'}</td><td><button data-edit="${n.id}">Edit</button> <button data-delete="${n.id}">Delete</button></td></tr>`).join('');
}

function escapeHtml(value='') { return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function resetForm() { form.reset(); document.querySelector('#note-id').value=''; document.querySelector('#form-title').textContent='Add Note'; formMessage.textContent=''; }

document.querySelector('#new-note-button').addEventListener('click', () => { resetForm(); formPanel.hidden=false; });
document.querySelector('#cancel-button').addEventListener('click', () => { formPanel.hidden=true; });

document.querySelector('#logout-button').addEventListener('click', async () => { await supabase.auth.signOut(); location.href='login.html'; });

form.addEventListener('submit', async e => {
  e.preventDefault(); formMessage.textContent='Saving...';
  const id = document.querySelector('#note-id').value;
  const payload = { topic_id: Number(topicSelect.value), title: document.querySelector('#note-title').value.trim(), content: document.querySelector('#note-content').value, is_published: document.querySelector('#note-published').checked, updated_at: new Date().toISOString() };
  if (!payload.topic_id || !payload.title) { formMessage.textContent='Please complete the required fields.'; return; }
  const result = id ? await supabase.from('notes').update(payload).eq('id', id) : await supabase.from('notes').insert(payload);
  if (result.error) { formMessage.textContent=result.error.message; return; }
  formMessage.textContent='Saved.'; formPanel.hidden=true; await loadNotes();
});

body.addEventListener('click', async e => {
  const edit = e.target.closest('[data-edit]'); const del = e.target.closest('[data-delete]');
  if (edit) {
    const { data, error } = await supabase.from('notes').select('*').eq('id', edit.dataset.edit).single();
    if (error) { message.textContent=error.message; return; }
    document.querySelector('#note-id').value=data.id; topicSelect.value=data.topic_id; document.querySelector('#note-title').value=data.title; document.querySelector('#note-content').value=data.content || ''; document.querySelector('#note-published').checked=data.is_published; document.querySelector('#form-title').textContent='Edit Note'; formPanel.hidden=false;
  }
  if (del && confirm('Delete this note?')) { const { error }=await supabase.from('notes').delete().eq('id', del.dataset.delete); if(error) message.textContent=error.message; else await loadNotes(); }
});

if (await requireAdmin()) { await loadTopics(); await loadNotes(); }
