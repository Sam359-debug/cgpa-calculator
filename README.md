# CGPA Calculator

A modern, responsive CGPA calculator built with HTML, CSS, and JavaScript. The interface uses a clean Apple-inspired visual style with soft panels, large typography, and live academic planning tools.

## Features

- Live CGPA calculation from semester SGPA and credits
- Add and remove semester rows
- Supports 10-point and 4-point grading scales
- Automatic weighted points and total credits
- Target planner for required next-semester SGPA
- Sample data and clear-all actions
- Responsive layout for desktop, tablet, and mobile
- No build step, dependencies, or framework required

## Preview

Open `index.html` in a browser to use the calculator.

## Project Structure

```text
.
├── .gitignore
├── index.html
├── script.js
├── styles.css
└── README.md
```

## Getting Started

Clone the repository:

```bash
git clone https://github.com/Sam359-debug/cgpa-calculator.git
cd cgpa-calculator
```

Open the app directly:

```bash
open index.html
```

Or run a local server:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## How CGPA Is Calculated

The calculator uses weighted average logic:

```text
CGPA = sum(SGPA x credits) / sum(credits)
```

The target planner estimates the SGPA needed in the next semester to reach a chosen target CGPA.

## Deployment

This project can be deployed with GitHub Pages:

1. Push the project to GitHub.
2. Open the repository settings.
3. Go to `Pages`.
4. Set the source to the main branch.
5. Save and open the generated GitHub Pages URL.

## Technologies Used

- HTML5
- CSS3
- JavaScript

## License

No license has been selected yet. Add a `LICENSE` file before accepting external contributions.
