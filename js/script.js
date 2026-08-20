const menu = document.getElementById('menu') || document.getElementById('menuToggle');
const nav = document.getElementById('nav') || document.getElementById('navMenu');

if (menu && nav) {
  menu.addEventListener('click', () => nav.classList.toggle('open'));
}

// Make the Learn dropdown work consistently on every page.
document.querySelectorAll('.drop, .dropdown').forEach(dropdown => {
  const trigger = dropdown.querySelector(':scope > a');
  const submenu = dropdown.querySelector(':scope > div');

  if (trigger && submenu) {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      dropdown.classList.toggle('open');
    });

    dropdown.addEventListener('mouseleave', () => {
      dropdown.classList.remove('open');
    });
  }
});

document.querySelectorAll('.sidebar a, .sidebar-link').forEach(link => {
  link.addEventListener('click', () => nav?.classList.remove('open'));
});

const css = `
/* Navigation dropdown fix */
.drop, .dropdown {
  position: relative;
}

.drop > div, .dropdown > .dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  min-width: 150px;
  padding: 8px;
  background: #fffdf8;
  border: 1px solid #ded5c5;
  border-radius: 12px;
  box-shadow: 0 12px 35px rgba(50,40,25,.12);
  display: none !important;
}

.drop:hover > div,
.drop.open > div,
.dropdown:hover > .dropdown-menu,
.dropdown.open > .dropdown-menu {
  display: block !important;
}

.drop > div a,
.dropdown > .dropdown-menu a {
  display: block !important;
  padding: 9px 12px !important;
  border-radius: 7px;
  white-space: nowrap;
  font-size: .88rem;
  color: #68665d;
}

.drop > div a:hover,
.dropdown > .dropdown-menu a:hover {
  background: #eee6d7;
  color: #51422f;
}

@media (max-width: 800px) {
  .drop > div, .dropdown > .dropdown-menu {
    position: static;
    transform: none;
    min-width: 0;
    border: 0;
    box-shadow: none;
    background: transparent;
    padding: 4px 0 4px 12px;
  }

  .drop.open > div,
  .dropdown.open > .dropdown-menu {
    display: block !important;
  }
}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
