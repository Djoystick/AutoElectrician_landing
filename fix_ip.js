const fs = require('fs');
let c = fs.readFileSync('api/index.js', 'utf8');
const search = "req.ip?.replace(/:\\d+[^:]*$/, '')";
c = c.split(search).join("req.ip");
fs.writeFileSync('api/index.js', c);
console.log("Fixed.");
