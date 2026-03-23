// ══════════════════════════════════════════════════════
//  Premium Animated Background System
//  Elegant · Futuristic · Calm · High-End
// ══════════════════════════════════════════════════════

const GameBackground = (() => {
    let W = 0, H = 0;
    let bgTime = 0;

    // ── Floating particles ──
    const PARTICLE_COUNT = 45;
    let bgParticles = [];

    function initParticles(w, h) {
        bgParticles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            bgParticles.push(createParticle(w, h, true));
        }
    }

    function createParticle(w, h, randomY) {
        const size = 0.5 + Math.random() * 2;
        const layer = Math.random(); // 0=far, 1=near
        return {
            x: Math.random() * w,
            y: randomY ? Math.random() * h : -10,
            size,
            layer,
            speed: 0.08 + layer * 0.15,
            driftX: (Math.random() - 0.5) * 0.3,
            alpha: 0.15 + layer * 0.35,
            hue: Math.random() < 0.5 ? 190 : 260, // cyan or purple
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.005 + Math.random() * 0.01
        };
    }

    // ── Light orbs (parallax) ──
    const ORB_COUNT = 5;
    let orbs = [];

    function initOrbs(w, h) {
        orbs = [];
        for (let i = 0; i < ORB_COUNT; i++) {
            orbs.push({
                x: Math.random() * w,
                y: Math.random() * h,
                baseX: Math.random() * w,
                baseY: Math.random() * h,
                radius: 30 + Math.random() * 60,
                alpha: 0.015 + Math.random() * 0.025,
                hue: [190, 230, 270, 200, 250][i],
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                speedX: 0.001 + Math.random() * 0.002,
                speedY: 0.0008 + Math.random() * 0.0015
            });
        }
    }

    // ── Grid lines ──
    const GRID_SPACING = 40;

    // ── Init ──
    function init(w, h) {
        W = w; H = h;
        bgTime = 0;
        initParticles(w, h);
        initOrbs(w, h);
    }

    function resize(w, h) {
        W = w; H = h;
        initParticles(w, h);
        initOrbs(w, h);
    }

    // ── Draw ──
    function draw(ctx, dt) {
        bgTime += dt * 0.016;

        drawBaseGradient(ctx);
        drawGrid(ctx);
        drawWaves(ctx);
        drawOrbs(ctx);
        drawFog(ctx);
        drawFloatingParticles(ctx, dt);
        drawShimmer(ctx);
    }

    // 1. Deep dark animated gradient base
    function drawBaseGradient(ctx) {
        const shift = Math.sin(bgTime * 0.3) * 0.02;
        const grad = ctx.createRadialGradient(
            W * (0.5 + shift), H * (0.4 + Math.sin(bgTime * 0.2) * 0.05), W * 0.1,
            W * 0.5, H * 0.5, W * 0.9
        );
        grad.addColorStop(0, '#0c0c24');
        grad.addColorStop(0.4, '#07071a');
        grad.addColorStop(0.7, '#050514');
        grad.addColorStop(1, '#030310');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // 2. 3D Perspective grid with vanishing point
    function drawGrid(ctx) {
        const gridAlpha = 0.03 + Math.sin(bgTime * 0.5) * 0.012;
        const vanishX = W * 0.5;
        const vanishY = H * 0.35 + Math.sin(bgTime * 0.2) * 10;

        ctx.save();

        // Horizontal depth lines (converge toward vanishing point)
        const horizCount = 14;
        for (let i = 0; i < horizCount; i++) {
            const t = i / (horizCount - 1);
            const y = vanishY + (H - vanishY) * Math.pow(t, 1.6); // non-linear for perspective
            const spreadFactor = 0.05 + t * 0.95;
            const x1 = vanishX - (W * 0.6) * spreadFactor;
            const x2 = vanishX + (W * 0.6) * spreadFactor;
            const localAlpha = gridAlpha * (0.15 + t * 0.85) * (0.5 + 0.5 * Math.sin(bgTime * 0.3 + i * 0.4));

            ctx.globalAlpha = localAlpha;
            ctx.strokeStyle = '#1a3a5a';
            ctx.lineWidth = 0.3 + t * 0.5;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        }

        // Vertical converging lines (radiate from vanishing point)
        const vertCount = 10;
        for (let i = 0; i < vertCount; i++) {
            const t = (i / (vertCount - 1)) * 2 - 1; // -1 to 1
            const bottomX = vanishX + t * W * 0.6;
            const localAlpha = gridAlpha * 0.8 * (0.5 + 0.5 * Math.sin(bgTime * 0.25 + i * 0.5));

            ctx.globalAlpha = localAlpha;
            ctx.strokeStyle = '#1a3a5a';
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(bottomX, H);
            ctx.stroke();
        }

        // Subtle flat top grid (above vanishing point) very faint
        ctx.globalAlpha = gridAlpha * 0.3;
        for (let x = 0; x < W; x += GRID_SPACING) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, vanishY);
            ctx.stroke();
        }
        for (let y = 0; y < vanishY; y += GRID_SPACING) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 3. Neon gradient energy waves
    function drawWaves(ctx) {
        ctx.save();
        for (let w = 0; w < 3; w++) {
            const waveAlpha = 0.018 - w * 0.004;
            const hue = 190 + w * 35; // cyan → blue → purple
            ctx.globalAlpha = waveAlpha;
            ctx.beginPath();

            for (let x = 0; x <= W; x += 4) {
                const yOff = Math.sin(x * 0.008 + bgTime * (0.4 + w * 0.15) + w * 2) * (30 + w * 15)
                           + Math.sin(x * 0.015 + bgTime * 0.2) * 10;
                const y = H * (0.35 + w * 0.15) + yOff;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
            ctx.lineWidth = 1.5 + w * 0.5;
            ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;
            ctx.shadowBlur = 12;
            ctx.stroke();
        }
        ctx.restore();
    }

    // 4. Parallax floating light orbs
    function drawOrbs(ctx) {
        ctx.save();
        for (const orb of orbs) {
            orb.phaseX += orb.speedX;
            orb.phaseY += orb.speedY;
            orb.x = orb.baseX + Math.sin(orb.phaseX) * 40;
            orb.y = orb.baseY + Math.sin(orb.phaseY) * 30;

            const pulseAlpha = orb.alpha * (0.7 + 0.3 * Math.sin(bgTime * 0.8 + orb.phaseX));
            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
            grad.addColorStop(0, `hsla(${orb.hue}, 70%, 55%, ${pulseAlpha})`);
            grad.addColorStop(0.5, `hsla(${orb.hue}, 60%, 40%, ${pulseAlpha * 0.3})`);
            grad.addColorStop(1, `hsla(${orb.hue}, 50%, 30%, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 5. Soft glowing fog in corners
    function drawFog(ctx) {
        ctx.save();
        const fogAlpha = 0.04 + Math.sin(bgTime * 0.3) * 0.015;

        // Bottom-left fog
        const fog1 = ctx.createRadialGradient(0, H, 0, 0, H, H * 0.5);
        fog1.addColorStop(0, `rgba(80, 30, 120, ${fogAlpha})`);
        fog1.addColorStop(1, 'rgba(80, 30, 120, 0)');
        ctx.fillStyle = fog1;
        ctx.fillRect(0, 0, W, H);

        // Top-right fog
        const fog2Alpha = 0.03 + Math.sin(bgTime * 0.4 + 1) * 0.012;
        const fog2 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.45);
        fog2.addColorStop(0, `rgba(0, 120, 140, ${fog2Alpha})`);
        fog2.addColorStop(1, 'rgba(0, 120, 140, 0)');
        ctx.fillStyle = fog2;
        ctx.fillRect(0, 0, W, H);

        // Center subtle glow
        const fog3Alpha = 0.02 + Math.sin(bgTime * 0.25 + 2) * 0.008;
        const fog3 = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.35);
        fog3.addColorStop(0, `rgba(30, 50, 120, ${fog3Alpha})`);
        fog3.addColorStop(1, 'rgba(30, 50, 120, 0)');
        ctx.fillStyle = fog3;
        ctx.fillRect(0, 0, W, H);

        ctx.restore();
    }

    // 6. Floating dust particles
    function drawFloatingParticles(ctx, dt) {
        ctx.save();
        for (let i = bgParticles.length - 1; i >= 0; i--) {
            const p = bgParticles[i];

            // Move
            p.y += p.speed * dt;
            p.x += p.driftX * dt + Math.sin(bgTime * 0.5 + p.pulse) * 0.1;
            p.pulse += p.pulseSpeed;

            // Recycle
            if (p.y > H + 10 || p.x < -10 || p.x > W + 10) {
                bgParticles[i] = createParticle(W, H, false);
                bgParticles[i].x = Math.random() * W;
                continue;
            }

            const pulseAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

            // Glow
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${pulseAlpha})`);
            grad.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Core dot
            ctx.fillStyle = `hsla(${p.hue}, 90%, 85%, ${pulseAlpha * 1.2})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 7. Occasional shimmer pulse
    function drawShimmer(ctx) {
        // Subtle pulse every ~4 seconds
        const cycle = bgTime * 0.25;
        const shimmerPhase = cycle - Math.floor(cycle);
        if (shimmerPhase > 0.85) {
            const intensity = (shimmerPhase - 0.85) / 0.15; // 0→1
            const fade = Math.sin(intensity * Math.PI); // bell curve
            ctx.save();
            ctx.globalAlpha = fade * 0.035;

            const shimmerGrad = ctx.createRadialGradient(
                W * 0.5, H * 0.5, 0,
                W * 0.5, H * 0.5, W * 0.6
            );
            shimmerGrad.addColorStop(0, '#00e5ff');
            shimmerGrad.addColorStop(0.5, '#6c5ce7');
            shimmerGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = shimmerGrad;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
    }

    return { init, resize, draw };
})();
