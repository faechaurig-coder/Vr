/**
 * Cerebro motor de MOSCA (Drosophila) para personajes AR.
 * No es un conectoma: es MotorIntent. La única puerta sensorial es senseAt.
 * Tropotaxis antenal L/R, palpos residuales 12% no espaciales,
 * Johnston ≠ olfato, looming visual, geosmina vs fermentación.
 */

export const PALP_RESIDUAL = 0.12;
export const COLS = 40;
export const ROWS = 40;
export const N = COLS * ROWS;
export const ANTENNA_REACH = 1.15;
export const PREFER_T = 24.5;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function idx(c, r) {
  return r * COLS + c;
}

export function inBounds(c, r) {
  return c >= 0 && r >= 0 && c < COLS && r < ROWS;
}

function sample(field, x, y) {
  const c = Math.max(0, Math.min(COLS - 1.001, x));
  const r = Math.max(0, Math.min(ROWS - 1.001, y));
  const c0 = Math.floor(c);
  const r0 = Math.floor(r);
  const c1 = Math.min(COLS - 1, c0 + 1);
  const r1 = Math.min(ROWS - 1, r0 + 1);
  const tx = c - c0;
  const ty = y - r0;
  const a = field[idx(c0, r0)];
  const b = field[idx(c1, r0)];
  const d = field[idx(c0, r1)];
  const e = field[idx(c1, r1)];
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + d * (1 - tx) * ty + e * tx * ty;
}

function sampleBilinear(src, wall, x, y) {
  const c = Math.max(0.5, Math.min(COLS - 1.5, x));
  const r = Math.max(0.5, Math.min(ROWS - 1.5, y));
  const c0 = Math.floor(c);
  const r0 = Math.floor(r);
  const i = idx(c0, r0);
  if (wall[i]) return 0;
  return sample(src, c, r);
}

export function injectDisk(field, x, y, rad, amount) {
  const r0 = Math.max(0, Math.floor(y - rad));
  const r1 = Math.min(ROWS - 1, Math.ceil(y + rad));
  const c0 = Math.max(0, Math.floor(x - rad));
  const c1 = Math.min(COLS - 1, Math.ceil(x + rad));
  const rad2 = rad * rad;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const d2 = (c + 0.5 - x) ** 2 + (r + 0.5 - y) ** 2;
      if (d2 > rad2) continue;
      const fall = 1 - Math.sqrt(d2) / rad;
      const i = idx(c, r);
      field[i] = Math.min(1, field[i] + amount * fall);
    }
  }
}

function stepChemical(src, dst, wall, airX, airY, dt, decayBase = 0.9974) {
  const decay = Math.pow(decayBase, dt * 60);
  const mix = 0.11 * dt * 60;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(c, r);
      if (wall[i]) {
        dst[i] = 0;
        continue;
      }
      const ax = airX[i] * 8.4 * dt;
      const ay = airY[i] * 8.4 * dt;
      let v = sampleBilinear(src, wall, c + 0.5 - ax, r + 0.5 - ay);
      let acc = 0;
      let n = 0;
      const nbs = [i - 1, i + 1, i - COLS, i + COLS];
      for (const nb of nbs) {
        if (nb < 0 || nb >= src.length || wall[nb]) continue;
        acc += src[nb];
        n++;
      }
      if (n) v = v * (1 - mix) + (acc / n) * mix;
      dst[i] = Math.min(1, Math.max(0, v * decay));
    }
  }
}

function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function antennaeOf(x, y, heading, reach) {
  return {
    lx: x + Math.cos(heading - 0.62) * reach,
    ly: y + Math.sin(heading - 0.62) * reach,
    rx: x + Math.cos(heading + 0.62) * reach,
    ry: y + Math.sin(heading + 0.62) * reach,
  };
}

function eyesOf(x, y, heading) {
  return {
    lx: x + Math.cos(heading - 0.72) * 0.55,
    ly: y + Math.sin(heading - 0.72) * 0.55,
    rx: x + Math.cos(heading + 0.72) * 0.55,
    ry: y + Math.sin(heading + 0.72) * 0.55,
  };
}

function sideWeight(heading, tx, ty, x, y) {
  const ang = Math.atan2(ty - y, tx - x);
  let d = ang - heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const L = Math.max(0, Math.sin(-d) * 0.5 + 0.5);
  const R = Math.max(0, Math.sin(d) * 0.5 + 0.5);
  return { L, R };
}

