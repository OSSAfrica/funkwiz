import type { SocialImage } from "../src/lib/social";

const bolt = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/></svg>`;
const atom = `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3"><ellipse cx="48" cy="48" rx="43" ry="16"/><ellipse cx="48" cy="48" rx="43" ry="16" transform="rotate(60 48 48)"/><ellipse cx="48" cy="48" rx="43" ry="16" transform="rotate(120 48 48)"/><circle cx="48" cy="48" r="4" fill="currentColor" stroke="none"/></svg>`;
const globe = `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3"><circle cx="48" cy="48" r="37"/><ellipse cx="48" cy="48" rx="17" ry="37"/><path d="M12 38h72M12 58h72"/></svg>`;
const leaf = `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 70C0 20 58 16 76 10c5 24 9 67-29 70-13 1-19-4-25-10Z"/><path d="M18 86c7-26 22-42 44-58"/></svg>`;
const shapes = `<div class="answer-shapes"><span>▲</span><span>◆</span><span>●</span><span>■</span></div>`;
const cards = {
  app: {
    eyebrow: "LESS LECTURE. MORE LET’S GO.",
    first: "A little curiosity.",
    second: "A lot of fun.",
    description:
      "Colorful classroom quizzes.<br>Set your pace. Bring the play.",
    sticker: "MADE FOR AHA!",
  },
  join: {
    eyebrow: "CURIOUS MINDS, THIS WAY",
    first: "Your next “aha!”",
    second: "is waiting.",
    description:
      "Join a classroom game. No account.<br>Just your curious self.",
    sticker: "LET’S PLAY",
  },
  teacher: {
    eyebrow: "FOR THE MAKERS OF AHA! MOMENTS",
    first: "Great questions",
    second: "start with you.",
    description: "Create a quiz. Find your rhythm.<br>Make learning play.",
    sticker: "START WITH A SPARK",
  },
} as const;

function artwork(kind: SocialImage) {
  if (kind === "join")
    return `<div class="phone-back"></div><div class="phone"><div class="phone-camera"></div><span class="card-label">YOU’VE GOT THIS</span><div class="phone-spark">✳</div><p>A little<br>brain power?</p>${shapes}<div class="phone-dot"></div></div><div class="friend friend-one">${leaf}</div><div class="friend friend-two">${globe}</div>`;
  if (kind === "teacher")
    return `<div class="topic-card topic-back"><div class="topic-visual lilac">${atom}</div><span>STAY CURIOUS</span></div><div class="topic-card topic-middle"><div class="topic-visual blue">${globe}</div><span>GO EXPLORE</span></div><div class="topic-card topic-front"><div class="topic-visual sage">${leaf}</div><span>GROW YOUR MIND</span></div>`;
  return `<div class="question-back"></div><div class="question-card"><div class="card-top"><span>GOOD QUESTIONS AHEAD</span><span class="card-dot">✳</span></div><div class="atom">${atom}</div><p>Ready for a little<br>brain power?</p>${shapes}</div><div class="art-bolt">${bolt}</div>`;
}

