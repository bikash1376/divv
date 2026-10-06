"use client";
import { useEffect, useRef, useState, ViewTransition } from "react";

// The wall is a GitHub-style contributions graph in greys: each cell has a
// "contribution level" 0–4, darker = more. Every hit knocks a cell down one
// level, so dark cells take several hits and level 0 is an empty (cleared) day.
// level 0 is a touch darker than the card so empty days still read as cells
const LEVEL_COLORS = ["#e4e4e4", "#c4c4c4", "#8f8f8f", "#525252", "#1f1f1f"];
const COLORS = {
  bg: "#FBFBFB",
  card: "#F2F2F2",
  paddle: "#d4d4d4", // neutral-300, light enough to stay soft but visible on the card
  muted: "#a3a3a3", // neutral-400
};

const ROWS = 7; // one per weekday, like GitHub
const CELL = 12;
const CELL_GAP = 3;
const GRID_TOP = 32; // from the top of the card
const GRID_PAD = 24; // minimum space between the graph and the card's sides
// share of days with no contributions, and how the rest are weighted towards
// lighter levels, so the graph looks like a real (patchy) year
const EMPTY_CHANCE = 0.35;
const LEVEL_WEIGHTS = [0.4, 0.3, 0.2, 0.1]; // levels 1–4

const PADDLE_W = 84;
const PADDLE_H = 10;
const PADDLE_BOTTOM = 48; // distance from the bottom of the card
const PADDLE_SPEED = 620; // px per second
const PADDLE_NUDGE = 20; // px moved instantly per key press
const BALL_R = 9;
const BALL_SPEED = 380; // px per second