export function intactCaps() {
  return {
    "olfaction.antennal.L": true,
    "olfaction.antennal.R": true,
    "olfaction.palp": true,
    "vision.L": true,
    "vision.R": true,
    "johnston.L": true,
    "johnston.R": true,
    "taste.tarsal.sweet": true,
    "taste.tarsal.bitter": true,
    "taste.labellar.sweet": true,
    "taste.labellar.bitter": true,
    "motor.proboscis": true,
    "motor.legs": true,
  };
}

/** Misma ecuación que MOSCA src/sim/behavior.ts */
export function integrateBehavior(snap, heading, lastFerm, preferT, time, rng) {
  const o = snap.olfaction;
  const ferm = (o.fermL + o.fermR) * 0.5;
  const geo = (o.geosminL + o.geosminR) * 0.5;
  const co2 = (o.co2L + o.co2R) * 0.5;
  const windMag = Math.hypot(snap.airX, snap.airY);

  let turn = (o.fermR - o.fermL) * 5.2;
  turn -= (o.geosminR - o.geosminL) * 6.1;
  turn -= (o.co2R - o.co2L) * 3.4;
  if (ferm > 0.05 && Math.abs(o.fermR - o.fermL) < 0.012 && ferm < lastFerm - 0.008) {
    turn += (rng() > 0.5 ? 1 : -1) * 2.6;
  }
  if (ferm > 0.06 && windMag > 0.1) {
    turn += angDiff(heading, Math.atan2(-snap.airY, -snap.airX)) * ferm * 1.2;
  }

  const dT = snap.tempBody - preferT;
  turn += (snap.tempR - snap.tempL) * (dT > 1.2 ? -1.6 : dT < -1.2 ? 1.4 : 0.15);
  const humidDrive = snap.humidity - 0.55;
  if (Math.abs(humidDrive) > 0.12) turn += (rng() - 0.5) * 0.4;

  if (snap.light < 0.18) turn += (rng() - 0.5) * 0.35;
  turn += snap.motion * 1.8;
  if (snap.gustation.bitter > 0.28) turn += (rng() > 0.5 ? 1 : -1) * 5.0;

  const approach = Math.max(0, ferm - geo * 1.1 - co2 * 0.7);
  const avoid = Math.max(geo, co2 * 0.8, snap.gustation.bitter, Math.max(0, dT - 4) * 0.12);
  const escape = snap.looming > 0.24 ? 1 : 0;
  const optomotor = Math.abs(snap.motion);

  let dominant = "exploración / ruido de rumbo";
  let evidence = ["mechanosense-walls"];
  let action = "camina";
  const trop = Math.abs(o.fermR - o.fermL);
  if (escape > 0) {
    dominant = "looming visual superó el umbral del modelo LC4→GF";
    evidence = ["looming-gf"];
    action = "escape";
    turn += (rng() > 0.5 ? 1 : -1) * (1.1 + rng() * 1.3);
  } else if (snap.gustation.bitter > 0.4) {
    dominant = "contacto amargo (GRN). El modelo no olió amargo a distancia";
    evidence = ["bitter-taste-contact"];
    action = "rechazo";
  } else if (geo > 0.12 && geo > ferm * 0.7) {
    dominant = "más geosmina que fermentación en las antenas";
    evidence = ["geosmin-or56a"];
    action = "evita geosmina";
  } else if (trop > 0.02 && ferm > 0.05) {
    dominant = o.fermL > o.fermR ? "más fermentación en antena izquierda" : "más fermentación en antena derecha";
    evidence = ["food-odor-tropotaxis"];
    action = "sigue fermentación";
  } else if (Math.abs(dT) > 2.4) {
    dominant = dT > 0 ? "cuerpo más caliente que la preferencia del modelo" : "cuerpo más frío que la preferencia del modelo";
    evidence = ["thermosensation"];
    action = "termotaxis";
  } else if (optomotor > 0.15) {
    dominant = "movimiento panorámico local (optomotor, modelo C)";
    evidence = ["optomotor"];
    action = "sigue el patrón";
  }

  const feed = snap.gustation.sugar > 0.42 && snap.gustation.bitter < 0.2 && escape < 0.2;
  const walk = escape ? 5.1 : feed ? 0.12 : snap.gustation.bitter > 0.3 ? 0.7 : 1.65;

  return {
    turn,
    walk,
    feed,
    escape: escape > 0,
    recoil: snap.gustation.bitter > 0.4,
    decision: {
      time,
      action,
      inputs: [
        { name: "ferm L/R", value: o.fermL * 1000 + o.fermR },
        { name: "geosmin", value: geo },
        { name: "CO₂", value: co2 },
        { name: "azúcar", value: snap.gustation.sugar },
        { name: "amargo", value: snap.gustation.bitter },
        { name: "temp", value: snap.tempBody },
        { name: "looming", value: snap.looming },
      ],
      drives: { approach, avoid, escape, optomotor },
      dominantCause: dominant,
      evidenceIds: evidence,
    },
  };
}

