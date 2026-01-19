const COLORS = ["GREEN", "AMBER", "RED"];

export function waveDistanceMeters(periodSeconds) {
  const p = Number(periodSeconds);
  if (!Number.isFinite(p) || p <= 0) return null;
  return 1.56 * p * p;
}

function colorRank(color) {
  return COLORS.indexOf(color);
}

function worstColor(a, b) {
  return colorRank(a) > colorRank(b) ? a : b;
}

export function classifyWindMph(windMph) {
  const w = Number(windMph);
  if (!Number.isFinite(w)) return "AMBER";
  if (w <= 10) return "GREEN";
  if (w <= 16) return "AMBER";
  return "RED";
}

export function classifyWaveHeightM(waveM) {
  const h = Number(waveM);
  if (!Number.isFinite(h)) return "AMBER";
  if (h <= 0.5) return "GREEN";
  if (h <= 0.8) return "AMBER";
  return "RED";
}

export function classifyWaveDistanceM(distanceM) {
  const d = Number(distanceM);
  if (!Number.isFinite(d)) return "AMBER";
  if (d >= 40) return "GREEN";
  if (d >= 25) return "AMBER";
  return "RED";
}

/*
  Tide direction is simplified for your use case:
  - Flood: generally runs east along this stretch
  - Ebb: generally runs west
  This is a local rule of thumb to support "wind against tide" assessment.
*/
function tideFlowDirection(tideState) {
  if (tideState === "FLOOD") return "E";
  if (tideState === "EBB") return "W";
  return null; // slack
}

function oppositeDir(dir) {
  const map = { N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", NW: "SE" };
  return map[dir] || null;
}

function hasEasterlyComponent(dir) {
  return ["E", "NE", "SE"].includes(dir);
}

export function computeStatus(inputs) {
  const reasons = [];
  const escalators = [];

  const windColor = classifyWindMph(inputs.windMph);
  reasons.push(`Wind ${inputs.windMph} mph (${windColor})`);

  const waveHeightColor = classifyWaveHeightM(inputs.waveHeightM);
  reasons.push(`Waves ${inputs.waveHeightM} m (${waveHeightColor})`);

  const dist = waveDistanceMeters(inputs.wavePeriodS);
  const distRounded = dist == null ? null : Math.round(dist);
  const waveDistanceColor = classifyWaveDistanceM(distRounded);
  reasons.push(
    `Wave period ${inputs.wavePeriodS} s, distance ${distRounded ?? "?"} m (${waveDistanceColor})`
  );

  let base = "GREEN";
  base = worstColor(base, windColor);
  base = worstColor(base, waveHeightColor);
  base = worstColor(base, waveDistanceColor);

  // Escalator A: wind against tide when tide is running strongly (mid/spring)
  const flowDir = tideFlowDirection(inputs.tideState);
  const windDir = inputs.windDir;
  const tideStrength = inputs.tideStrength; // NEAP | MID | SPRING

  const strongTide = tideStrength === "MID" || tideStrength === "SPRING";
  const windAgainstTide =
    flowDir && windDir && oppositeDir(flowDir) === windDir; // simplified direct opposition

  if (windAgainstTide && strongTide) {
    escalators.push("Wind against tide with mid or spring flow");
  }

  // Escalator B: easterly component above threshold
  const w = Number(inputs.windMph);
  if (hasEasterlyComponent(windDir) && Number.isFinite(w) && w >= 12) {
    escalators.push("E or NE or SE wind 12+ mph (Newhaven onshore chop and rebound)");
  }

  // Escalator C: reduced safety margin
  if (inputs.night === true) escalators.push("Night conditions");
  if (inputs.poorVisibility === true) escalators.push("Poor visibility");
  if (inputs.crewProfile === "MIXED") escalators.push("Mixed ability crew");

  // Apply bump-one-colour-worse logic per escalator, capped at RED
  let finalColor = base;
  const bumps = escalators.length;

  for (let i = 0; i < bumps; i += 1) {
    if (finalColor === "GREEN") finalColor = "AMBER";
    else if (finalColor === "AMBER") finalColor = "RED";
  }

  // Controls if AMBER
  const controls = [];
  if (finalColor === "AMBER") {
    controls.push("Experienced cox and crew only");
    controls.push("Short route with clear shelter and return options");
    controls.push("Pre-brief brace, hold water, recovery timing, and turn-back point");
    controls.push("Reassess at harbour mouth before committing");
  }

  // Auto RED notes
  if (finalColor === "RED") {
    controls.push("No sea rowing for gigs under this call");
  }

  const summary = buildShareText({
    ...inputs,
    waveDistanceM: distRounded,
    baseColor: base,
    finalColor,
    escalators
  });

  return {
    waveDistanceM: distRounded,
    baseColor: base,
    finalColor,
    reasons,
    escalators,
    controls,
    summary
  };
}

export function buildShareText(s) {
  const bits = [];
  bits.push(`Newhaven status: ${s.finalColor}.`);
  bits.push(`Wind ${s.windMph} mph (${s.windDir}).`);
  bits.push(`Waves ${s.waveHeightM} m @ ${s.wavePeriodS} s (${s.waveDistanceM ?? "?"} m).`);
  bits.push(`Tide ${s.tideState.toLowerCase()} (${s.tideStrength.toLowerCase()}).`);
  if (s.escalators?.length) bits.push(`Escalators: ${s.escalators.join("; ")}.`);
  bits.push(`Crew: ${s.crewProfile.toLowerCase()}.`);
  return bits.join(" ");
}
