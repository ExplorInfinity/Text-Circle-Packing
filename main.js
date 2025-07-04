const TWO_PI = 2 * Math.PI;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

class Circle {
    static startRadius = 1;
    static growSpeed = 25;

    constructor(x, y, startRadius) {
        this.x = x;
        this.y = y;
        this.curr_x = x;
        this.curr_y = y;
        this.ease = 20;
        this.radius = startRadius || Circle.startRadius;
        this.growing = true;
    }

    update(deltatime) {
        this.grow(deltatime);
        this.curr_x += (this.x - this.curr_x) / this.ease;
        this.curr_y += (this.y - this.curr_y) / this.ease;
    }

    grow(deltatime) {
        if(this.growing) {
            this.radius += deltatime * Circle.growSpeed;
        }
    }

    isOutsideWindow(width, height, padding) {
        return (
            this.x - this.radius - padding < 0 || this.x + this.radius + padding > width || 
            this.y - this.radius - padding < 0 || this.y + this.radius + padding > height
        );
    }

    stopGrowing() {
        this.growing = false;
    }

    draw(context) {
        context.beginPath();
        context.arc(this.curr_x, this.curr_y, this.radius, 0, TWO_PI);
        context.stroke();
    }
}

class CirclePacking {
    constructor(canvas, text='Hello, World!') {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        // Text Props
        this.text = text;
        this.font = 'Arial';
        this.fontSize = 250;
        this.textPadding = 100;
        this.topTextPadding = 30;

        // Text Input
        const textInput = document.getElementById('textInput');
        textInput.value = text;
        textInput.addEventListener('input', () => {
            this.text = textInput.value;
            this.reset();
        });

        // Circle Props
        this.circles = [];
        this.maxCircles = 5000;
        this.finished = false;
        this.maxAttempts = 100;
        this.padding = 2;
        this.windowPadding = 4;

        this.initializeCanvas();
        window.addEventListener('resize', () => this.initializeCanvas());

        // Mouse Props
        this.blobRadius = 200;
        this.forceFactor = 0.025;

        // Mouse Events
        this.mouse = { x: 0, y: 0 };
        this.clicked = false;
        window.addEventListener('mousedown', ({ x, y }) => {
            this.clicked = true;
            this.mouse.x = x;
            this.mouse.y = y;
        });
        window.addEventListener('mousemove', ({ x, y }) => {
            if(this.clicked) {
                this.mouse.x = x;
                this.mouse.y = y;
            }
        });
        window.addEventListener('mouseup', () => {
            this.clicked = false;
            this.mouse.x = this.mouse.y = 0;
        });
    }

    createCircle() {
        const index = Math.floor(Math.random() * this.textPixels.length / 2) * 2;
        const x = this.textPixels[index];
        const y = this.textPixels[index + 1];

        if(this.isCircleOverlapping(x, y)) {
            return null;
        }
        
        return new Circle(x, y);
    }

    addNewCircles() {
        if(!this.finished && this.circles.length < this.maxCircles) {
            let i = 0, attempts = 0;
            while(i++ < 100 && attempts < this.maxAttempts) {
                const newCircle = this.createCircle();
                attempts++;
                if(newCircle) {
                    attempts = 0;
                    this.circles.push(newCircle);
                }
            }

            if(this.circles.length >= this.maxCircles || attempts >= this.maxAttempts) {
                this.finished = true;
            }
        }
    }

    initializeCanvas() {
        this.canvas.width = this.width = window.innerWidth;
        this.canvas.height = this.height = window.innerHeight;
        this.setCanvasProps();
        this.reset();
        this.draw();
    }

    reset() {
        this.context.clearRect(0, 0, canvas.width, canvas.height);
        this.circles = [];
        this.finished = false;
        this.createTextPixels();
    }

