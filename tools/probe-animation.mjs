// 探测 readme-typing-svg 的动画实现方式（它是 GitHub 上公认"能动"的服务）
// 搞清它用什么机制，就知道 GitHub 的图片代理至少保留了哪一类动画。
const URL_TYPING =
  'https://readme-typing-svg.demolab.com?font=Fira+Code&size=17&duration=3600&pause=1200&color=58A6FF&center=true&vCenter=true&width=620&lines=Read+the+source.+Find+the+root+cause.+Send+a+PR.';

const r = await fetch(URL_TYPING, { headers: { 'user-agent': 'Mozilla/5.0' } });
const svg = await r.text();

console.log('status =', r.status, ' bytes =', svg.length);
console.log('content-type =', r.headers.get('content-type'));
console.log('');

const checks = [
  ['含 <style> 标签', /<style[\s>]/i.test(svg)],
  ['含 @keyframes', /@keyframes/i.test(svg)],
  ['含 animation 属性', /animation\s*:/i.test(svg)],
  ['含 <animate> (SMIL)', /<animate[\s>/]/i.test(svg)],
  ['含 <animateTransform>', /<animateTransform/i.test(svg)],
  ['含 <animateMotion>', /<animateMotion/i.test(svg)],
  ['含 stroke-dasharray (描边动画)', /stroke-dasharray/i.test(svg)],
  ['含 <script>', /<script[\s>]/i.test(svg)],
  ['含 <set> (SMIL)', /<set[\s>/]/i.test(svg)],
];
for (const [label, hit] of checks) console.log(`  ${hit ? '✔' : '·'} ${label}`);

console.log('\n── 与动画相关的片段（截取）──');
const animLines = svg
  .split('\n')
  .filter((l) => /@keyframes|animation|<animate|<set\s|stroke-dash|begin=/i.test(l))
  .slice(0, 20);
for (const l of animLines) console.log('  ' + l.trim().slice(0, 150));

console.log('\n── 头部 400 字符（看整体结构）──');
console.log(svg.slice(0, 400));
