
let sendClicks = 0;
const SEP = '\u0001';

class WordMarkovChain {
    constructor(stateSize = 2) {
        this.stateSize = stateSize;
        this.transitions = new Map();
        this.state = null;
    }
    tokenize(text) {
        const tokens = [];
        let cur = "";
        for (let ch of text) {
            if (ch === ' ' || ch === "\t") { if (cur) tokens.push(cur), cur = ""; }
            else if (ch === "\n") { if (cur) tokens.push(cur), cur = ""; tokens.push("\n"); }
            else if (".,:;?!".includes(ch)) { if (cur) tokens.push(cur), cur = ""; tokens.push(ch); }
            else { cur += ch; }
        }
        if (cur) tokens.push(cur);
        return tokens;
    }
    update(text) {
        const words = this.tokenize(text);
        if (this.stateSize >= words.length) return;
        for (let i = 0; i <= words.length - this.stateSize - 1; i++) {
            const s = words.slice(i, i + this.stateSize).join(SEP);
            const nxt = words.slice(i + 1, i + this.stateSize + 1).join(SEP);
            if (!this.transitions.has(s)) this.transitions.set(s, []);
            this.transitions.get(s).push(nxt);
        }
    }
    generate(length = 150) {
        const keys = Array.from(this.transitions.keys());
        if (!keys.length) return "";
        this.state = keys[Math.floor(Math.random() * keys.length)];
        const out = [this.state.split(SEP)[0]];
        for (let i = 0; i < length; i++) {
            const possible = this.transitions.get(this.state);
            if (!possible) break;
            this.state = possible[Math.floor(Math.random() * possible.length)];
            out.push(this.state.split(SEP).pop());
        }
        return out.join(" ").replace(/\s+([.,:;?!])/g, '$1').replace(/\n /g, "\n");
    }
}

async function get_info(topic) {
    const lang = /([а-яё])/i.test(topic) ? "ru": "en";
    try {
        let res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(topic)}&prop=text&format=json&formatversion=2&origin=*`);
        let json = await res.json();
        if (!json.parse) {
            const sRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`);
            const sJson = await sRes.json();
            if (sJson.query?.search?.length > 0) {
                const title = sJson.query.search[0].title;
                res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&formatversion=2&origin=*`);
                json = await res.json();
                return { text: parse(json.parse.text), title };
            }
            return null;
        }
        return { text: parse(json.parse.text), title: topic };
    } catch { return null; }
}

function parse(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll("table, sup, style, script, .navbox").forEach(n => n.remove());
    return Array.from(d.querySelectorAll("p")).map(p => p.textContent).join("\n");
}

async function start() {
    sendClicks++;
    if (sendClicks === 2) { location.reload(); return; }
    const val = document.getElementById('userInput').value.trim();
    if (!val) return;
    document.getElementById('sendBtn').textContent = 'reset';
    const sphere = document.getElementById('dom-sphere');
    if (sphere) {
        sphere.style.transition = "all 0.5s ease";
        sphere.style.opacity = "0";
        setTimeout(() => sphere.remove(), 500);
    }
    const container = document.getElementById('scene-container');
    const dialog = document.createElement('div');
    dialog.className = 'dialog-box';
    dialog.textContent = `Searching for "${val}"...`;
    container.appendChild(dialog);
    const result = await get_info(val);
    if (!result) { dialog.textContent = "No matches found."; return; }
    const mc = new WordMarkovChain(2);
    mc.update(result.text);
    dialog.innerHTML = '';
    const lang = /([а-яё])/i.test(result.title) ? "ru": "en";
    const btn = document.createElement('a');
    btn.className = 'wiki-btn';
    btn.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
    btn.target = "_blank";
    btn.textContent = `🔗 Source: ${result.title}`;
    const txt = document.createElement('div');
    txt.textContent = `${result.title.toUpperCase()}\n\n${mc.generate(200)}`;
    dialog.appendChild(btn);
    dialog.appendChild(txt);
}

document.getElementById('sendBtn').addEventListener('click', start);
document.getElementById('userInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') start(); });
