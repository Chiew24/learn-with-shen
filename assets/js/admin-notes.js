import { supabase } from './supabase.js';

const body = document.querySelector('#notes-body');
const formPanel = document.querySelector('#note-form-panel');
const form = document.querySelector('#note-form');
const topicSelect = document.querySelector('#topic-id');
const message = document.querySelector('#admin-message');
const formMessage = document.querySelector('#form-message');
const newButton = document.querySelector('#new-note-button');
const cancelButton = document.querySelector('#cancel-button');
const logoutButton = document.querySelector('#logout-button');

let ready = false;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showMessage(text = '', type = '') {
  message.textContent = text;
  message.className = `admin-message ${type}`.trim();
}

function showFormMessage(text = '') {
  formMessage.textContent = text;
}

async function requireAdmin() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    location.href = 'login.html';
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    location.href = 'login.html';
    return false;
  }
  return true;
}

async function loadTopics() {
  topicSelect.innerHTML = '<option value="">Loading topics...</option>';

  const { data, error } = await supabase
    .from('topics')
    .select('id, topic_number, title')
    .order('chapter_id', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    topicSelect.innerHTML = '<option value="">Unable to load topics</option>';
    showMessage(`Unable to load topics: ${error.message}`);
    return false;
  }

  if (!data || data.length === 0) {
    topicSelect.innerHTML = '<option value="">No topics available</option>';
    showMessage('No topics found. Add a topic before creating a note.');
    return false;
  }

  topicSelect.innerHTML = '<option value="">Select a topic</option>' + data
    .map(t => `<option value="${t.id}">${escapeHtml(t.topic_number)} — ${escapeHtml(t.title)}</option>`)
    .join('');

  return true;
}

async function loadNotes() {
  body.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, is_published, created_at, topics(topic_number, title)')
    .order('created_at', { ascending: false });

  if (error) {
    body.innerHTML = `<tr><td colspan="4">Unable to load notes.</td></tr>`;
    showMessage(`Unable to load notes: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML = '<tr><td colspan="4">No notes yet. Click + Add Note.</td></tr>';
    return;
  }

  body.innerHTML = data.map(note => `
    <tr>
      <td>${escapeHtml(note.title)}</td>
      <td>${escapeHtml(note.topics?.topic_number || '')} ${escapeHtml(note.topics?.title || '')}</td>
      <td><span class="status-badge ${note.is_published ? 'published' : 'draft'}">${note.is_published ? 'Published' : 'Draft'}</span></td>
      <td>
        <button type="button" data-edit="${note.id}">Edit</button>
        <button type="button" data-delete="${note.id}">Delete</button>
      </td>
    </tr>`).join('');
}

function resetForm() {
  form.reset();
  document.querySelector('#note-id').value = '';
  document.querySelector('#form-title').textContent = 'Add Note';
  showFormMessage('');
}

newButton.addEventListener('click', async () => {
  if (!ready) return;
  resetForm();
  const hasTopics = await loadTopics();
  if (hasTopics) formPanel.hidden = false;
});

cancelButton.addEventListener('click', () => {
  formPanel.hidden = true;
  showFormMessage('');
});

logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'login.html';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  showFormMessage('Saving...');

  const id = document.querySelector('#note-id').value;
  const topicId = Number(topicSelect.value);
  const title = document.querySelector('#note-title').value.trim();
  const content = document.querySelector('#note-content').value;
  const isPublished = document.querySelector('#note-published').checked;

  if (!topicId || !title) {
    showFormMessage('Please select a topic and enter a title.');
    return;
  }

  const payload = {
    topic_id: topicId,
    title,
    content,
    is_published: isPublished,
    updated_at: new Date().toISOString()
  };

  const result = id
    ? await supabase.from('notes').update(payload).eq('id', id)
    : await supabase.from('notes').insert(payload);

  if (result.error) {
    showFormMessage(`Save failed: ${result.error.message}`);
    return;
  }

  formPanel.hidden = true;
  showFormMessage('');
  showMessage(id ? 'Note updated successfully.' : 'Note added successfully.');
  await loadNotes();
});

body.addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');

  if (editButton) {
    showMessage('');
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', editButton.dataset.edit)
      .single();

    if (error) {
      showMessage(`Unable to open note: ${error.message}`);
      return;
    }

    await loadTopics();
    document.querySelector('#note-id').value = data.id;
    topicSelect.value = String(data.topic_id);
    document.querySelector('#note-title').value = data.title || '';
    document.querySelector('#note-content').value = data.content || '';
    document.querySelector('#note-published').checked = Boolean(data.is_published);
    document.querySelector('#form-title').textContent = 'Edit Note';
    showFormMessage('');
    formPanel.hidden = false;
  }

  if (deleteButton) {
    const confirmed = window.confirm('Delete this note? This action cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', deleteButton.dataset.delete);

    if (error) {
      showMessage(`Delete failed: ${error.message}`);
      return;
    }

    showMessage('Note deleted successfully.');
    await loadNotes();
  }
});

if (await requireAdmin()) {
  ready = true;
  await loadNotes();
}
