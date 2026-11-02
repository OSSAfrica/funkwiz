export type ShareableResult = {
  title: string;
  nickname: string;
  rank: number;
  score: number;
  correctCount: number;
  playerCount: number;
};

/** Draw only this player's result; no room codes, URLs or other players. */
export async function resultImage(result: ShareableResult) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a result image.");
  const round = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  };
  const font = (size: number, weight = 600) =>
    `${weight} ${size}px "Fredoka Variable", sans-serif`;
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
  ) => {
    ctx.font = font(size);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  ctx.fillStyle = "#153f35";
  ctx.fillRect(0, 0, 1200, 630);
  round(48, 38, 48, 48, 14, "#f9dc80");
  text("✦", 58, 73, 34, "#153f35");
  text("funkwiz.", 112, 75, 42, "#f9dc80");
  text("A LITTLE CURIOSITY. A LOT OF FUN.", 668, 67, 22, "#d9e7c0");
  round(48, 115, 1104, 415, 28, "#faf8ef");
  text("MY QUIZ MOMENT", 84, 160, 18, "#63766a");

  // Wrap and shrink long titles, including words with no spaces.
  let titleLines: string[] = [];
  let titleSize = 46;
  for (; titleSize >= 22; titleSize -= 2) {
    ctx.font = font(titleSize);
    titleLines = [""];
    for (const character of result.title.replace(/\s+/gu, " ").trim()) {
      const last = titleLines.length - 1;
      if (ctx.measureText(titleLines[last] + character).width > 1018)
        titleLines.push(character);
      else titleLines[last] += character;
    }
    if (titleLines.length <= 3) break;
  }
  titleLines
    .slice(0, 3)
    .forEach((line, index) =>
      text(line.trim(), 84, 217 + index * 48, titleSize, "#153f35"),
    );
  const stats = [
    {
      x: 84,
      width: 285,
      color: "#e7e0f5",
      label: "MY RANK",
      value: `#${result.rank} of ${result.playerCount}`,
    },
    {
      x: 389,
      width: 422,
      color: "#f9dc80",
      label: "TOTAL POINTS",
      value: result.score.toLocaleString("en-GB"),
    },
    {
      x: 831,
      width: 285,
      color: "#dfeac8",
      label: "CORRECT ANSWERS",
      value: String(result.correctCount),
    },
  ];
  for (const stat of stats) {
    round(stat.x, 349, stat.width, 144, 18, stat.color);
    text(stat.label, stat.x + 22, 383, 18, "#526859");
    let valueSize = 65;
    ctx.font = font(valueSize);
    while (
      valueSize > 24 &&
      ctx.measureText(stat.value).width > stat.width - 44
    ) {
      valueSize -= 2;
      ctx.font = font(valueSize);
    }
    text(stat.value, stat.x + 22, 459, valueSize, "#153f35");
  }
  ctx.font = font(30);
  ctx.fillStyle = "#faf8ef";
  ctx.fillText(result.nickname, 52, 584, 520);
  ctx.font = font(22);
  ctx.fillStyle = "#d9e7c0";
  ctx.textAlign = "right";
  ctx.fillText(
    `${result.playerCount} curious ${result.playerCount === 1 ? "mind" : "minds"}. One great quiz.`,
    1148,
    581,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The result image could not be created.")),
      "image/png",
    );
  });
}

export async function downloadResultImage(result: ShareableResult) {
  const blob = await resultImage(result);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const title = result.title
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  link.href = url;
  link.download = `funkwiz-result-${title || "quiz"}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
