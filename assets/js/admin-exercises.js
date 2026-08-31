import { supabase } from './supabase.js';

const $ = s => document.querySelector(s);
const body = $('#exercises-body'), panel = $('#exercise-form-panel'), form = $('#exercise-form');
const topic = $('#topic-id'), msg = $('#admin-message'), formMsg = $('#form-message');

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href='login.html'; return false; }
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'admin') { location.href='login.html'; return false; }
  return true;
}

async function loadTopics() {
  const { data, error } = await supabase.from('topics').select('id,topic_number,title').order('id');
  if (error) { topic.innerHTML='<option value="">Unable to load topics</option>'; return; }
  topic.innerHTML='<option value="">Select a topic</option>' + (data||[]).map(t=>`<option value="${t.id}">${esc(t.topic_number)} — ${esc(t.title)}</option>`).join('');
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function reset(){form.reset();$('#exercise-id').value='';$('#form-title').textContent='Add Exercise';formMsg.textContent='';}
async function loadExercises(){
  body.innerHTML='<tr><td colspan="5">Loading...</td></tr>';
  const {data,error}=await supabase.from('exercises').select('id,title,question,difficulty,is_published,topics(topic_number,title)').order('created_at',{ascending:false});
  if(error){body.innerHTML=`<tr><td colspan="5">${esc(error.message)}</td></tr>`;return;}
  if(!data?.length){body.innerHTML='<tr><td colspan="5">No exercises yet. Click + Add Exercise.</td></tr>';return;}
  body.innerHTML=data.map(e=>`<tr><td>${esc(e.title||'Untitled')}</td><td>${esc(e.topics?.topic_number||'')} ${esc(e.topics?.title||'')}</td><td>${esc(e.difficulty||'—')}</td><td>${e.is_published?'Published':'Draft'}</td><td><button data-edit="${e.id}">Edit</button> <button data-delete="${e.id}">Delete</button></td></tr>`).join('');
}
$('#new-exercise-button').onclick=()=>{reset();panel.hidden=false;};
$('#cancel-button').onclick=()=>panel.hidden=true;
$('#logout-button').onclick=async()=>{await supabase.auth.signOut();location.href='login.html';};
form.onsubmit=async ev=>{
  ev.preventDefault(); formMsg.textContent='Saving...';
  const id=$('#exercise-id').value, marks=$('#marks').value;
  const payload={topic_id:Number(topic.value),title:$('#exercise-title').value.trim()||null,question:$('#question').value.trim(),answer:$('#answer').value.trim()||null,solution:$('#solution').value.trim()||null,difficulty:$('#difficulty').value||null,marks:marks?Number(marks):null,is_published:$('#exercise-published').checked,updated_at:new Date().toISOString()};
  if(!payload.topic_id||!payload.question){formMsg.textContent='Please select a topic and enter a question.';return;}
  const r=id?await supabase.from('exercises').update(payload).eq('id',id):await supabase.from('exercises').insert(payload);
  if(r.error){formMsg.textContent=r.error.message;return;}
  panel.hidden=true; await loadExercises();
};
body.onclick=async ev=>{
  const edit=ev.target.closest('[data-edit]'), del=ev.target.closest('[data-delete]');
  if(edit){const {data,error}=await supabase.from('exercises').select('*').eq('id',edit.dataset.edit).single();if(error){msg.textContent=error.message;return;}$('#exercise-id').value=data.id;topic.value=data.topic_id;$('#exercise-title').value=data.title||'';$('#question').value=data.question||'';$('#answer').value=data.answer||'';$('#solution').value=data.solution||'';$('#difficulty').value=data.difficulty||'';$('#marks').value=data.marks||'';$('#exercise-published').checked=!!data.is_published;$('#form-title').textContent='Edit Exercise';panel.hidden=false;}
  if(del&&confirm('Delete this exercise?')){const {error}=await supabase.from('exercises').delete().eq('id',del.dataset.delete);if(error)msg.textContent=error.message;else await loadExercises();}
};
if(await requireAdmin()){await loadTopics();await loadExercises();}