export function senseAt(room, x, y, heading, caps) {
  const a = antennaeOf(x, y, heading, ANTENNA_REACH);
  const e = eyesOf(x, y, heading);
  const f = room.fields;

  const rawFermL = sample(f.ferm, a.lx, a.ly);
  const rawFermR = sample(f.ferm, a.rx, a.ry);
  const rawGeoL = sample(f.geosmin, a.lx, a.ly);
  const rawGeoR = sample(f.geosmin, a.rx, a.ry);
  const rawCo2L = sample(f.co2, a.lx, a.ly);
  const rawCo2R = sample(f.co2, a.rx, a.ry);
  const palp = caps["olfaction.palp"]
    ? PALP_RESIDUAL * Math.max(sample(f.ferm, x, y), sample(f.geosmin, x, y), sample(f.co2, x, y))
    : 0;

  const olfL = caps["olfaction.antennal.L"];
  const olfR = caps["olfaction.antennal.R"];
  const olfaction = {
    fermL: olfL ? rawFermL : palp,
    fermR: olfR ? rawFermR : palp,
    geosminL: olfL ? rawGeoL : caps["olfaction.palp"] ? PALP_RESIDUAL * sample(f.geosmin, x, y) : 0,
    geosminR: olfR ? rawGeoR : caps["olfaction.palp"] ? PALP_RESIDUAL * sample(f.geosmin, x, y) : 0,
    co2L: olfL ? rawCo2L : caps["olfaction.palp"] ? PALP_RESIDUAL * sample(f.co2, x, y) : 0,
    co2R: olfR ? rawCo2R : caps["olfaction.palp"] ? PALP_RESIDUAL * sample(f.co2, x, y) : 0,
    palpResidual: palp,
  };

  const gustation = {
    sugar: caps["taste.tarsal.sweet"] || caps["taste.labellar.sweet"] ? sample(f.sugar, x, y) : 0,
    bitter: caps["taste.tarsal.bitter"] || caps["taste.labellar.bitter"] ? sample(f.bitter, x, y) : 0,
  };

  let loomingL = 0;
  let loomingR = 0;
  for (const s of room.looms) {
    const dist = Math.hypot(x - s.x, y - s.y);
    if (dist >= s.r + 5) continue;
    const mag = (1 - dist / 12) * s.life;
    const wgt = sideWeight(heading, s.x, s.y, x, y);
    loomingL = Math.max(loomingL, mag * wgt.L);
    loomingR = Math.max(loomingR, mag * wgt.R);
  }
  if (!caps["vision.L"]) loomingL = 0;
  if (!caps["vision.R"]) loomingR = 0;

  const airL = caps["johnston.L"]
    ? { x: sample(f.airX, a.lx, a.ly), y: sample(f.airY, a.lx, a.ly) }
    : { x: 0, y: 0 };
  const airR = caps["johnston.R"]
    ? { x: sample(f.airX, a.rx, a.ry), y: sample(f.airY, a.rx, a.ry) }
    : { x: 0, y: 0 };
  const joN = (caps["johnston.L"] ? 1 : 0) + (caps["johnston.R"] ? 1 : 0);
  const airX = joN ? (airL.x + airR.x) / joN : 0;
  const airY = joN ? (airL.y + airR.y) / joN : 0;

  const lightL = caps["vision.L"] ? sample(f.light, e.lx, e.ly) : 0;
  const lightR = caps["vision.R"] ? sample(f.light, e.rx, e.ry) : 0;
  const feel = 0.45;
  const nx = x + Math.cos(heading) * feel;
  const ny = y + Math.sin(heading) * feel;
  const wallAhead = !inBounds(nx, ny);

  return {
    olfaction,
    gustation,
    tempL: sample(f.temp, a.lx, a.ly),
    tempR: sample(f.temp, a.rx, a.ry),
    tempBody: sample(f.temp, x, y),
    humidity: sample(f.humidity, x, y),
    light: (lightL + lightR) * 0.5,
    lightL,
    lightR,
    airX,
    airY,
    looming: Math.max(loomingL, loomingR),
    loomingL,
    loomingR,
    motion: 0,
    motionL: 0,
    motionR: 0,
    wallAhead,
  };
}

function wrapDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function leak(cur, target, k) {
  return cur + (target - cur) * k;
}

/**
 * Three.js: heading 0 mira +Z, avanza (sin h, cos h) en (x,z).
 * MOSCA: heading 0 mira +X, avanza (cos h, sin h) en (x,y) con y = AR z.
 */
export function threeToMoscaHeading(th) {
  return Math.PI / 2 - th;
}

export function moscaToThreeHeading(mh) {
  return Math.PI / 2 - mh;
}

export function createFlyRoom({ seed = 7, cellMeters = 0.15, locomotorScale = 0.35 } = {}) {
  const rng = mulberry32(seed);
  const wall = new Uint8Array(N);
  const fields = {
    ferm: new Float32Array(N),
    geosmin: new Float32Array(N),
    co2: new Float32Array(N),
    sugar: new Float32Array(N),
    bitter: new Float32Array(N),
    temp: new Float32Array(N).fill(PREFER_T),
    humidity: new Float32Array(N).fill(0.55),
    light: new Float32Array(N).fill(0.72),
    airX: new Float32Array(N),
    airY: new Float32Array(N),
    scratch: new Float32Array(N),
  };

  const room = {
    fields,
    wall,
    looms: [],
    emitters: [],
    markers: [],
    origin: { x: 0, z: 0 },
    x: COLS / 2,
    y: ROWS / 2,
    heading: Math.PI / 2,
    lastFerm: 0,
    time: 0,
    rng,
    caps: intactCaps(),
    cellMeters,
    locomotorScale,
    lastIntent: null,
    lastSnap: null,
    speed: 0,
    bound: false,
  };

  function arToCell(arX, arZ) {
    return {
      x: (arX - room.origin.x) / cellMeters + COLS / 2,
      y: (arZ - room.origin.z) / cellMeters + ROWS / 2,
    };
  }

  function cellToAr(cx, cy) {
    return {
      x: room.origin.x + (cx - COLS / 2) * cellMeters,
      z: room.origin.z + (cy - ROWS / 2) * cellMeters,
    };
  }

  room.bindOrigin = (arX, arZ, threeHeading = 0) => {
    room.origin.x = arX;
    room.origin.z = arZ;
    room.x = COLS / 2;
    room.y = ROWS / 2;
    room.heading = threeToMoscaHeading(threeHeading);
    room.lastFerm = 0;
    room.time = 0;
    room.bound = true;
    room.speed = 0;
  };

  room.syncPose = (arX, arZ, threeHeading) => {
    const c = arToCell(arX, arZ);
    room.x = Math.min(COLS - 2.2, Math.max(2.2, c.x));
    room.y = Math.min(ROWS - 2.2, Math.max(2.2, c.y));
    room.heading = threeToMoscaHeading(threeHeading);
  };

  room.drop = (channel, arX, arZ, rate = 0.55) => {
    const c = arToCell(arX, arZ);
    if (!inBounds(c.x, c.y)) return null;
    const em = { channel, x: c.x, y: c.y, rate, life: 36, rad: 5.2 };
    room.emitters.push(em);
    injectDisk(fields[channel], c.x, c.y, 5.5, rate);
    const marker = { channel, arX, arZ, life: 28 };
    room.markers.push(marker);
    return marker;
  };

  room.paintTaste = (kind, arX, arZ) => {
    const c = arToCell(arX, arZ);
    injectDisk(fields[kind], c.x, c.y, 1.6, 0.9);
    const marker = { channel: kind, arX, arZ, life: 90 };
    room.markers.push(marker);
    return marker;
  };

  room.setLiveLoom = (arX, arZ, life = 1) => {
    const c = arToCell(arX, arZ);
    const distM = Math.hypot(arX - (room.origin.x + (room.x - COLS / 2) * cellMeters), arZ - (room.origin.z + (room.y - ROWS / 2) * cellMeters));
    const r = 3 + Math.max(0, 4 - distM / cellMeters);
    room.looms = [{ x: c.x, y: c.y, vx: 0, vy: 0, r, life, speed: 0 }];
  };

  room.clearLoom = () => {
    room.looms = [];
  };

  room.occludeAntenna = (side) => {
    const key = side === "L" ? "olfaction.antennal.L" : "olfaction.antennal.R";
    room.caps[key] = !room.caps[key];
    return room.caps[key];
  };

  room.antennaOn = (side) => room.caps[side === "L" ? "olfaction.antennal.L" : "olfaction.antennal.R"];

  room.why = () => room.lastIntent?.decision?.dominantCause || "sin decisión aún";
  room.action = () => room.lastIntent?.decision?.action || "camina";

  room.pose = () => {
    const p = cellToAr(room.x, room.y);
    return {
      arX: p.x,
      arZ: p.z,
      threeHeading: moscaToThreeHeading(room.heading),
      walk: room.lastIntent?.walk ?? 0,
      escape: !!room.lastIntent?.escape,
      feed: !!room.lastIntent?.feed,
      recoil: !!room.lastIntent?.recoil,
      action: room.action(),
      why: room.why(),
      ferm: room.lastFerm,
      geo: room.lastSnap
        ? (room.lastSnap.olfaction.geosminL + room.lastSnap.olfaction.geosminR) * 0.5
        : 0,
    };
  };

  room.step = (dt) => {
    if (!room.bound) return room.pose();
    dt = Math.min(0.05, Math.max(0.001, dt));
    room.time += dt;

    for (const em of room.emitters) {
      em.life -= dt;
      if (em.life > 0 && fields[em.channel]) injectDisk(fields[em.channel], em.x, em.y, em.rad, em.rate * dt * 1.8);
    }
    room.emitters = room.emitters.filter((e) => e.life > 0);
    room.markers = room.markers.filter((m) => {
      m.life -= dt;
      return m.life > 0;
    });

    stepChemical(fields.ferm, fields.scratch, wall, fields.airX, fields.airY, dt);
    fields.ferm.set(fields.scratch);
    stepChemical(fields.geosmin, fields.scratch, wall, fields.airX, fields.airY, dt);
    fields.geosmin.set(fields.scratch);
    stepChemical(fields.co2, fields.scratch, wall, fields.airX, fields.airY, dt);
    fields.co2.set(fields.scratch);

    for (const s of room.looms) {
      s.r += dt * 2;
      s.life -= dt * 0.12;
    }
    room.looms = room.looms.filter((s) => s.life > 0 && s.r < 26);

    const snap = senseAt(room, room.x, room.y, room.heading, room.caps);
    const intent = integrateBehavior(snap, room.heading, room.lastFerm, PREFER_T, room.time, rng);
    room.lastSnap = snap;
    room.lastIntent = intent;
    room.lastFerm = (snap.olfaction.fermL + snap.olfaction.fermR) * 0.5;

    const walk = intent.escape ? 5.1 : intent.walk;
    room.speed = leak(room.speed, walk, 0.3);
    room.heading += intent.turn * dt * 1.12;
    room.heading += Math.sin(room.time * 2.4) * (room.lastFerm > 0.07 ? 0.08 : 0.38) * dt;

    const stepCells = room.speed * dt * 5.6 * locomotorScale;
    let nx = room.x + Math.cos(room.heading) * stepCells;
    let ny = room.y + Math.sin(room.heading) * stepCells;
    if (!inBounds(nx, ny) || snap.wallAhead) {
      room.heading += (rng() > 0.5 ? 1 : -1) * (1.1 + rng() * 1.4);
    } else {
      room.x = nx;
      room.y = ny;
    }
    room.x = Math.min(COLS - 2.2, Math.max(2.2, room.x));
    room.y = Math.min(ROWS - 2.2, Math.max(2.2, room.y));
    return room.pose();
  };

  room.arToCell = arToCell;
  room.cellToAr = cellToAr;
  return room;
}
