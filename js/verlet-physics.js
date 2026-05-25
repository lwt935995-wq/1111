/**
 * Verlet Physics Engine
 * A 2D Verlet integration spring-mass system where each character acts as a physical node
 * connected by constraints (springs) to create a flexible, bouncy ribbon effect.
 */

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    distance(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.multiply(1 / mag);
    }

    clone() {
        return new Vector2(this.x, this.y);
    }
}

class Particle {
    constructor(x, y, char = '', pinned = false) {
        this.position = new Vector2(x, y);
        this.prevPosition = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.char = char;
        this.pinned = pinned;
        this.mass = 1;
        this.radius = 8; // For rendering
    }

    applyForce(force) {
        this.acceleration = this.acceleration.add(force.multiply(1 / this.mass));
    }

    update(deltaTime = 1/60) {
        if (this.pinned) {
            this.prevPosition = this.position.clone();
            return;
        }

        // Verlet integration
        const vel = this.position.subtract(this.prevPosition);
        this.prevPosition = this.position.clone();
        this.position = this.position.add(vel).add(this.acceleration.multiply(deltaTime * deltaTime));
        this.acceleration = new Vector2(0, 0);
    }

    pin(x, y) {
        this.pinned = true;
        this.position = new Vector2(x, y);
        this.prevPosition = new Vector2(x, y);
    }

    unpin() {
        this.pinned = false;
    }
}

class Constraint {
    constructor(p1, p2, restLength = null) {
        this.p1 = p1;
        this.p2 = p2;
        this.restLength = restLength || p1.position.distance(p2.position);
        this.stiffness = 0.95; // Spring stiffness (0-1, where 1 is very stiff)
    }

    update() {
        const delta = this.p2.position.subtract(this.p1.position);
        const currentLength = delta.magnitude();
        const diff = (currentLength - this.restLength) / currentLength;

        if (!this.p1.pinned) {
            this.p1.position = this.p1.position.add(delta.multiply(diff * this.stiffness * 0.5));
        }
        if (!this.p2.pinned) {
            this.p2.position = this.p2.position.subtract(delta.multiply(diff * this.stiffness * 0.5));
        }
    }
}

class VerletRibbon {
    constructor(config = {}) {
        this.particles = [];
        this.constraints = [];
        this.gravity = new Vector2(0, config.gravity || 0.5);
        this.damping = config.damping || 0.99;
        this.constraintIterations = config.constraintIterations || 3;
        this.charSpacing = config.charSpacing || 15;
        this.maxParticles = config.maxParticles || 500;
        
        // Physics parameters
        this.springStiffness = config.springStiffness || 0.95;
        this.boundaryDamping = config.boundaryDamping || 0.8;
    }

    addCharacter(char, x, y, pinned = false) {
        if (this.particles.length >= this.maxParticles) {
            this.removeOldestCharacter();
        }

        const particle = new Particle(x, y, char, pinned);

        // If there are existing particles, connect with a spring constraint
        if (this.particles.length > 0) {
            const lastParticle = this.particles[this.particles.length - 1];
            const constraint = new Constraint(lastParticle, particle, this.charSpacing);
            constraint.stiffness = this.springStiffness;
            this.constraints.push(constraint);
        }

        this.particles.push(particle);
    }

    removeOldestCharacter() {
        if (this.particles.length === 0) return;

        // Remove oldest particle
        const removedParticle = this.particles.shift();

        // Remove constraints involving the removed particle
        this.constraints = this.constraints.filter(constraint => {
            return constraint.p1 !== removedParticle && constraint.p2 !== removedParticle;
        });
    }

    pinParticleToMouse(index, x, y) {
        if (index >= 0 && index < this.particles.length) {
            this.particles[index].pin(x, y);
        }
    }

    unpinParticle(index) {
        if (index >= 0 && index < this.particles.length) {
            this.particles[index].unpin();
        }
    }

    getParticleAtPosition(x, y, radius = 150) {
        let closest = null;
        let closestDistance = radius;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const distance = particle.position.distance(new Vector2(x, y));
            if (distance < closestDistance) {
                closest = i;
                closestDistance = distance;
            }
        }

        return closest;
    }

    update(deltaTime = 1/60) {
        // Apply gravity
        for (let particle of this.particles) {
            if (!particle.pinned) {
                particle.applyForce(this.gravity);
                particle.velocity = particle.velocity.multiply(this.damping);
            }
        }

        // Update particle positions
        for (let particle of this.particles) {
            particle.update(deltaTime);
        }

        // Constraint solving (multiple iterations for stability)
        for (let iter = 0; iter < this.constraintIterations; iter++) {
            for (let constraint of this.constraints) {
                constraint.update();
            }
        }

        // Boundary constraints (keep particles on screen)
        this.applyBoundaryConstraints();
    }

    applyBoundaryConstraints() {
        const padding = 50;
        for (let particle of this.particles) {
            if (particle.position.x < padding) {
                particle.position.x = padding;
                particle.prevPosition.x = padding;
            }
            if (particle.position.x > window.innerWidth - padding) {
                particle.position.x = window.innerWidth - padding;
                particle.prevPosition.x = window.innerWidth - padding;
            }
            if (particle.position.y < padding) {
                particle.position.y = padding;
                particle.prevPosition.y = padding;
            }
            if (particle.position.y > window.innerHeight - padding) {
                particle.position.y = window.innerHeight - padding;
                particle.prevPosition.y = window.innerHeight - padding;
            }
        }
    }

    draw(ctx) {
        if (this.particles.length === 0) return;

        // Draw connecting line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.particles[0].position.x, this.particles[0].position.y);
        for (let i = 1; i < this.particles.length; i++) {
            ctx.lineTo(this.particles[i].position.x, this.particles[i].position.y);
        }
        ctx.stroke();

        // Draw characters
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px monospace';

        for (let particle of this.particles) {
            if (particle.char) {
                ctx.save();
                ctx.translate(particle.position.x, particle.position.y);
                ctx.fillText(particle.char, 0, 0);
                ctx.restore();
            }
        }
    }
}
