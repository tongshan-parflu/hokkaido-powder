import {
  HALF_WIDTH,
  START_Z,
  courseCenter,
  downhillHeading,
  terrainHeight,
} from './course.js';

export function createRider() {
  return {
    x: 0,
    z: 0,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    heading: 0,
    speed: 0,
    onGround: true,
  };
}

export function resetRider(rider) {
  rider.x = courseCenter(START_Z);
  rider.z = START_Z;
  rider.y = terrainHeight(rider.x, rider.z);
  rider.heading = downhillHeading(rider.x, rider.z);
  const speed = 13;
  rider.vx = Math.sin(rider.heading) * speed;
  rider.vz = Math.cos(rider.heading) * speed;
  rider.vy = 0;
  rider.onGround = true;
  rider.speed = speed;
}

function wrapAngle(a) {
  const t = Math.PI * 2;
  if (a > Math.PI || a < -Math.PI) {
    a = ((a + Math.PI) % t + t) % t - Math.PI;
  }
  return a;
}

/**
 * Advance the rider. `env.collide(x, z, airHeight)` returns an obstacle or null.
 * Input: { steer: -1..1 (positive = left), tuck, brake, jump }.
 */
export function stepPhysics(rider, dt, input, env) {
  const events = {
    crashed: null,
    jumped: false,
    landed: false,
    spray: null,
  };

  const steer = Math.max(-1, Math.min(1, input.steer || 0));
  const brake = !!input.brake;
  const tuck = !!input.tuck && !brake;
  let speed = Math.hypot(rider.vx, rider.vz);
  const turn =
    (tuck ? 0.85 : 1.45) * Math.max(0.55, 1 - speed / 60) * (rider.onGround ? 1 : 0.45);
  if (rider.onGround) {
    const fall = downhillHeading(rider.x, rider.z);
    const off = rider.x - courseCenter(rider.z);
    const aim = wrapAngle(fall - Math.max(-0.62, Math.min(0.62, off * 0.045)));
    if (Math.abs(steer) < 0.08) {
      const diff = wrapAngle(aim - rider.heading);
      const rate = speed < 6 ? 3.2 : 2.1;
      const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
      rider.heading = wrapAngle(rider.heading + step);
    } else {
      rider.heading = wrapAngle(rider.heading + steer * turn * dt);
      const off = wrapAngle(rider.heading - fall);
      const limit = 0.7;
      if (off > limit) rider.heading = wrapAngle(fall + limit);
      else if (off < -limit) rider.heading = wrapAngle(fall - limit);
    }
  } else {
    rider.heading = wrapAngle(rider.heading + steer * turn * dt);
  }

  if (input.jump && rider.onGround && speed > 4.5) {
    rider.onGround = false;
    rider.vy = 6.3 + Math.min(speed, 28) * 0.05;
    rider.y += 0.04;
    events.jumped = true;
  }

  const steps = Math.max(1, Math.min(5, Math.ceil((speed * dt) / 0.45)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    integrate(rider, h, steer, tuck, brake, env, events);
    if (events.crashed) break;
  }

  rider.speed = Math.hypot(rider.vx, rider.vz);
  if (rider.onGround && rider.speed > 6.5) {
    if (brake) events.spray = 'both';
    else if (steer > 0.22) events.spray = 'left';
    else if (steer < -0.22) events.spray = 'right';
  }
  return events;
}

function integrate(rider, dt, steer, tuck, brake, env, events) {
  const facingX = Math.sin(rider.heading);
  const facingZ = Math.cos(rider.heading);
  let vx = rider.vx;
  let vz = rider.vz;
  let spd = Math.hypot(vx, vz);

  const forward = vx * facingX + vz * facingZ;
  const latX = vx - facingX * forward;
  const latZ = vz - facingZ * forward;
  const carving = rider.onGround && Math.abs(steer) > 0.22 && spd > 6;
  let grip = carving ? 3.1 : 6.2;
  if (brake) grip = 8.5;
  if (!rider.onGround) grip = 1.15;
  if (spd < 1.2 && !brake) grip = 0.45;
  const k = 1 - Math.exp(-grip * dt);
  vx -= latX * k;
  vz -= latZ * k;

  const e = 1;
  const gx = (env.height(rider.x + e, rider.z) - env.height(rider.x - e, rider.z)) / (2 * e);
  const gz = (env.height(rider.x, rider.z + e) - env.height(rider.x, rider.z - e)) / (2 * e);
  if (rider.onGround) {
    vx += -gx * 10.5 * dt;
    vz += -gz * 10.5 * dt;
  }

  spd = Math.hypot(vx, vz);
  if (spd > 0.0001) {
    let drag = spd * spd * 0.0009;
    if (rider.onGround) {
      drag += brake ? 8.4 : tuck ? 0.12 : 0.82;
      if (carving) drag += Math.abs(steer) * 0.55;
    } else {
      drag += 0.04;
    }
    const next = Math.max(0, spd - drag * dt);
    const scale = next / spd;
    vx *= scale;
    vz *= scale;
    spd = next;
  }

  if (spd > 34) {
    vx *= 34 / spd;
    vz *= 34 / spd;
    spd = 34;
  }

  let nx = rider.x + vx * dt;
  let nz = rider.z + vz * dt;
  if (nz < 6) {
    nz = 6;
    if (vz < 0) vz = 0;
  }

  const ground = env.height(nx, nz);
  if (!rider.onGround) {
    rider.vy -= 16.5 * dt;
    rider.y += rider.vy * dt;
    if (rider.y <= ground) {
      events.landed = rider.vy < -7;
      rider.y = ground;
      rider.onGround = true;
      rider.vy = 0;
    }
  } else {
    rider.y = ground;
    rider.vy = 0;
  }

  const airH = rider.y - ground;
  const dx = nx - courseCenter(nz);
  if (Math.abs(dx) > 40 || Math.abs(nx) > HALF_WIDTH - 4) {
    rider.x = nx;
    rider.z = nz;
    rider.vx = vx * 0.2;
    rider.vz = vz * 0.2;
    events.crashed = '边界';
    return;
  }

  const hit = env.collide(nx, nz, airH);
  if (hit) {
    rider.x = nx;
    rider.z = nz;
    rider.vx = vx * 0.15;
    rider.vz = vz * 0.15;
    events.crashed = hit.kind === 'rock' ? '岩石' : '树';
    return;
  }

  rider.x = nx;
  rider.z = nz;
  rider.vx = vx;
  rider.vz = vz;
}
