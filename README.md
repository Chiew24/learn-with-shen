# Learn with Shen

SPM Additional Mathematics learning website.

## Repository Structure

```text
learn-with-shen/
├── index.html                  # Home page
├── form4.html                  # Form 4 chapters
├── form5.html                  # Form 5 chapters
├── question-bank.html          # Main Question Bank entry
├── about.html                  # About page
├── login.html                  # Admin login
│
├── admin/                      # Admin pages
│   ├── index.html              # Admin dashboard
│   ├── chapters.html           # Manage chapters
│   ├── notes.html              # Manage notes
│   └── question-bank.html      # Manage Question Bank
│
├── content/                    # Learning content
│   └── form4/
│       └── chapter1/           # Form 4 Chapter 1
│           ├── chapter1-functions.html
│           ├── chapter1-1-functions.html
│           ├── chapter1-1-functions-notes.html
│           ├── chapter1-1-functions-exercise.html
│           ├── chapter1-2-composite-functions.html
│           ├── chapter1-2-composite-functions-notes.html
│           ├── chapter1-2-composite-functions-exercise.html
│           ├── chapter1-3-inverse-functions.html
│           ├── chapter1-3-inverse-functions-notes.html
│           ├── chapter1-3-inverse-functions-exercise.html
│           ├── question-bank.html
│           └── question.html
│
└── assets/
    ├── css/                    # Stylesheets
    ├── js/                     # JavaScript
    └── images/                 # Images and logo
```

## Content Organization

- **Admin** contains pages used to manage website content.
- **Content** contains student-facing learning pages, organized by Form and Chapter.
- **Assets** contains shared CSS, JavaScript, and images.
- **Root HTML files** contain the main public navigation pages.

## Question Bank

Questions are managed through the Admin Question Bank and stored in the connected database. The student-facing Chapter 1 Question Bank links to individual Question Pages, where the full question, answer, and step-by-step solution can be displayed.

## Current Chapter Structure

**Form 4 — Chapter 1: Functions**

- 1.1 Functions
  - Notes
  - Exercise
- 1.2 Composite Functions
  - Notes
  - Exercise
- 1.3 Inverse Functions
  - Notes
  - Exercise
- Question Bank
- Individual Question Page

## Development Notes

Keep shared styles in `assets/css/` and shared scripts in `assets/js/`. Keep new learning content inside the appropriate `content/formX/chapterY/` folder so the repository remains easy to maintain as more chapters are added.
