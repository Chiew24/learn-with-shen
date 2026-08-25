const menuToggle=document.querySelector('.menu-toggle');const nav=document.querySelector('.nav');const dropdown=document.querySelector('.nav-dropdown');const dropButton=document.querySelector('.nav-drop-btn');
menuToggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',open)});
dropButton?.addEventListener('click',()=>{if(window.innerWidth<=680)dropdown.classList.toggle('open')});
document.querySelectorAll('.nav a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false')}));
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const sections=document.querySelectorAll('main section[id]');const navLinks=document.querySelectorAll('.nav > a[href^="#"]');
window.addEventListener('scroll',()=>{let current='home';sections.forEach(section=>{if(window.scrollY>=section.offsetTop-160)current=section.id});navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+current))},{passive:true});