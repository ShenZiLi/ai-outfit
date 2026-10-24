import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
const shapes = {
  'shirt-white': `<path d="M111 57 144 46 166 57 193 48 220 59 261 96 235 140 213 121 217 280 103 280 107 121 85 140 60 96Z" fill="url(#cloth)"/><path d="m144 46 21 37-29 13-15-36m45 23 29 13 17-36M165 83v194M106 125l3 145m103-145-4 145"/><path d="M179 114h24v30h-24z" opacity=".4"/><g fill="#b3b2a9" stroke="none"><circle cx="166" cy="111" r="2"/><circle cx="166" cy="146" r="2"/><circle cx="166" cy="181" r="2"/><circle cx="166" cy="216" r="2"/><circle cx="166" cy="251" r="2"/></g>`,
  'blazer-dark': `<path d="m129 44 31 14 31-14 35 22 34 174-35 9-17-109 6 146H105l7-146-17 109-35-9L94 66Z" fill="url(#cloth)"/><path d="m129 44 31 79 31-79 8 39-21 16 16 10-34 53-35-53 17-10-21-16Z" fill="#4e5051"/><path d="m160 123-5 159M112 205h27m39 0h26M94 67l18 72m114-72-18 72"/><circle cx="166" cy="194" r="4" fill="#141717"/><circle cx="164" cy="235" r="4" fill="#141717"/>`,
  'pants-sand': `<path d="M113 44h94l11 58 20 189h-66l-13-147-12 147H81l20-189Z" fill="url(#cloth)"/><path d="M109 63h103M160 64v77M121 68l-13 30m88-30 14 30M122 97l-21 180m93-180 21 180M86 278h60m29 0h58"/><path d="M151 47v14m-29-14v14m65-14v14" stroke-width="5"/>`,
  'knit-sage': `<path d="M131 57q29 28 58 0l36 15 40 169-35 12-29-116 9 147H109l10-147-29 116-35-12L95 72Z" fill="url(#cloth)"/><path d="M132 57q28 52 56 0M129 62q31 52 62 0M111 267h97M59 229l33 11m136 0 32-11" stroke-width="4"/><path d="M123 114v141m13-141v141m13-141v141m13-141v141m13-141v141m13-141v141m13-141v141" opacity=".17"/>`,
  'jeans-blue': `<path d="M111 42h98l9 72 17 178h-65l-10-145-13 145H82l19-178Z" fill="url(#cloth)"/><path d="M105 64h108M160 64v82M108 70q0 34 34 34m69-34q0 34-34 34M114 108 96 285m109-177 17 177M86 281h60m26 0h60" stroke="#c1bcaa" stroke-width="2"/><path d="M148 66v58h12"/><circle cx="159" cy="53" r="3" fill="#b7aa80"/>`,
  'loafers-black': `<g transform="rotate(-15 160 170)"><path d="M98 83q38-12 42 15l18 105q-1 47-41 43-50-4-42-46l8-99Z" fill="url(#cloth)"/><path d="M198 110q38-12 42 15l18 105q-1 47-41 43-50-4-42-46l8-99Z" fill="url(#cloth)"/><path d="m91 125 47-6 6 21-52 9Zm100 27 47-6 6 21-52 9Z" fill="#43433e"/><path d="m104 133 22-3m79 30 22-3" stroke="#bda979" stroke-width="5"/><path d="M82 203q11 32 61 17m38 10q11 32 61 17" opacity=".5"/></g>`,
  'dress-black': `<path d="m127 44 16 7q17 19 34 0l16-7 17 26-24 53q-8 33 1 57l54 113H79l54-113q9-24 1-57l-24-53Z" fill="url(#cloth)"/><path d="M133 132q27 10 54 0M130 171q30 9 60 0M136 187l-24 98m45-96-7 96m23-96 20 96"/><path d="m128 46 9 38m55-38-9 38" stroke-width="4"/>`,
  'bag-brown': `<path d="M115 126V95q0-68 45-68t45 68v31h-18V94q0-49-27-49t-27 49v32Z" fill="#78563e"/><path d="M88 113q70-18 144 0l20 147q-90 29-184 0Z" fill="url(#cloth)"/><path d="M88 114q71 24 144 0l-11 61q-62 19-122 0Z" fill="#977456"/><path d="m82 246 14-109m144 109-15-109" stroke="#b99573"/><rect x="147" y="166" width="27" height="24" rx="3" fill="#bfa672" stroke="#d1ba88"/><path d="M157 170h7v16h-7Z" fill="#75543c"/>`,
};
const colors = {
  'shirt-white': ['#fffefa', '#d9d8ce'],
  'blazer-dark': ['#515352', '#25282a'],
  'pants-sand': ['#d2c2aa', '#b2a18a'],
  'knit-sage': ['#9ba692', '#697c67'],
  'jeans-blue': ['#8394a8', '#4e6780'],
  'loafers-black': ['#393b38', '#151a17'],
  'dress-black': ['#4d4d47', '#1d231f'],
  'bag-brown': ['#b18d68', '#75553e'],
};
for (const [id, shape] of Object.entries(shapes)) {
  const [light, dark] = colors[id];
  await writeFile(
    `public/images/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340"><defs><linearGradient id="cloth" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="${dark}"/><stop offset=".35" stop-color="${light}"/><stop offset=".72" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient><filter id="shadow" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#343c30" flood-opacity=".12"/></filter></defs><g stroke="${dark}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#shadow)">${shape}</g></svg>`,
  );
}
