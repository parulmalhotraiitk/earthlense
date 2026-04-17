/* =============================================
   EARTHLENS AI — ANIMATED GLOBE (Canvas)
   ============================================= */

const Globe = (() => {
  let canvas, ctx, W, H, animId;
  let time = 0;

  const STAR_COUNT = 200;
  const stars = [];

  // Lat/lon points of major Earth features (simplified)
  const LAND_ARCS = [
    // North America
    { lat: [25,70], lon: [-140,-60], color: 'rgba(34,197,94,0.85)' },
    // South America
    { lat: [-55,12], lon: [-80,-35], color: 'rgba(34,197,94,0.80)' },
    // Europe
    { lat: [35,70], lon: [-10,40], color: 'rgba(34,197,94,0.75)' },
    // Africa
    { lat: [-35,38], lon: [-18,52], color: 'rgba(34,197,94,0.80)' },
    // Asia
    { lat: [0,75], lon: [60,150], color: 'rgba(34,197,94,0.75)' },
    // Australia
    { lat: [-43,-12], lon: [114,155], color: 'rgba(34,197,94,0.75)' },
  ];

  function initStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        blink: Math.random() * Math.PI * 2
      });
    }
  }

  function latLonToXY(lat, lon, rotation, cx, cy, R) {
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + rotation) * Math.PI / 180;
    const x3 = R * Math.sin(phi) * Math.cos(theta);
    const y3 = R * Math.cos(phi);
    const z3 = R * Math.sin(phi) * Math.sin(theta);
    if (z3 < 0) return null; // behind globe
    return { x: cx + x3, y: cy - y3, z: z3 };
  }

  function drawFrame() {
    if (!canvas) return;
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const R  = Math.min(W, H) * 0.38;
    const rotation = time * 8; // degrees

    // Stars
    for (const s of stars) {
      const flickerOpacity = s.opacity * (0.7 + 0.3 * Math.sin(time * 0.5 + s.blink));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${flickerOpacity})`;
      ctx.fill();
    }

    // Globe base glow
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0,   'rgba(14,165,233,0.30)');
    bgGrad.addColorStop(0.5, 'rgba(34,197,94,0.15)');
    bgGrad.addColorStop(1,   'rgba(20,184,166,0.05)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Latitude lines
    ctx.strokeStyle = 'rgba(34,197,94,0.18)';
    ctx.lineWidth = 0.8;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = cy - R * Math.sin(lat * Math.PI / 180);
      const cosLat = Math.cos(lat * Math.PI / 180);
      const rx = R * cosLat;
      if (rx > 5) {
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, rx * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Longitude lines (meridians)
    for (let lon = 0; lon < 360; lon += 30) {
      const adjustedLon = lon + rotation;
      const cosLon = Math.cos(adjustedLon * Math.PI / 180);
      if (cosLon >= 0) { // front hemisphere
        ctx.beginPath();
        ctx.strokeStyle = `rgba(34,197,94,${0.10 + cosLon * 0.15})`;
        ctx.lineWidth = 0.8;
        for (let lat = -90; lat <= 90; lat += 5) {
          const pt = latLonToXY(lat, lon, rotation, cx, cy, R);
          if (!pt) continue;
          if (lat === -90) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
    }

    // Land masses (simplified dot clusters)
    for (const arc of LAND_ARCS) {
      const [latMin, latMax] = arc.lat;
      const [lonMin, lonMax] = arc.lon;
      for (let dLat = latMin; dLat <= latMax; dLat += 4) {
        for (let dLon = lonMin; dLon <= lonMax; dLon += 5) {
          // Add some organic variation
          const jLat = dLat + (Math.sin(dLon * 0.3) * 2);
          const jLon = dLon + (Math.cos(dLat * 0.3) * 2);
          const pt = latLonToXY(jLat, jLon, rotation, cx, cy, R);
          if (!pt) continue;
          const brightness = 0.4 + (pt.z / R) * 0.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = arc.color.replace('0.', `${brightness.toFixed(2) * parseFloat('0.')}`);
          // Simple brightness via color
          ctx.fillStyle = `rgba(34,197,94,${brightness * 0.5})`;
          ctx.fill();
        }
      }
    }

    // Globe outline
    const rimGrad = ctx.createRadialGradient(cx - R*0.3, cy - R*0.3, R*0.1, cx, cy, R);
    rimGrad.addColorStop(0,   'rgba(14,165,233,0.3)');
    rimGrad.addColorStop(0.7, 'rgba(20,184,166,0.15)');
    rimGrad.addColorStop(1,   'rgba(34,197,94,0.05)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Atmosphere glow
    const atmGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.15);
    atmGrad.addColorStop(0,   'rgba(14,165,233,0)');
    atmGrad.addColorStop(0.5, 'rgba(14,165,233,0.04)');
    atmGrad.addColorStop(1,   'rgba(14,165,233,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = atmGrad;
    ctx.fill();

    // Highlight (specular)
    const hiliteGrad = ctx.createRadialGradient(cx - R*0.35, cy - R*0.35, 0, cx, cy, R);
    hiliteGrad.addColorStop(0,   'rgba(255,255,255,0.12)');
    hiliteGrad.addColorStop(0.3, 'rgba(255,255,255,0.03)');
    hiliteGrad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = hiliteGrad;
    ctx.fill();

    time += 0.004;
    animId = requestAnimationFrame(drawFrame);
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    initStars();
    drawFrame();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
  }

  return { init, destroy };
})();
