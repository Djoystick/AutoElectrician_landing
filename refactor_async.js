const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// Replace `app.VERB('/...', (req, res) => {` with `app.VERB('/...', async (req, res) => {`
const verbs = ['get', 'post', 'put', 'delete', 'use'];
verbs.forEach(verb => {
  const regex = new RegExp(`app\\.${verb}\\((['"\`].*?['"\`]),\\s*(?:authCheck,\\s*)?(?:upload\\.single\\(['"\`].*?['"\`]\\),\\s*)?(?:limiter[^,]*,\\s*)?(?:clientAuth,\\s*)?\\(req,\\s*res(?:,\\s*next)?\\)\\s*=>\\s*\\{`, 'g');
  
  code = code.replace(regex, (match) => {
    return match.replace('(req, res', 'async (req, res').replace('(req, res, next', 'async (req, res, next');
  });
});

// Replace readData() with await readData()
code = code.replace(/readData\(\)/g, 'await readData()');
// Replace writeData(data) with await writeData(data)
code = code.replace(/writeData\((.*?)\)/g, 'await writeData($1)');

fs.writeFileSync('api/index.js', code);
console.log('Done converting to async');
