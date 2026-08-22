# install-todo-skill.ps1
# This script installs the Vibe Todos Antigravity integration skill locally.

$supabaseUrl = Read-Host "Enter your Supabase URL [default: https://gbdwswfrscjccaaeciiu.supabase.co]"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    $supabaseUrl = "https://gbdwswfrscjccaaeciiu.supabase.co"
}

$supabaseKey = Read-Host "Enter your Supabase Anon Key [default: sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr]"
if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
    $supabaseKey = "sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr"
}

$configDir = "$env:USERPROFILE\.gemini\config"
$skillsDir = "$configDir\skills\todo"
$scriptsDir = "$configDir\scripts"

# Create folders if not exist
New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null

Write-Host "Creating SKILL.md..." -ForegroundColor Cyan
$skillMdContent = @"
---
name: todo
description: Interact with your Vibe Todos database (add tasks, check your list)
---

# Vibe Todos Integration

When the user activates this skill, they want to interact with their Vibe Todos app.

You MUST do the following:

1. **Check the Todo List**: 
   Immediately run this node script to read their live database:
   ```bash
   node C:\Users\$env:USERNAME\.gemini\config\scripts\read-todos.js
   ```
2. **Analyze the Input**:
   - Tell them you've checked their list, summarize what's on it (e.g. "You have 3 tasks in Gym, 1 in General").
   - Explicitly ask them: "Which category do you want to add a task to, or are you just checking the list?"
   - If they tell you to add a task, run the add script:
     ```bash
     node C:\Users\$env:USERNAME\.gemini\config\scripts\vibe-todo.js "[category]" "[task]"
     ```
     And confirm it was added.

Do NOT ask for permission to run these node scripts. Just run them!
"@
$skillMdContent | Out-File -FilePath "$skillsDir\SKILL.md" -Encoding utf8

Write-Host "Creating read-todos.js..." -ForegroundColor Cyan
$readTodosJsContent = @'
const supabaseUrl = 'YOUR_URL_HERE';
const supabaseAnonKey = 'YOUR_KEY_HERE';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  try {
    const [resCat, resTodo] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/categories`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/todos?completed=eq.false`, { headers })
    ]);
    
    const categories = await resCat.json();
    const todos = await resTodo.json();
    
    console.log(JSON.stringify({ categories, todos }, null, 2));
  } catch (err) {
    console.error('Error fetching list:', err.message);
  }
}

run();
'@ -replace 'YOUR_URL_HERE', $supabaseUrl -replace 'YOUR_KEY_HERE', $supabaseKey
$readTodosJsContent | Out-File -FilePath "$scriptsDir\read-todos.js" -Encoding utf8

Write-Host "Creating vibe-todo.js..." -ForegroundColor Cyan
$vibeTodoJsContent = @'
const supabaseUrl = 'YOUR_URL_HERE';
const supabaseAnonKey = 'YOUR_KEY_HERE';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node vibe-todo.js <categoryName> <taskText>');
    process.exit(1);
  }

  const categoryName = args[0];
  const text = args.slice(1).join(' ');

  try {
    // Find category
    const resCat = await fetch(`${supabaseUrl}/rest/v1/categories?name=ilike.${encodeURIComponent(categoryName)}`, { headers });
    const categories = await resCat.json();
    let categoryId = categories && categories.length > 0 ? categories[0].id : null;

    if (!categoryId) {
      categoryId = Date.now().toString();
      await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: categoryId, name: categoryName })
      });
    }

    // Insert task
    const resTodo = await fetch(`${supabaseUrl}/rest/v1/todos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: Date.now().toString(),
        text,
        completed: false,
        categoryid: categoryId
      })
    });

    if (!resTodo.ok) {
      console.error('Error adding task:', await resTodo.text());
      process.exit(1);
    }

    console.log(`Successfully added "${text}" to category "${categoryName}"!`);
  } catch (err) {
    console.error('Network error:', err.message);
    process.exit(1);
  }
}

run();
'@ -replace 'YOUR_URL_HERE', $supabaseUrl -replace 'YOUR_KEY_HERE', $supabaseKey
$vibeTodoJsContent | Out-File -FilePath "$scriptsDir\vibe-todo.js" -Encoding utf8

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "Vibe Todos integration installed successfully!" -ForegroundColor Green
Write-Host "Now your friends' Antigravity agent will understand /todo." -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Green