    setCanvasProps() {
        const { context } = this;
        const gradient = context.createRadialGradient(
            this.width * 0.5, this.height * 0.5, 0, 
            this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.5
        );
        gradient.addColorStop(0, "#66a6ff");
        gradient.addColorStop(1, 'cyan');

        context.fillStyle = 'white';
        context.strokeStyle = gradient;
        context.lineWidth = 1.25;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${this.fontSize}px ${this.font}`;
    }

    isCircleOverlapping(x, y, radius=Circle.startRadius) {
        for(const circle of this.circles) {
            const dx = Math.abs(circle.x - x) - this.padding, dy = Math.abs(circle.y - y) - this.padding;
            const d = dx * dx + dy * dy;
            if(d <= (radius + circle.radius) * (radius + circle.radius)) {
                return true;
            }
        }
        return false;
    }

    handleCircleCollisions() {
        for(let i = 0; i < this.circles.length; i++) {
            for(let j = i + 1; j < this.circles.length; j++) {
                const { x: x1, y: y1, radius: r1 } = this.circles[i];
                const { x: x2, y: y2, radius: r2 } = this.circles[j];
                const dx = Math.abs(x1 - x2) - this.padding, dy = Math.abs(y1 - y2) - this.padding;
                const d  = dx * dx + dy * dy;
                if(d < (r1 + r2) * (r1 + r2)) {
                    this.circles[i].growing = this.circles[j].growing = false;
                }
            }
        }
    }

    update(deltatime) {
        // Circles Update Loop
        for(const circle of this.circles) {
            circle.update(deltatime);
            if(circle.isOutsideWindow(this.width, this.height, this.windowPadding)) {
                circle.stopGrowing();
            }
        }

        this.addNewCircles();
        this.handleCircleCollisions();
        this.updateMouseEvents();
    }

    updateMouseEvents() {
        if(this.clicked) {
            const { x, y } = this.mouse;
            const { blobRadius, forceFactor } = this;
            for(const circle of this.circles) {
                const dx = circle.curr_x - x, dy = circle.curr_y - y;
                const d = dx * dx + dy * dy, r = blobRadius + circle.radius;
                if(d <= r * r) {
                    const dist = Math.sqrt(d);
                    const force = (r - dist) / r;
                    const push = force * blobRadius * forceFactor;

                    const nx = dx / dist;
                    const ny = dy / dist;

                    circle.curr_x += push * nx;
                    circle.curr_y += push * ny;
                }
            }
        }
    }

    drawWrappedText() {
        const words = this.text.split(' '), lines = [''];
        let line = '', lineIndex = 0;
        for(const word of words) {
            line += word + ' ';
            if(this.context.measureText(line).width > this.width - this.textPadding) {
                line = word + ' ';
                if(lines[lineIndex] != '') lineIndex++;
            }
            lines[lineIndex] = line.trim();
        }

        let totalHeight = this.fontSize * (lines.length - 1);
        let startY = (this.height - totalHeight) * 0.5 + this.topTextPadding;
        for(const line of lines) {
            this.context.fillText(line, this.width * 0.5, startY);
            startY += this.fontSize;
        }
    }

    createTextPixels() {
        this.drawWrappedText();
        this.textPixels = [];
        const textPixels = this.context.getImageData(0, 0, this.width, this.height).data;
        for(let j = 0; j < this.height; j++) {
            for(let i = 0; i < this.width; i++) {
                if(textPixels[(i + j * this.width) * 4] === 255) {
                    this.textPixels.push(i, j);
                }
            }
        }
        this.maxCircles = Math.floor(textPixels.length * 0.01);
    }

    draw() {
        const { context } = this;
        // this.context.fillText(this.text, this.width * 0.5, this.height * 0.5);
        for(const circle of this.circles) {
            circle.draw(context);
        }
    }
}

const circlePackingText = new CirclePacking(canvas);

let lastTime = 0;
function animate(timestamp=0) {
    const deltatime = (timestamp - lastTime) * 0.001;
    lastTime = timestamp;

    if(document.hasFocus() || true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        circlePackingText.update(deltatime);
        circlePackingText.draw();
    }
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);