/** A single controlled template, rendered to PNG at build-tool time, never per request. */
export function socialCardHtml(
  kind: SocialImage,
  fonts: { fredoka: string; nunito: string },
) {
  const copy = cards[kind];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${copy.first} ${copy.second}</title><style>
@font-face { font-family: Fredoka; src: url(data:font/woff2;base64,${fonts.fredoka}) format('woff2'); font-weight: 300 700; }
@font-face { font-family: Nunito; src: url(data:font/woff2;base64,${fonts.nunito}) format('woff2'); font-weight: 200 900; }
* { box-sizing: border-box; } body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #153f35; color: #fffefb; font-family: Nunito, sans-serif; }
.card { width: 1200px; height: 630px; position: relative; padding: 52px 64px; isolation: isolate; }
.brand { display: flex; align-items: center; gap: 13px; font: 500 45px/1 Fredoka; letter-spacing: -1px; }
.brand-mark { display: grid; place-items: center; width: 45px; height: 50px; border-radius: 15px; color: #153f35; background: #ffcf57; transform: rotate(-7deg); }
.brand-mark svg { width: 31px; height: 31px; } .brand-second { color: #d6e5a7; } .brand-dot { color: #ffbf72; }
.copy { position: absolute; top: 188px; left: 64px; width: 700px; }
.eyebrow { color: #d6e5a7; font-size: 13px; font-weight: 800; letter-spacing: 2.1px; margin: 0 0 21px; }
h1 { font: 450 67px/1.10 Fredoka; letter-spacing: -1.3px; margin: 0; } h1 span { color: #f9dc80; }
.description { color: #cedfd0; font-size: 24px; line-height: 1.5; margin: 23px 0 0; }
.footer { position: absolute; left: 64px; bottom: 47px; font-size: 12px; font-weight: 800; letter-spacing: 1.7px; color: #b9d0bc; }
.sticker { position: absolute; right: 67px; bottom: 49px; color: #153f35; background: #f9dc80; border: 1px solid #e2c16a; border-radius: 8px; padding: 10px 15px; font-size: 11px; letter-spacing: 1px; font-weight: 900; transform: rotate(-4deg); }
.art { position: absolute; width: 356px; height: 370px; right: 48px; top: 139px; }
.art::before { content: ''; position: absolute; inset: 11px 2px 10px; border-radius: 50% 50% 42% 46%; background: #264e41; transform: rotate(-8deg); z-index: -2; }
.orbit { position: absolute; width: 370px; height: 200px; border: 1.5px solid #688564; border-radius: 50%; transform: rotate(-25deg); top: 90px; left: -16px; z-index: -1; }
.spark { position: absolute; font-size: 51px; line-height: 1; color: #f9dc80; top: -4px; right: 13px; transform: rotate(12deg); }
.spark-small { font-size: 31px; top: auto; right: auto; left: 3px; bottom: 14px; color: #d6e5a7; }
.question-back { position: absolute; width: 251px; height: 291px; background: #c3bfed; border: 3px solid #344a35; border-radius: 20px; transform: rotate(-12deg); top: 36px; left: 47px; }
.question-card { position: absolute; width: 253px; height: 291px; background: #fffdf2; color: #263b34; border: 3px solid #344a35; border-radius: 20px; transform: rotate(9deg); top: 40px; left: 55px; box-shadow: 6px 7px 0 #0e2d24; padding: 20px; }
.card-top { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 8px; letter-spacing: .9px; }
.card-dot { background: #e5efda; padding: 3px 6px; border-radius: 9px; font-size: 12px; }
.atom { width: 66px; height: 66px; color: #49715d; margin: 16px auto 5px; }
.question-card p, .phone p { font: 450 24px/1.2 Fredoka; text-align: center; margin: 9px 0 18px; }
.answer-shapes { display: flex; gap: 6px; justify-content: center; }
.answer-shapes span { display: grid; place-items: center; width: 43px; height: 37px; border-radius: 6px; background: #bb4b39; color: #fff; font: 700 16px Nunito; }
.answer-shapes span:nth-child(2) { background: #5d7db6; } .answer-shapes span:nth-child(3) { background: #b28124; } .answer-shapes span:nth-child(4) { background: #457556; }
.art-bolt { position: absolute; top: 12px; right: 5px; width: 65px; height: 65px; border-radius: 50%; display: grid; place-items: center; background: #df7642; color: #fff; border: 3px solid #334930; transform: rotate(12deg); }
.art-bolt svg { width: 37px; height: 37px; }
.phone-back { position: absolute; width: 197px; height: 308px; top: 25px; left: 91px; background: #c3bfed; border-radius: 32px; transform: rotate(-13deg); border: 3px solid #344a35; }
.phone { position: absolute; width: 198px; height: 308px; top: 25px; left: 81px; background: #fffdf2; color: #263b34; border: 5px solid #344a35; border-radius: 32px; padding: 32px 17px 24px; transform: rotate(8deg); box-shadow: 6px 7px 0 #0e2d24; }
.phone-camera { position: absolute; width: 42px; height: 6px; top: 13px; left: 73px; background: #c7d5be; border-radius: 10px; }
.card-label { display: block; text-align: center; font-weight: 900; font-size: 9px; letter-spacing: 1.1px; }
.phone-spark { color: #ad7826; font-size: 56px; line-height: 1; text-align: center; margin: 18px 0 4px; }
.phone .answer-shapes { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.phone .answer-shapes span { width: 100%; height: 37px; } .phone p { font-size: 21px; margin: 2px 0 16px; }
.phone-dot { width: 7px; height: 7px; border-radius: 50%; background: #c7d5be; margin: 12px auto 0; }
.friend { position: absolute; width: 66px; height: 66px; border-radius: 20px; padding: 10px; border: 2px solid #344a35; }
.friend-one { left: 5px; top: 82px; background: #d9e8bb; color: #4e713f; transform: rotate(-15deg); }
.friend-two { right: 1px; bottom: 43px; background: #c9e1f1; color: #3e7395; transform: rotate(12deg); }
.topic-card { position: absolute; width: 181px; height: 211px; background: #fffdf2; color: #344a35; border: 3px solid #344a35; border-radius: 16px; padding: 9px; box-shadow: 4px 5px 0 #0e2d24; }
.topic-visual { height: 151px; border-radius: 8px; padding: 26px; } .topic-card > span { font-size: 9px; display: block; text-align: center; padding-top: 12px; letter-spacing: 1px; font-weight: 900; }
.lilac { background: #ded9f4; color: #57488f; } .blue { background: #c9e1f1; color: #3e7395; } .sage { background: #d9e8bb; color: #4e713f; }
.topic-back { left: 10px; top: 17px; transform: rotate(-17deg); } .topic-middle { right: 3px; top: 102px; transform: rotate(12deg); } .topic-front { left: 33px; top: 149px; transform: rotate(-6deg); }
</style></head><body><main class="card"><div class="brand"><span class="brand-mark">${bolt}</span><span>fun<span class="brand-second">quiz</span><span class="brand-dot">.</span></span></div><section class="copy"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.first}<br><span>${copy.second}</span></h1><p class="description">${copy.description}</p></section><div class="art"><div class="orbit"></div><span class="spark">✳</span><span class="spark spark-small">✳</span>${artwork(kind)}</div><div class="footer">FOR CURIOUS MINDS &amp; HAPPY CLASSROOMS</div><div class="sticker">${copy.sticker}</div></main></body></html>`;
}
