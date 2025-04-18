const STORAGE_KEY = 'spaced_rep_tasks';
const REVISION_INTERVALS = [1, 3, 7, 14, 21];

function getTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask() {
  const title = document.getElementById('task-title').value.trim();
  const content = document.getElementById('task-content').value.trim();
  const date = document.getElementById('task-date').value;

  if (!title || !content || !date) {
    alert("Please fill all fields including the date.");
    return;
  }

  const tasks = getTasks();
  if (!tasks[date]) tasks[date] = [];

  tasks[date].push({
    title,
    content,
    reviewed: false
  });

  saveTasks(tasks);
  alert("Task added!");
  location.reload();
}

function resetAll() {
  if (confirm('Are you sure you want to delete all tasks?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function downloadTasks() {
  const tasks = getTasks();
  let content = '';
  Object.keys(tasks).sort().forEach(date => {
    content += `Date: ${date}\n`;
    tasks[date].forEach((task, idx) => {
      content += `  [${idx + 1}] ${task.title}\n    ${task.content}\n`;
    });
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tasks_backup.txt';
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('upload-file');
  if (uploadInput) {
    uploadInput.addEventListener('change', handleUpload);
  }

  if (document.getElementById('task-date')) {
    document.getElementById('task-date').valueAsDate = new Date();
  }

  const revisionContainer = document.getElementById('revision-tasks');
  if (revisionContainer) renderRevisionTasks(revisionContainer);

  const taskContainer = document.getElementById('task-container');
  if (taskContainer) renderAllTasks(taskContainer);
});

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    try {
      const parsedTasks = parseBackupText(text);
      saveTasks(parsedTasks);
      alert("Tasks uploaded and replaced successfully!");
      location.reload();
    } catch (err) {
      alert("Failed to upload tasks: " + err.message);
    }
  };
  reader.readAsText(file);
}

function parseBackupText(text) {
  const lines = text.split('\n');
  const tasks = {};
  let currentDate = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('Date:')) {
      currentDate = line.replace('Date:', '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
        throw new Error(`Invalid date format on line ${i + 1}: ${line}`);
      }
      tasks[currentDate] = [];
    } else if (line.startsWith('[')) {
      const titleMatch = line.match(/\[\d+\]\s(.+)/);
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      if (!titleMatch || !nextLine) {
        throw new Error(`Malformed task at line ${i + 1}`);
      }
      tasks[currentDate].push({
        title: titleMatch[1],
        content: nextLine,
        reviewed: false
      });
      i++; // Skip content line
    }
  }

  return tasks;
}

function renderAllTasks(container) {
  const tasks = getTasks();
  container.innerHTML = '';

  const dates = Object.keys(tasks).sort();
  if (dates.length === 0) {
    container.textContent = "No tasks available.";
    return;
  }

  dates.forEach(date => {
    const section = document.createElement('div');
    section.className = 'date-section';

    const heading = document.createElement('h3');
    heading.textContent = date;
    section.appendChild(heading);

    tasks[date].forEach((task, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'task-wrapper';

      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = task.title;

      const content = document.createElement('p');
      content.textContent = task.content;

      details.appendChild(summary);
      details.appendChild(content);

      const delBtn = document.createElement('button');
      delBtn.textContent = "Delete";
      delBtn.onclick = () => {
        if (confirm("Delete this task?")) {
          tasks[date].splice(index, 1);
          if (tasks[date].length === 0) delete tasks[date];
          saveTasks(tasks);
          renderAllTasks(container);
        }
      };

      wrapper.appendChild(details);
      wrapper.appendChild(delBtn);
      section.appendChild(wrapper);
    });

    container.appendChild(section);
  });
}

function renderRevisionTasks(container) {
  const tasks = getTasks();
  const today = new Date().toISOString().slice(0, 10);
  const dueTasks = [];

  Object.keys(tasks).forEach(date => {
    tasks[date].forEach((task, index) => {
      const taskDate = new Date(date);
      REVISION_INTERVALS.forEach(offset => {
        const revisionDate = new Date(taskDate);
        revisionDate.setDate(taskDate.getDate() + offset);
        const revDateStr = revisionDate.toISOString().slice(0, 10);
        if (revDateStr === today) {
          dueTasks.push({ date, index, ...task });
        }
      });
    });
  });

  container.innerHTML = '';

  if (dueTasks.length === 0) {
    container.innerHTML = '<p>No revisions due today.</p>';
    return;
  }

  dueTasks.forEach((task, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-wrapper';
    wrapper.style.borderLeft = task.reviewed ? '5px solid green' : '5px solid red';

    const text = document.createElement('div');
    text.textContent = task.title;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.reviewed;
    check.onchange = () => {
      const allTasks = getTasks();
      allTasks[task.date][task.index].reviewed = check.checked;
      saveTasks(allTasks);
      renderRevisionTasks(container);
    };

    wrapper.appendChild(text);
    wrapper.appendChild(check);
    container.appendChild(wrapper);
  });
}
