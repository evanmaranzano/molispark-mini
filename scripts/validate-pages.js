const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const routeSet = new Set([
  ...(appJson.pages || []),
  ...(appJson.subpackages || []).flatMap((subpackage) =>
    (subpackage.pages || []).map((page) => `${subpackage.root}/${page}`)
  ),
]);

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function listPageDirs() {
  return fs
    .readdirSync(path.join(root, 'pages'), { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => `pages/${item.name}`)
    .filter((dir) => fs.existsSync(path.join(root, dir, 'index.js')) && fs.existsSync(path.join(root, dir, 'index.wxml')));
}

function collectPageMethods(js) {
  const methods = new Set();
  const methodRe = /^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm;
  let match = methodRe.exec(js);
  while (match) {
    methods.add(match[1]);
    match = methodRe.exec(js);
  }
  return methods;
}

function collectBindings(wxml) {
  const bindings = new Set();
  const bindRe = /\b(?:bind|catch)[A-Za-z]*\s*=\s*["']([^"']+)["']/g;
  let match = bindRe.exec(wxml);
  while (match) {
    bindings.add(match[1]);
    match = bindRe.exec(wxml);
  }
  return bindings;
}

function collectNavTargets(js) {
  const targets = [];
  const navRe = /wx\.(?:navigateTo|redirectTo|switchTab|reLaunch)\s*\(\s*\{\s*url:\s*(?:`([^`$?]+)|['"]([^'"?]+))/g;
  let match = navRe.exec(js);
  while (match) {
    targets.push((match[1] || match[2]).replace(/^\//, ''));
    match = navRe.exec(js);
  }
  return targets;
}

const problems = [];

listPageDirs().forEach((dir) => {
  const js = read(`${dir}/index.js`);
  const wxml = read(`${dir}/index.wxml`);
  const methods = collectPageMethods(js);
  collectBindings(wxml).forEach((binding) => {
    if (!methods.has(binding)) {
      problems.push(`${dir}: WXML binds missing method "${binding}"`);
    }
  });
  collectNavTargets(js).forEach((target) => {
    if (!routeSet.has(target)) {
      problems.push(`${dir}: navigation target is not registered: /${target}`);
    }
  });
  if (/class="[^"]*post-card[^"]*"[^>]*data-id="\{\{item\.id\}\}"/.test(wxml)) {
    problems.push(`${dir}: post navigation must support cloud _id fallback, use item._id || item.id`);
  }
});

const dbJs = read('utils/db.js');
if (/^\s*const\s+db\s*=\s*wx\.cloud\.database\(\)/m.test(dbJs)) {
  problems.push('utils/db.js: wx.cloud.database() must be lazy, not evaluated at module load');
}
if (/res\.data\[0\]/.test(dbJs)) {
  problems.push('utils/db.js: doc(id).get() returns res.data, not res.data[0]');
}

const appJs = read('app.js');
const codeFilesWithCloudPlaceholder = ['app.js', 'project.config.json', 'utils/auth.js', 'utils/db.js', 'utils/storage.js']
  .filter((file) => fs.existsSync(path.join(root, file)) && read(file).includes('your-cloud-env-id'));
if (codeFilesWithCloudPlaceholder.length !== 1 || !appJs.includes('your-cloud-env-id')) {
  problems.push('cloud env placeholder should appear only in app.js code/config surface');
}

if (problems.length) {
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

process.stdout.write(`Validated ${routeSet.size} registered routes and ${listPageDirs().length} page implementations.\n`);
