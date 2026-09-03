import { supabase } from './supabase.js';

const $ = s => document.querySelector(s);
const body = $('#exercises-body'), panel = $('#exercise-form-panel'), form = $('#exercise-form');
const chapter = $('#chapter-id'), msg = $('#admin-message'), formMsg = $('#form-message');

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href='login.html'; return false; }
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'admin') { location.href='login.html'; return false; }
  return true;
}

async function loadChapters() {
  const { data, error } = await supabase.from('chapters').select('id,form,chapter_number,title').order('form').order('chapter_number');
  if (error) { chapter.innerHTML='<option value="">Unable to load chapters</option>'; return; }
  chapter.innerHTML='<option value="">Select a chapter</option>' + (data||[]).map(c=>`<option value="${c.id}">Form ${c.form} — Chapter ${c.chapter_number} — ${esc(c.title)}</option>`).join('');
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function reset(){form.reset();$('#exercise-id').value='';$('#exercise-published').value='false';$('#form-title').textContent='Add Question';formMsg.textContent='';}
async function loadExercises(){
  body.innerHTML='<tr><td colspan="5">Loading...</td></tr>';
  const {data,error}=await supabase.from('exercises').select('id,title,question,difficulty,is_published,chapter_id,chapters(form,chapter_number,title)').order('created_at',{ascending:false});
  if(error){body.innerHTML=`<tr><td colspan="5">${esc(error.message)}</td></tr>`;return;}
  if(!data?.length){body.innerHTML='<tr><td colspan="5">No questions yet. Click + Add Question.</td></tr>';return;}
  body.innerHTML=data.map(e=>`<tr><td>${esc(e.title||'Untitled')}</td><td>Form ${esc(e.chapters?.form||'')} — Chapter ${esc(e.chapters?.chapter_number||'')} — ${esc(e.chapters?.title||'')}</td><td>${esc(e.difficulty||'—')}</td><td>${e.is_published?'Published':'Draft'}</td><td><button data-edit="${e.id}">Edit</button> <button data-delete="${e.id}">Delete</button></td></tr>`).join('');
}
$('#new-exercise-button').onclick=()=>{reset();panel.hidden=false;};
$('#cancel-button').onclick=()=>panel.hidden=true;
$('#logout-button').onclick=async()=>{await supabase.auth.signOut();location.href='login.html';};
form.onsubmit=async ev=>{
  ev.preventDefault();
  const submitter=ev.submitter;
  const published=submitter?.dataset.published==='true';
  $('#exercise-published').value=published?'true':'false';
  formMsg.textContent=published?'Publishing...':'Saving draft...';
  const id=$('#exercise-id').value, chapterId=Number(chapter.value);
  const {data: firstTopic}=await supabase.from('topics').select('id').eq('chapter_id',chapterId).order('display_order').limit(1).maybeSingle();
  const payload={chapter_id:chapterId,topic_id:firstTopic?.id||null,title:$('#exercise-title').value.trim()||null,question:$('#question').value.trim(),answer:$('#answer').value.trim()||null,solution:$('#solution').value.trim()||null,difficulty:$('#difficulty').value||null,is_published:published,updated_at:new Date().toISOString()};
  if(!payload.chapter_id||!payload.question){formMsg.textContent='Please select a chapter and enter a question.';return;}
  const r=id?await supabase.from('exercises').update(payload).eq('id',id):await supabase.from('exercises').insert(payload);
  if(r.error){formMsg.textContent=r.error.message;return;}
  formMsg.textContent=published?'Published successfully.':'Draft saved successfully.';
  panel.hidden=true; await loadExercises();
};
body.onclick=async ev=>{
  const edit=ev.target.closest('[data-edit]'), del=ev.target.closest('[data-delete]');
  if(edit){const {data,error}=await supabase.from('exercises').select('*').eq('id',edit.dataset.edit).single();if(error){msg.textContent=error.message;return;}let chapterId=data.chapter_id;if(!chapterId&&data.topic_id){const {data:t}=await supabase.from('topics').select('chapter_id').eq('id',data.topic_id).single();chapterId=t?.chapter_id;}$('#exercise-id').value=data.id;chapter.value=chapterId||'';$('#exercise-title').value=data.title||'';$('#question').value=data.question||'';$('#answer').value=data.answer||'';$('#solution').value=data.solution||'';$('#difficulty').value=data.difficulty||'';$('#exercise-published').value=String(!!data.is_published);$('#form-title').textContent='Edit Question';panel.hidden=false;}
  if(del&&confirm('Delete this question?')){const {error}=await supabase.from('exercises').delete().eq('id',del.dataset.delete);if(error)msg.textContent=error.message;else await loadExercises();}
};
if(await requireAdmin()){await loadChapters();await loadExercises();}
