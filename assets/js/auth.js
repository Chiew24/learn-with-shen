import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nm_yR17n62hn1_dqLb8BQ_vCiZkZ-2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const button = document.getElementById('login-button');
const message = document.getElementById('login-message');

async function redirectIfAlreadyLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.role === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else {
    await supabase.auth.signOut();
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    message.textContent = 'Please enter your email and password.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Signing in...';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    message.textContent = error.message || 'Unable to sign in. Please check your details.';
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut();
    message.textContent = 'This account does not have admin access.';
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  window.location.href = 'admin-dashboard.html';
});

redirectIfAlreadyLoggedIn();