type Cell = { x: number; y: number; level: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Phase = "ready" | "playing" | "won";

const randomLevel = () => {
  if (Math.random() < EMPTY_CHANCE) return 0;
  let roll = Math.random();
  for (let i = 0; i < LEVEL_WEIGHTS.length; i++) {
    roll -= LEVEL_WEIGHTS[i];
    if (roll <= 0) return i + 1;
  }
  return LEVEL_WEIGHTS.length;
};

const BrickBreaker = ({
  image,
  morphName,
  onExit,
}: {
  image: string;
  // view-transition name shared with whatever the card should morph from/into
  morphName: string;
  onExit: () => void;
}) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  // keep the latest onExit without restarting the game loop when it changes
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const area = areaRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const ballImage = new window.Image();
    ballImage.src = image;

    let W = 0;
    let H = 0;
    let cells: Cell[] = [];
    let particles: Particle[] = [];
    let phase: Phase = "ready";
    let points = 0;
    const paddle = { x: 0, y: 0 };
    const ball = { x: 0, y: 0, vx: 0, vy: 0 };
    const keys = { left: false, right: false };

    const addPoints = (n: number) => {
      points += n;
      setScore(points);
    };

    // as many week-columns as fit inside the card's padding, centred
    const buildGrid = () => {
      const cols = Math.max(1, Math.floor((W - GRID_PAD * 2 + CELL_GAP) / (CELL + CELL_GAP)));
      const gridWidth = cols * (CELL + CELL_GAP) - CELL_GAP;
      const startX = (W - gridWidth) / 2;
      cells = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < ROWS; r++) {
          cells.push({ x: startX + c * (CELL + CELL_GAP), y: GRID_TOP + r * (CELL + CELL_GAP), level: randomLevel() });
        }
      }
    };

    const resetBall = () => {
      phase = "ready";
      ball.vx = 0;
      ball.vy = 0;
    };

    const newGame = () => {
      points = 0;
      setScore(0);
      particles = [];
      buildGrid();
      resetBall();
    };

    const launch = () => {
      if (phase === "ready") {
        // slight random angle so every serve isn't identical
        const angle = (-90 + (Math.random() * 40 - 20)) * (Math.PI / 180);
        ball.vx = Math.cos(angle) * BALL_SPEED;
        ball.vy = Math.sin(angle) * BALL_SPEED;
        phase = "playing";
      } else if (phase === "won") {
        newGame();
      }
    };

    const clampPaddle = (x: number) => Math.min(Math.max(x, PADDLE_W / 2), W - PADDLE_W / 2);

    // the canvas fills the card, so size it from that
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const firstLayout = W === 0;
      W = area.clientWidth;
      H = area.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paddle.y = H - PADDLE_BOTTOM;
      paddle.x = clampPaddle(firstLayout ? W / 2 : paddle.x);
      if (firstLayout) newGame();
    };

    const burst = (cell: Cell, color: string) => {
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: cell.x + Math.random() * CELL,
          y: cell.y + Math.random() * CELL,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          life: 1,
          color,
        });
      }
    };

    const update = (dt: number) => {
      // paddle
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      paddle.x = clampPaddle(paddle.x + dir * PADDLE_SPEED * dt);

      // particles
      particles = particles.filter((p) => (p.life -= dt * 1.8) > 0);
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
      }

      if (phase === "ready") {
        // ball rides on the paddle until launched
        ball.x = paddle.x;
        ball.y = paddle.y - PADDLE_H / 2 - BALL_R - 2;
        return;
      }
      if (phase !== "playing") return;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // walls = the edges of the card
      if (ball.x < BALL_R) {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x > W - BALL_R) {
        ball.x = W - BALL_R;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < BALL_R) {
        ball.y = BALL_R;
        ball.vy = Math.abs(ball.vy);
      }

      // fell past the paddle: back onto it, score kept
      if (ball.y - BALL_R > H) {
        resetBall();
        return;
      }

      // paddle: the further from its centre you hit, the steeper the bounce
      const top = paddle.y - PADDLE_H / 2;
      if (
        ball.vy > 0 &&
        ball.y + BALL_R >= top &&
        ball.y + BALL_R <= top + PADDLE_H + 10 &&
        Math.abs(ball.x - paddle.x) <= PADDLE_W / 2 + BALL_R
      ) {
        const hit = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (PADDLE_W / 2)));
        const angle = (-90 + hit * 60) * (Math.PI / 180);
        ball.vx = Math.cos(angle) * BALL_SPEED;
        ball.vy = Math.sin(angle) * BALL_SPEED;
        ball.y = top - BALL_R;
      }

      // cells: closest point on each cell to the ball's centre
      for (const cell of cells) {
        if (cell.level === 0) continue;
        const cx = Math.max(cell.x, Math.min(ball.x, cell.x + CELL));
        const cy = Math.max(cell.y, Math.min(ball.y, cell.y + CELL));
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

        burst(cell, LEVEL_COLORS[cell.level]);
        cell.level -= 1;
        addPoints(1);
        // bounce off whichever side we went in deeper on
        const overlapX = BALL_R - Math.abs(dx);
        const overlapY = BALL_R - Math.abs(dy);
        if (dx !== 0 && overlapX < overlapY) ball.vx = Math.sign(dx) * Math.abs(ball.vx);
        else ball.vy = (dy !== 0 ? Math.sign(dy) : -Math.sign(ball.vy)) * Math.abs(ball.vy);
        break; // one cell per frame keeps the bounce predictable
      }

      if (cells.every((c) => c.level === 0)) phase = "won";
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (const cell of cells) {
        ctx.fillStyle = LEVEL_COLORS[cell.level];
        ctx.beginPath();
        ctx.roundRect(cell.x, cell.y, CELL, CELL, 2);
        ctx.fill();
      }

      for (const p of particles) {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
      }
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.roundRect(paddle.x - PADDLE_W / 2, paddle.y - PADDLE_H / 2, PADDLE_W, PADDLE_H, PADDLE_H / 2);
      ctx.fillStyle = COLORS.paddle;
      ctx.fill();

      // ball = the profile picture, clipped to a circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.clip();
      if (ballImage.complete && ballImage.naturalWidth) {
        ctx.drawImage(ballImage, ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);
      } else {
        ctx.fillStyle = COLORS.paddle;
        ctx.fill();
      }
      ctx.restore();

      const message =
        phase === "ready" ? "← → to move · space to launch" : phase === "won" ? "Graph cleared · space to play again" : "";
      if (message) {
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(message, W / 2, H - PADDLE_BOTTOM / 2 + 6);
      }
    };

    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      // clamp dt so a background tab doesn't teleport the ball through cells
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      update(dt);
      draw();
      frame = requestAnimationFrame(loop);
    };

    const nudgePaddle = (dir: number) => {
      paddle.x = clampPaddle(paddle.x + dir * PADDLE_NUDGE);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExitRef.current();
        return;
      }
      // holding a key moves the paddle every frame; the nudge makes quick taps
      // count too, since a tap can be released before the next frame runs
      if (e.key === "ArrowLeft" || e.key === "a") {
        keys.left = true;
        nudgePaddle(-1);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        keys.right = true;
        nudgePaddle(1);
      } else if (e.key === " " || e.key === "ArrowUp") launch();
      else return;
      // stop arrows/space from scrolling the page underneath
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    };
    // the mouse steers too (anywhere on screen), and a click launches
    const onPointerMove = (e: PointerEvent) => {
      paddle.x = clampPaddle(e.clientX - canvas.getBoundingClientRect().left);
    };

    resize();
    frame = requestAnimationFrame(loop);
    const observer = new ResizeObserver(resize);
    observer.observe(area);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", launch);

    // no page scrolling while the game is up
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", launch);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [image]);

  // Meant to be rendered inside the hero column: the play area fills the column
  // (so it's as wide as the paragraph), while a fixed backdrop hides the page.
  // No fade here — entering/leaving is animated by the view transition instead.
  return (
    <div className="absolute inset-0 z-10 pointer-events-auto">
      <div className="fixed inset-0" style={{ background: COLORS.bg }} />

      {/* the play area is a soft rounded card under the esc / score bar; the ball
          bounces off its edges. It shares a view-transition name with the
          profile picture, so the picture morphs into it (and back on exit). */}
      <ViewTransition name={morphName} share="morph" default="none">
        <div
          ref={areaRef}
          className="absolute inset-x-0 top-16 bottom-6 overflow-hidden rounded-3xl"
          style={{ background: COLORS.card }}
        >
          <canvas ref={canvasRef} className="block touch-none" />
        </div>
      </ViewTransition>

      {/* same spot and type as the navbar: esc where "Divv." is, score where "Stuff" is */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between py-5 text-sm">
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-[#F2F2F2] px-3 py-1 text-black cursor-pointer"
        >
          esc
        </button>
        <span className="px-3 py-1 tabular-nums text-black">{score}</span>
      </div>
    </div>
  );
};

export default BrickBreaker;
