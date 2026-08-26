const menuToggle=document.querySelector('.menu-toggle')||document.querySelector('.navbar .menu');
const nav=document.querySelector('.nav')||document.querySelector('.navbar nav');
const dropdown=document.querySelector('.nav-dropdown')||document.querySelector('.navbar .drop');
const dropButton=document.querySelector('.nav-drop-btn')||document.querySelector('.navbar .drop>a');

menuToggle?.addEventListener('click',()=>{
  const open=nav?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded',open?'true':'false');
});

dropButton?.addEventListener('click',(event)=>{
  // "Learn" is a dropdown control, not a page link.
  event.preventDefault();
  if(window.innerWidth<=800) dropdown?.classList.toggle('open');
});

document.querySelectorAll('.nav a, .navbar nav a').forEach(link=>link.addEventListener('click',()=>{
  if(link.closest('.drop')||link.closest('.nav-dropdown')) return;
  nav?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded','false');
}));

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
  });
},{threshold:.12});

document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

const sections=document.querySelectorAll('main section[id]');
const navLinks=document.querySelectorAll('.nav > a[href^="#"]');
window.addEventListener('scroll',()=>{
  let current='home';
  sections.forEach(section=>{if(window.scrollY>=section.offsetTop-160)current=section.id});
  navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+current));
},{passive:true});