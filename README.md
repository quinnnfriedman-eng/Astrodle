# 🚀 Astrodle

A Spotle-style astronaut guessing game.

## Upload
Upload **all of these items** to the root of the GitHub repository:

- `index.html`
- `style.css`
- `app.js`
- `astronauts.json`
- `update_astronauts.py`
- the `.github/workflows/update-astronauts.yml` folder and file

The included local JSON loads immediately, so the site does not depend on a browser request to another website.

## Modes
- Daily: same astronaut each UTC day
- Random: new astronaut on refresh
- Practice: unlimited rounds

## Updating the full current list
Open the repository's **Actions** tab, choose **Update astronaut database**, and press **Run workflow**. The workflow downloads Jonathan McDowell's maintained space-traveler and ride files and replaces `astronauts.json`. It also checks weekly.
